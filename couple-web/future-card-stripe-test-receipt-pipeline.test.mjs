import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
 mapFutureCardStripeTestIntent,futureCardStripeTestReceiptArgs,
 handleFutureCardStripeTestReceipt
} from './future-card-stripe-test-receipt-pipeline.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;

const secret='whsec_synthetic_pipeline_key_not_real_123456789';
const now=Date.parse('2026-10-31T19:00:00Z');
const time=Math.floor(now/1000);
const requestId='11111111-1111-1111-1111-111111111111';
const coupleId='22222222-2222-2222-2222-222222222222';
const userId='33333333-3333-3333-3333-333333333333';
const receiptId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const checkoutSessionId='cs_test_pipeline_abcdef123456789';
const providerEventId='evt_pipeline123456789';
const serverIntent=()=>({
 id:requestId,couple_id:coupleId,member_id:userId,
 level:'medium',checkout_session_id:checkoutSessionId,
 amount_cad_cents:400,currency:'cad',status:'awaiting_payment'
});
const event=(changes={})=>({
 id:providerEventId,type:'checkout.session.completed',livemode:false,
 data:{object:{
  object:'checkout.session',id:checkoutSessionId,livemode:false,
  mode:'payment',status:'complete',payment_status:'paid',
  currency:'cad',amount_total:400,client_reference_id:requestId,
  metadata:{memberId:'fake',coupleId:'fake',level:'intense'}
 }},...changes
});
function signed(e=event(),key=secret){
 const rawBody=JSON.stringify(e);
 const hmac=createHmac('sha256',key).update(time+'.'+rawBody).digest('hex');
 return {rawBody,signatureHeader:'t='+time+',v1='+hmac};
}
const call=(webhook=signed(),args={})=>handleFutureCardStripeTestReceipt({
 ...webhook,webhookSecret:secret,now,
 loadServerIntent:async()=>serverIntent(),
 recordVerifiedReceipt:async()=>receiptId,...args
});
test('trusted intent maps snake_case fields, never arbitrary webhook metadata',()=>{
 const mapped=mapFutureCardStripeTestIntent(serverIntent());
 assert.deepEqual(mapped,{
  id:requestId,provider:'stripe',kind:'future-card-regeneration',
  status:'awaiting_payment',checkoutSessionId,
  currency:'cad',amountCadCents:400,
  coupleId,memberId:userId,level:'medium'
 });
 assert.ok(Object.isFrozen(mapped));
 assert.equal(mapFutureCardStripeTestIntent(null),null);
});
test('signed checkout is recorded with SQL-matching parameters',async()=>{
 let loaded=null,recorded=null;
 const result=await call(signed(),{
  loadServerIntent:async id=>{loaded=id;return serverIntent();},
  recordVerifiedReceipt:async args=>{recorded=args;return receiptId;}
 });
 assert.equal(result.accepted,true);
 assert.equal(result.receiptId,receiptId);
 assert.equal(loaded,requestId);
 assert.deepEqual(recorded,{
  p_intent_id:requestId,p_checkout_session_id:checkoutSessionId,
  p_provider_event_id:providerEventId,p_couple_id:coupleId,
  p_member_id:userId,p_level:'medium',p_amount_cad_cents:400,
  p_currency:'cad',p_verified_at:'2026-10-31T19:00:00.000Z'
 });
 assert.ok(Object.isFrozen(recorded));
});
test('tampered and unpaid webhook never reaches receipt recorder or DB lookup',async()=>{
 let loaded=0,recorded=0;
 const callbacks={
  loadServerIntent:async()=>{loaded++;return serverIntent();},
  recordVerifiedReceipt:async()=>{recorded++;return receiptId;}
 };
 for(const bad of [
  {...signed(),rawBody:signed().rawBody+' '},
  signed(event({data:{object:{...event().data.object,amount_total:399}}})),
  signed(event({livemode:true})),
  {...signed(),signatureHeader:'t='+time+',v1='+'0'.repeat(64)}
 ]){
  const r=await call(bad,callbacks);
  assert.equal(r.accepted,false);
 }
 assert.equal(loaded,0);
 assert.equal(recorded,0);
});
test('untrusted, cancelled, inconsistent or missing server intent cannot record',async()=>{
 let written=0;
 for(const intent of [
  null,{...serverIntent(),status:'cancelled'},
  {...serverIntent(),checkout_session_id:'cs_test_other_12345678'},
  {...serverIntent(),amount_cad_cents:399},
  {...serverIntent(),member_id:'not-uuid'}
 ]){
  const result=await call(signed(),{
   loadServerIntent:async()=>intent,
   recordVerifiedReceipt:async()=>{written++;return receiptId;}
  });
  assert.equal(result.accepted,false);
 }
 assert.equal(written,0);
});
test('SQL storage failure is closed and caller cannot claim receipt success',async()=>{
 const result=await call(signed(),{recordVerifiedReceipt:async()=>{
  throw new Error('PostgreSQL unavailable');
 }});
 assert.deepEqual(result,{accepted:false,reason:'receipt',receiptId:null});
 assert.equal((await call(signed(),{recordVerifiedReceipt:async()=>null})).accepted,false);
 assert.equal((await call(signed(),{recordVerifiedReceipt:null})).reason,'configuration');
});
test('exactly the same verified signed event can replay to DB idempotently',async()=>{
 const seen=new Map();
 let attempts=0;
 const writer=async args=>{
  attempts++;
  const key=args.p_intent_id+':'+args.p_provider_event_id;
  if(!seen.has(key))seen.set(key,receiptId);
  return seen.get(key);
 };
 const a=await call(signed(),{recordVerifiedReceipt:writer});
 const b=await call(signed(),{recordVerifiedReceipt:writer});
 assert.equal(a.accepted,true);
 assert.equal(b.accepted,true);
 assert.equal(a.receiptId,b.receiptId);
 assert.equal(attempts,2);
 assert.equal(seen.size,1);
});
test('proof argument validation blocks non-test sessions, invalid amounts and ids',()=>{
 const valid={
  provider:'stripe',intentId:requestId,providerRef:checkoutSessionId,
  providerEventId,coupleId,memberId:userId,
  level:'medium',amountCadCents:400,currency:'cad',
  verifiedAt:'2026-10-31T19:00:00.000Z'
 };
 assert.ok(futureCardStripeTestReceiptArgs(valid));
 for(const bad of [
  {providerRef:'cs_live_must_not_work_123456'},
  {providerEventId:'bad'}, {memberId:'evil'},
  {level:'hard'}, {amountCadCents:200}, {currency:'usd'},
  {verifiedAt:'not-a-timestamp'}
 ])assert.equal(futureCardStripeTestReceiptArgs({...valid,...bad}),null);
});
test('inactive module never creates a public route, checkout or client DB connection',()=>{
 const code=readFileSync(new URL('./future-card-stripe-test-receipt-pipeline.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(code,/Deno\.serve|app\.post|paymentIntents\.create|sessions\.create|createClient|fetch\s*\(/);
 assert.match(code,/recordVerifiedReceipt\(args\)/);
 assert.match(code,/verifyFutureCardStripeTestWebhook/);
 const sql=readFileSync(new URL('./sql-proposals/future-card-stripe-test-receipt-ledger.sql',import.meta.url),'utf8');
 for(const field of [
  'p_intent_id','p_checkout_session_id','p_provider_event_id',
  'p_couple_id','p_member_id','p_level','p_amount_cad_cents',
  'p_currency','p_verified_at'
 ])assert.ok(sql.includes(field));
});
