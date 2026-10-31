import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./sql-proposals/future-card-stripe-test-receipt-ledger.sql',import.meta.url),'utf8');
const smoke=readFileSync(new URL('./sql-proposals/future-card-stripe-test-receipt-ledger.test.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/loveroll-future-card-archive-postgres.yml',import.meta.url),'utf8');
test('a private server-issued Stripe test intent cannot be created by clients',()=>{
 assert.match(sql,/FUTURE\/TEST ONLY/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS couple_private\.love_future_stripe_test_intents/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FORCE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE couple_private\.love_future_stripe_test_intents/);
 assert.match(sql,/checkout_session_id text NOT NULL UNIQUE/);
 assert.match(sql,/CHECK \(amount_cad_cents=400\)/);
 assert.doesNotMatch(sql,/\bGRANT\s+(INSERT|UPDATE|DELETE|EXECUTE|ALL)\b/i);
});
test('receipt recorder is private, locked, intent-matched and idempotent',()=>{
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/WHERE id=p_intent_id FOR UPDATE/);
 assert.match(sql,/status='receipt_verified'/);
 assert.match(sql,/p_verified_at < v_now-INTERVAL '5 minutes'/);
 assert.match(sql,/v_intent\.checkout_session_id IS DISTINCT FROM p_checkout_session_id/);
 assert.match(sql,/v_intent\.couple_id IS DISTINCT FROM p_couple_id/);
 assert.match(sql,/v_intent\.member_id IS DISTINCT FROM p_member_id/);
 assert.match(sql,/v_intent\.level IS DISTINCT FROM p_level/);
 assert.match(sql,/REVOKE ALL ON FUNCTION couple_private\.record_future_stripe_test_receipt/);
 assert.match(sql,/love_future_receipt_intent_once/);
 assert.match(sql,/love_future_receipt_provider_event_once/);
 assert.doesNotMatch(sql,/draw_for_partner|love_respond_and_redraw|CREATE EXTENSION/i);
});
test('PostgreSQL fixture checks replay, cancelled, outsider and mismatch cases',()=>{
 for(const phrase of ['Same signed event should be idempotent',
 'Exactly one receipt per server intent','Mismatched member proof accepted',
 'Mismatched level proof accepted','Wrong amount proof accepted',
 'Conflicting event replay was accepted','Outsider receipt recorded',
 'Cancelled checkout became payable'])
  assert.ok(smoke.includes(phrase),phrase);
 assert.match(workflow,/future-card-stripe-test-receipt-ledger\.sql/);
 assert.match(workflow,/future-card-stripe-test-receipt-ledger\.test\.sql/);
});
