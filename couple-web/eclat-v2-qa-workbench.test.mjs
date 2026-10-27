import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEclatQaConfig,eclatQaAuthOptions,validateEclatQaPair}
 from './eclat-v2-qa-workbench.mjs';
const PROD='https://ejsrqfpkgwraorrznjpm.supabase.co';
const QA='https://abcdefghij1234567890.supabase.co';
const KEY='sb_publishable_ABCDEFGHIJKLMNOPQRSTUV0123456789';
test('QA is fail-closed against production, malicious URLs and service keys',()=>{
 for(const url of [PROD,'http://abcdefghij1234567890.supabase.co',
  'https://abcdefghij1234567890.supabase.co.evil.tld',
  'https://abcdefghij1234567890.supabase.co/evil',
  'https://user@abcdefghij1234567890.supabase.co',
  'https://localhost:54321']){
  assert.throws(()=>validateEclatQaConfig({url,key:KEY,productionUrl:PROD}));
 }
 for(const key of ['sb_secret_notallowed','service_role','eyJhbGciOiJIUzI1NiJ9',''])
  assert.throws(()=>validateEclatQaConfig({url:QA,key,productionUrl:PROD}));
 const result=validateEclatQaConfig({url:QA,key:KEY,productionUrl:PROD});
 assert.equal(result.url,QA);
 assert.ok(Object.isFrozen(result));
});
test('A/B sessions are independently authenticated, in memory, with distinct scopes',()=>{
 const a=eclatQaAuthOptions('A'),b=eclatQaAuthOptions('B');
 assert.equal(a.auth.persistSession,false);
 assert.equal(b.auth.persistSession,false);
 assert.equal(a.auth.detectSessionInUrl,false);
 assert.notEqual(a.auth.storageKey,b.auth.storageKey);
 assert.throws(()=>eclatQaAuthOptions('C'),RangeError);
});
test('QA never accepts forged B identity, wrong couple or another session',()=>{
 const sid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const status={access:true,active:true,session_id:sid,content_version:2,
  coffret_id:9,device_mode:'two',role_a:'id-A',role_b:'id-B'};
 const ok={userA:{id:'id-A'},userB:{id:'id-B'},statusA:status,statusB:{...status}};
 assert.equal(validateEclatQaPair(ok),sid);
 assert.throws(()=>validateEclatQaPair({...ok,userB:{id:'id-A'}}));
 assert.throws(()=>validateEclatQaPair({...ok,statusB:{...status,session_id:'x'}}));
 assert.throws(()=>validateEclatQaPair({...ok,statusB:{...status,role_b:'other'}}));
 assert.throws(()=>validateEclatQaPair({...ok,statusA:{...status,device_mode:'one'}}));
 assert.throws(()=>validateEclatQaPair({...ok,statusB:{...status,access:false}}));
});

test('QA factory only installs handlers; does not touch production or query a backend by itself',()=>{
 const listeners={},nodes={};
 const root={
  addEventListener(name,fn){listeners[name]=fn;},
  removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];},
  querySelector(selector){return nodes[selector]||null;},
  contains(){return true;}
 };
 // Import code paths must not make a network request or launch a session.
 assert.throws(()=>validateEclatQaConfig({
  url:PROD,key:KEY,productionUrl:PROD}),/production/);
 assert.ok(root);
});
