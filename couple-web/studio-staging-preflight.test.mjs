import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStaging,checkStagingReadiness} from './studio-staging-preflight.mjs';
const ref='abcdefghijklmnopqrst';
const url='https://'+ref+'.supabase.co';
const key='sb_publishable_fake_for_unit_testing';
const mock=(mutate=()=>({status:401,code:'42501'}))=>{
 const calls=[];
 const fetcher=async(path,options)=>{
  const value=mutate(path,options);
  calls.push({path,method:options.method,headers:options.headers});
  return {status:value.status,text:async()=>JSON.stringify({code:value.code})};
 };
 return {fetcher,calls};
};
test('must categorically refuse live LoveRoll production, malformed or redirected project',()=>{
 for(const params of [
  ['ejsrqfpkgwraorrznjpm','https://ejsrqfpkgwraorrznjpm.supabase.co',key],
  [ref,'https://ejsrqfpkgwraorrznjpm.supabase.co',key],
  [ref,'https://evil.invalid',key],
  [ref,'http://'+ref+'.supabase.co',key],
  ['',url,key],
  [ref,url,''],
  [ref,url,'sb_secret_sensitive_not_a_public_key'],
  [ref,url,'service_role'],
  [ref,url,'eyJhbGciOiJIUzI1NiJ9.test.test'],
  [ref,url,'sb_publishable_short']
 ]) assert.throws(()=>validateStaging(...params),/STAGING REFUSED/);
 assert.equal(validateStaging(ref,url,key),url);
});
test('read-only staging probes must require both Edge functions and full schema',async()=>{
 const {fetcher,calls}=mock();
 const result=await checkStagingReadiness({ref,url,key,fetcher});
 assert.equal(result.ready,true);
 assert.equal(result.details.length,20);
 assert.ok(calls.every(x=>x.path.startsWith(url+'/')));
 assert.ok(calls.every(x=>x.headers.apikey===key));
 assert.ok(calls.every(x=>x.method==='GET'||x.method==='POST'));
 assert.equal(calls.filter(x=>x.method==='GET').length,18);
 assert.equal(calls.filter(x=>x.method==='POST').length,2);
 assert.ok(calls.filter(x=>x.method==='POST').every(x=>/\/functions\/v1\//.test(x.path)));
 assert.ok(calls.every(x=>!x.path.includes('/auth/v1/admin/')));
});
test('blank project with missing LoveRoll tables cannot be misreported as ready',async()=>{
 const {fetcher}=mock(path=>
  path.includes('/rest/v1/')
   ?{status:404,code:'PGRST205'}
   :{status:404,code:'FUNCTION_NOT_FOUND'}
 );
 const result=await checkStagingReadiness({ref,url,key,fetcher});
 assert.equal(result.ready,false);
 assert.equal(result.details.filter(x=>x.ready).length,0);
});
test('open Studio Edge endpoint fails security prerequisite, even if schema exists',async()=>{
 const {fetcher}=mock(path=>path.includes('/functions/v1/love-studio-sandbox')
  ?{status:200,code:''}:{status:401,code:'42501'});
 const result=await checkStagingReadiness({ref,url,key,fetcher});
 assert.equal(result.ready,false);
 assert.equal(result.details.find(x=>x.component==='edge love-studio-sandbox').ready,false);
});

test('provider outages and anonymous authentication errors cannot masquerade as a real LoveRoll schema',async()=>{
 for(const issue of [
  {status:500,code:'PGRST_INTERNAL_ERROR'},
  {status:429,code:'RATE_LIMITED'},
  {status:401,code:'invalid_api_key'},
  {status:403,code:'invalid_jwt'}
 ]){
  const {fetcher}=mock(path=>path.includes('/rest/v1/')
   ?issue:{status:401,code:'42501'});
  const result=await checkStagingReadiness({ref,url,key,fetcher});
  assert.equal(result.ready,false,'HTTP '+issue.status+' must fail closed');
  assert.equal(result.details.find(x=>x.component==='table couples').ready,false);
 }
});

test('read-only preflight blocks fake readiness without the authentic dice, cards and premium tables',async()=>{
 const missing=new Set([
  'couple_rolls','couple_personal_rolls','couple_sessions','couple_challenges',
  'love_account_premium_exemptions','love_eclat_entitlements','love_eclat_sessions',
  'love_eclat_scene_uses','love_eclat_private_choices','love_platform_settings'
 ]);
 const {fetcher}=mock(path=>[...missing].some(table=>path.includes('/rest/v1/'+table+'?'))
  ?{status:404,code:'PGRST205'}:{status:401,code:'42501'});
 const result=await checkStagingReadiness({ref,url,key,fetcher});
 assert.equal(result.ready,false);
 for(const table of missing){
  assert.equal(result.details.find(x=>x.component==='table '+table)?.ready,false,table);
 }
});
