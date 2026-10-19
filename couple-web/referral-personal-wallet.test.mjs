import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {referralSettingsHtml,referralProgress} from './referral-program.mjs';

const sql=readFileSync(new URL('./migrations/20261019_referral_personal_wallet_fair_renewal.sql',import.meta.url),'utf8');

test('referral owner is the person, not the couple, and credited amount has no earning cap',()=>{
 assert.match(sql,/beneficiary_user_id uuid references auth\.users\(id\)/);
 assert.match(sql,/v_claim\.referrer_user_id/);
 assert.match(sql,/remaining_cad_cents/);
 assert.doesNotMatch(sql,/v_award:=least/);
});

test('renewal settlement is privileged, atomic and records each owner deduction',()=>{
 assert.match(sql,/love_referral_apply_renewal/);
 assert.match(sql,/service_role/);
 assert.match(sql,/for update/);
 assert.match(sql,/love_referral_credit_usage/);
 assert.match(sql,/v_take1:=least\(v_balance1,\(v_target\+1\)\/2\)/);
 assert.match(sql,/v_take2:=least\(v_balance2,v_target-v_take1\)/);
 assert.match(sql,/v_target>v_price/);
 assert.match(sql,/love_annual_discount_settlements/);
});

test('two personal 40 dollar balances cover one renewal, keeping the 30.01 dollar surplus',()=>{
 const mock={
  enabled:true,couple_ready:true,
  reward_cad_cents:500,reward_mode:'renewal_credit',
  code:'0123456789abcdef01234567',
  annual_renewal_cad_cents:4999,available_cad_cents:4999,
  personal_balance_cad_cents:4000,partner_balance_cad_cents:4000,
  combined_balance_cad_cents:8000,surplus_cad_cents:3001
 };
 const html=referralSettingsHtml(mock);
 assert.deepEqual(referralProgress(mock),{
  max:4999,credited:4999,remaining:0,percentage:100
 });
 for(const label of ['Mon solde personnel','Solde de mon partenaire',
  'Solde du couple','Crédit conservé après un renouvellement gratuit']){
  assert.ok(html.includes(label),label);
 }
 assert.match(html,/40,00/);
 assert.match(html,/80,00/);
 assert.match(html,/30,01/);
 assert.match(html,/même en cas de séparation/);
 const debitFirst=Math.ceil(4999/2);
 const debitSecond=4999-debitFirst;
 assert.deepEqual([debitFirst,debitSecond],[2500,2499]);
 assert.deepEqual([4000-debitFirst,4000-debitSecond],[1500,1501]);
});
