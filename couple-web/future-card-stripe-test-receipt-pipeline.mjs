// LoveRoll future-card TEST-mode webhook-to-receipt adapter (inactive).
// Intended for a future trusted backend only. Not an HTTP route, database
// client, payment request, entitlement grant, or production integration.
import {verifyFutureCardStripeTestWebhook} from './future-card-stripe-test-webhook.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failed=reason=>Object.freeze({accepted:false,reason,receiptId:null});

/** Convert a row from the private, dedicated Stripe TEST-mode intent ledger
 * into the exact trusted scope expected by the signature verifier.
 * Stripe metadata and payload fields are never used for this mapping.
 */
export function mapFutureCardStripeTestIntent(row){
 if(!row||typeof row!=='object'||Array.isArray(row))return null;
 return Object.freeze({
  id:row.id,provider:'stripe',kind:'future-card-regeneration',
  status:row.status,checkoutSessionId:row.checkout_session_id,
  currency:row.currency,amountCadCents:row.amount_cad_cents,
  coupleId:row.couple_id,memberId:row.member_id,level:row.level
 });
}

/** Arguments for a trusted DB execution of the private SQL function.
 * No client-visible RPC, bearer auth, Stripe SDK, or service key is created.
 */
export function futureCardStripeTestReceiptArgs(proof){
 if(!proof||typeof proof!=='object'||proof.provider!=='stripe'||
   !uuid.test(proof.intentId||'')||!uuid.test(proof.coupleId||'')||
   !uuid.test(proof.memberId||'')||!['soft','medium','intense'].includes(proof.level)||
   proof.amountCadCents!==400||proof.currency!=='cad'||
   typeof proof.providerRef!=='string'||!/^cs_test_[A-Za-z0-9_]{8,240}$/.test(proof.providerRef)||
   typeof proof.providerEventId!=='string'||!/^evt_[A-Za-z0-9]{8,240}$/.test(proof.providerEventId)||
   typeof proof.verifiedAt!=='string'||!Number.isFinite(Date.parse(proof.verifiedAt)))
  return null;
 return Object.freeze({
  p_intent_id:proof.intentId,
  p_checkout_session_id:proof.providerRef,
  p_provider_event_id:proof.providerEventId,
  p_couple_id:proof.coupleId,
  p_member_id:proof.memberId,
  p_level:proof.level,
  p_amount_cad_cents:400,
  p_currency:'cad',
  p_verified_at:proof.verifiedAt
 });
}

/** A *server-only* handoff: verify webhook, map server-owned intent, then
 * persist with couple_private.record_future_stripe_test_receipt via a
 * trusted server callback. The SQL function atomically enforces idempotency.
 * Every failure is closed; never respond as if money was collected here.
 */
export async function handleFutureCardStripeTestReceipt({
 rawBody,signatureHeader,webhookSecret,now=Date.now(),
 loadServerIntent,recordVerifiedReceipt
}={}){
 if(typeof loadServerIntent!=='function'||typeof recordVerifiedReceipt!=='function')
  return failed('configuration');
 const verified=await verifyFutureCardStripeTestWebhook({
  rawBody,signatureHeader,webhookSecret,now,
  lookupIntent:async id=>mapFutureCardStripeTestIntent(await loadServerIntent(id))
 });
 if(!verified.valid)return failed(verified.reason);
 const args=futureCardStripeTestReceiptArgs(verified.proof);
 if(!args)return failed('proof');
 try{
  // Record in an independently privileged backend, never from the client.
  const receiptId=await recordVerifiedReceipt(args);
  if(typeof receiptId!=='string'||!uuid.test(receiptId))return failed('receipt');
  return Object.freeze({accepted:true,reason:'receipt_recorded',receiptId});
 }catch{
  // A later retry of the same signed event must be idempotent in PostgreSQL.
  return failed('receipt');
 }
}
