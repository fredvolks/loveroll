import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=new URL('../supabase/functions/loveroll-qa-accounts/index.ts',import.meta.url);
const code=readFileSync(path,'utf8');
test('QA account management requires real user JWT, distinct allowlisted QA project and operator',()=>{
 assert.match(code,/withSupabase\(\{auth:'user'\}/);
 assert.match(code,/verifyQaOperator\(/);
 assert.match(code,/LOVEROLL_QA_APPROVED_PROJECT_REF/);
 assert.match(code,/LOVEROLL_QA_OPERATOR_USER_ID/);
 assert.match(code,/LOVEROLL_QA_STUDIO_ORIGIN/);
 assert.doesNotMatch(code,/auth:'none'|auth:'publishable'/);
});
test('account creation is server-side only and passwords are ephemeral',()=>{
 assert.match(code,/ctx\.supabaseAdmin/);
 assert.match(code,/crypto\.getRandomValues/);
 assert.match(code,/email_confirm:true/);
 assert.match(code,/app_metadata:\{loveroll_qa_managed:true/);
 assert.match(code,/Cache-Control':'no-store/);
 assert.doesNotMatch(code,/localStorage|sessionStorage|SUPABASE_SERVICE_ROLE_KEY/);
});
test('deletion checks BOTH metadata tags and deletes only ledger-associated pair',()=>{
 assert.match(code,/checkQaManagedUser\(data\.user,pair\.id,role\)/);
 assert.match(code,/validatePairLedger\(pair,operatorId\)/);
 assert.match(code,/\.eq\('operator_id',operatorId\)/);
 assert.match(code,/\.eq\('id',pair\.couple_id\)/);
 assert.match(code,/admin\.auth\.admin\.deleteUser/);
 assert.match(code,/state:'failed'/);
});
