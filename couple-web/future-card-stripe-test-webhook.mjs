// Future-card Stripe TEST-mode signed webhook proof. Inactive server module.
// No route, keys, payment initiation, database writes or checkout activation.
// Validated proof is NOT a paid entitlement until a trusted transaction persists
// it against the exact original server-issued checkout intent.
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const testSession=/^cs_test_[A-Za-z0-9_]{8,240}$/;
const eventId=/^evt_[A-Za-z0-9]{8,240}$/;
const levels=['soft','medium','intense'];
const fail=reason=>Object.freeze({valid:false,reason,proof:null});
const fromHex=hex=>Uint8Array.from(hex.match(/.{2}/g),v=>parseInt(v,16));
function signatureParts(value){
 if(typeof value!=='string'||value.length>1000)return null;
 const parts=value.split(',').map(x=>x.trim());
 const times=parts.filter(x=>x.startsWith('t='));
 const sigs=parts.filter(x=>x.startsWith('v1='));
 if(times.length!==1||sigs.length<1||sigs.length>5)return null;
 const time=times[0].slice(2);
 if(!/^\d{10,11}$/.test(time))return null;
 const signatures=sigs.map(x=>x.slice(3));
 if(!signatures.every(s=>/^[a-fA-F0-9]{64}$/.test(s)))return null;
 return {time:Number(time),signatures};
}
function validEvent(event){
 const session=event?.data?.object;
 return !!event&&typeof event==='object'&&!Array.isArray(event)&&
 event.type==='checkout.session.completed'&&event.livemode===false&&
 eventId.test(event.id||'')&&!!session&&
 typeof session==='object'&&!Array.isArray(session)&&
 session.object==='checkout.session'&&session.livemode===false&&
 testSession.test(session.id||'')&&session.mode==='payment'&&
 session.status==='complete'&&session.payment_status==='paid'&&
 session.currency==='cad'&&session.amount_total===400&&
 uuid.test(session.client_reference_id||'');
}
function validIntent(intent,session){
 return !!intent&&typeof intent==='object'&&!Array.isArray(intent)&&
 uuid.test(intent.id||'')&&intent.id===session.client_reference_id&&
 intent.provider==='stripe'&&intent.kind==='future-card-regeneration'&&
 intent.status==='awaiting_payment'&&
 intent.checkoutSessionId===session.id&&intent.currency==='cad'&&
 intent.amountCadCents===400&&uuid.test(intent.coupleId||'')&&
 uuid.test(intent.memberId||'')&&levels.includes(intent.level);
}
/**
 * A fully read-only TEST-mode verification boundary.
 * lookupIntent must query SERVER-OWNED records, never client metadata.
 * A verified result is only a candidate proof: it must subsequently be
 * stored idempotently by a trusted backend with the database unique key.
 */
export async function verifyFutureCardStripeTestWebhook({
 rawBody,signatureHeader,webhookSecret,now=Date.now(),lookupIntent
}={}){
 if(typeof webhookSecret!=='string'||webhookSecret.length<16||
  typeof lookupIntent!=='function'||!Number.isFinite(now))return fail('configuration');
 const signature=signatureParts(signatureHeader);
 if(!signature||Math.abs(now/1000-signature.time)>300)return fail('signature');
 const bytes=typeof rawBody==='string'?encoder.encode(rawBody):
  rawBody instanceof Uint8Array?rawBody:null;
 if(!bytes||bytes.byteLength<1||bytes.byteLength>262144)return fail('body');
 let event;
 try{
  const prefix=encoder.encode(String(signature.time)+'.');
  const signed=new Uint8Array(prefix.length+bytes.length);
  signed.set(prefix);signed.set(bytes,prefix.length);
  const key=await crypto.subtle.importKey('raw',encoder.encode(webhookSecret),
   {name:'HMAC',hash:'SHA-256'},false,['verify']);
  let validSignature=false;
  for(const item of signature.signatures){
   if(await crypto.subtle.verify('HMAC',key,fromHex(item),signed))
    validSignature=true;
  }
  if(!validSignature)return fail('signature');
  event=JSON.parse(decoder.decode(bytes));
 }catch{return fail('signature');}
 if(!validEvent(event))return fail('checkout');
 const session=event.data.object;
 let intent;
 try{intent=await lookupIntent(session.client_reference_id);}
 catch{return fail('intent');}
 if(!validIntent(intent,session))return fail('intent');
 // Stripe metadata is untrusted: scope ALWAYS comes from the server intent.
 return Object.freeze({valid:true,reason:'verified',proof:Object.freeze({
  provider:'stripe',providerRef:session.id,providerEventId:event.id,
  intentId:intent.id,coupleId:intent.coupleId,memberId:intent.memberId,
  level:intent.level,amountCadCents:400,currency:'cad',
  verifiedAt:new Date(signature.time*1000).toISOString()
 })});
}
