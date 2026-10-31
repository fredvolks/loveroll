import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {verifyFutureCardStripeTestWebhook} from './future-card-stripe-test-webhook.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const secret='whsec_synthetic_unit_test_key_not_a_real_secret';
const now=Date.parse('2026-10-31T19:00:00Z'),ts=Math.floor(now/1000);
const intentId='11111111-1111-1111-1111-111111111111';
const coupleId='22222222-2222-2222-2222-222222222222';
const memberId='33333333-3333-3333-3333-333333333333';
const sessionId='cs_test_example_session_12345678';
const eventId='evt_synthetic1234567';
const session=()=>({object:'checkout.session',id:sessionId,livemode:false,
 mode:'payment',status:'complete',payment_status:'paid',
 amount_total:400,currency:'cad',client_reference_id:intentId,
 metadata:{couple_id:'malicious',member_id:'malicious',level:'intense'}});
const event=(change={})=>({id:eventId,type:'checkout.session.completed',
 livemode:false,data:{object:session()},...change});
const intent=()=>({id:intentId,provider:'stripe',
 kind:'future-card-regeneration',status:'awaiting_payment',
 checkoutSessionId:sessionId,currency:'cad',amountCadCents:400,
 coupleId,memberId,level:'medium'});
function signed(data=event(),{time=ts,key=secret,raw}={}){
 const body=raw??JSON.stringify(data);
 const h=createHmac('sha256',key).update(String(time)+'.'+body).digest('hex');
 return {rawBody:body,signatureHeader:'t='+time+',v1='+h};
}
function verify(data=event(),{signature=signed(data),lookupIntent=async()=>intent(),opts={}}={}){
 return verifyFutureCardStripeTestWebhook({
  ...signature,webhookSecret:secret,now,lookupIntent,...opts
 });
}
test('signed test payment matches trusted intent and ignores Stripe metadata',async()=>{
 let lookup;
 const result=await verify(event(),{lookupIntent:async id=>{
  lookup=id;return intent();
 }});
 assert.equal(lookup,intentId);
 assert.equal(result.valid,true);
 assert.equal(result.proof.providerRef,sessionId);
 assert.equal(result.proof.providerEventId,eventId);
 assert.equal(result.proof.memberId,memberId);
 assert.equal(result.proof.coupleId,coupleId);
 assert.equal(result.proof.level,'medium');
 assert.equal(result.proof.amountCadCents,400);
 assert.equal(result.proof.verifiedAt,'2026-10-31T19:00:00.000Z');
 assert.ok(Object.isFrozen(result.proof));
});
test('invalid, stale and tampered signatures fail before DB lookup',async()=>{
 let looked=0;
 const lookupIntent=async()=>{looked++;return intent();};
 const good=signed();
 for(const signature of [
  {...good,rawBody:good.rawBody+' '},
  {...good,signatureHeader:''},
  {...good,signatureHeader:good.signatureHeader+',t=99'},
  {...good,signatureHeader:'t='+ts+',v1='+'0'.repeat(64)},
  signed(event(),{time:ts-301}),signed(event(),{time:ts+301}),
  {rawBody:'x'.repeat(262145),signatureHeader:good.signatureHeader}
 ]){
  assert.equal((await verify(event(),{signature,lookupIntent})).valid,false);
 }
 assert.equal(looked,0);
});
test('live-mode, incomplete, unpaid, wrong amount or currency fail closed',async()=>{
 let called=0;
 const lookupIntent=async()=>{called++;return intent();};
 for(const e of [
  event({type:'payment_intent.succeeded'}),
  event({livemode:true}),
  event({data:{object:{...session(),livemode:true}}}),
  event({data:{object:{...session(),amount_total:401}}}),
  event({data:{object:{...session(),currency:'usd'}}}),
  event({data:{object:{...session(),status:'open'}}}),
  event({data:{object:{...session(),payment_status:'unpaid'}}}),
  event({data:{object:{...session(),client_reference_id:null}}})
 ]){
  const result=await verify(e,{lookupIntent});
  assert.equal(result.valid,false);
  assert.equal(result.reason,'checkout');
 }
 assert.equal(called,0);
});
test('server-issued intent is required with exact session, owner, level and amount',async()=>{
 for(const change of [
  {status:'paid'}, {kind:'annual-membership'},
  {checkoutSessionId:'cs_test_wrong_session_12345'},
  {memberId:'not-a-uuid'}, {level:'other'},
  {currency:'usd'}, {amountCadCents:399}, {provider:'other'}
 ]){
  const result=await verify(event(),{lookupIntent:async()=>({...intent(),...change})});
  assert.equal(result.valid,false,JSON.stringify(change));
  assert.equal(result.reason,'intent');
 }
 assert.equal((await verify(event(),{lookupIntent:async()=>null})).valid,false);
 assert.equal((await verify(event(),{lookupIntent:async()=>{throw Error('offline')}})).valid,false);
});
test('client reference cannot point to a different request',async()=>{
 const changed=event({data:{object:{...session(),
  client_reference_id:'44444444-4444-4444-4444-444444444444'}}});
 assert.equal((await verify(changed)).valid,false);
});
test('signature rotation can include more than one signed v1 hash',async()=>{
 const good=signed();const v1=good.signatureHeader.split('v1=')[1];
 const sig={rawBody:new TextEncoder().encode(good.rawBody),
  signatureHeader:'t='+ts+',v1='+'f'.repeat(64)+',v1='+v1};
 assert.equal((await verify(event(),{signature:sig})).valid,true);
});
test('prototype has no route, payment, database writes or embedded secrets',()=>{
 const module=readFileSync(new URL('./future-card-stripe-test-webhook.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(module,/\bfetch\s*\(|\bclient\.rpc\s*\(|supabase\.from|localStorage|sessionStorage/);
 assert.doesNotMatch(module,/Deno\.serve|serve\(|app\.post\(|createCheckoutSession|paymentIntents\.create/);
 assert.match(module,/checkout\.session\.completed/);
 assert.match(module,/crypto\.subtle\.verify/);
});
