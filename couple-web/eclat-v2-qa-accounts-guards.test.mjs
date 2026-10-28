import test from 'node:test';
import assert from 'node:assert/strict';
import {LOVEROLL_PRODUCTION_REF,verifyQaOperator,checkQaManagedUser,validatePairLedger}
 from './eclat-v2-qa-accounts-guards.mjs';
const operator='11111111-1111-4111-8111-111111111111';
const qa='abcdefghijklmnopqrst',prod=LOVEROLL_PRODUCTION_REF;
const opts={runtimeUrl:'https://'+qa+'.supabase.co',allowedQaRef:qa,operatorId:operator,actorId:operator};
test('QA administrative guard accepts exact project and operator identity only',()=>{
 assert.equal(verifyQaOperator(opts),true);
 for(const change of [
  {runtimeUrl:'https://'+prod+'.supabase.co',allowedQaRef:prod},
  {runtimeUrl:'http://'+qa+'.supabase.co'},
  {runtimeUrl:'https://'+qa+'.supabase.co.evil.test'},
  {runtimeUrl:'https://'+qa+'.supabase.co:5050'},
  {allowedQaRef:prod},{allowedQaRef:''},
  {operatorId:'bad'},{actorId:'22222222-2222-4222-8222-222222222222'}
 ])assert.throws(()=>verifyQaOperator({...opts,...change}));
});
test('hard deletion requires matching QA batch, author and role app_metadata',()=>{
 const batch='33333333-3333-4333-8333-333333333333';
 const user={app_metadata:{loveroll_qa_managed:true,loveroll_qa_batch:batch,loveroll_qa_role:'A'}};
 assert.equal(checkQaManagedUser(user,batch,'A'),true);
 assert.throws(()=>checkQaManagedUser(user,batch,'B'));
 assert.throws(()=>checkQaManagedUser({...user,app_metadata:{...user.app_metadata,loveroll_qa_managed:false}},batch,'A'));
 assert.throws(()=>checkQaManagedUser({...user,app_metadata:{...user.app_metadata,loveroll_qa_batch:operator}},batch,'A'));
 assert.throws(()=>checkQaManagedUser({user_metadata:user.app_metadata},batch,'A'));
});
test('cannot clean any other pair, partial or mismatched identity',()=>{
 const row={id:'33333333-3333-4333-8333-333333333333',
  couple_id:'44444444-4444-4444-8444-444444444444',
  user_a:'55555555-5555-4555-8555-555555555555',
  user_b:'66666666-6666-4666-8666-666666666666',
  operator_id:operator,state:'active'};
 assert.equal(validatePairLedger(row,operator),row);
 assert.throws(()=>validatePairLedger(row,'99999999-9999-4999-8999-999999999999'));
 assert.throws(()=>validatePairLedger({...row,user_b:row.user_a},operator));
 assert.throws(()=>validatePairLedger({...row,state:'finished'},operator));
});
