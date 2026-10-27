import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEclatQaConfig,eclatQaAuthOptions,validateEclatQaPair,validateEclatQaReadyToStart,createEclatV2QaWorkbench}
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

test('cannot start a second real QA game over an already active couple session',()=>{
 const fresh={access:true,active:false};
 assert.equal(validateEclatQaReadyToStart(fresh,fresh),true);
 assert.throws(()=>validateEclatQaReadyToStart({...fresh,active:true},fresh),/Reprendre/);
 assert.throws(()=>validateEclatQaReadyToStart(fresh,{...fresh,active:true}),/Reprendre/);
 assert.throws(()=>validateEclatQaReadyToStart(fresh,{access:false,active:false}),/droits Éclat/);
});

test('two actual API clients, never A impersonating B, mount both full play controllers',async()=>{
 const listeners={},elements={},created=[],rpcLog=[],views=[];
 const put=(id,value='')=>{
  elements['[data-eclat-qa="'+id+'"]']={value,hidden:false,textContent:'',dataset:{},reset(){}};
  return elements['[data-eclat-qa="'+id+'"]'];
 };
 for(const k of ['url','key','accounts','connection','game','feedback',
  'account-A','account-B','stage-A','stage-B','coffret','minutes'])put(k);
 put('url',QA);put('key',KEY);put('coffret','9');put('minutes','30');
 const forms={};
 for(const role of ['A','B']){
  const fields={email:{value:role.toLowerCase()+'@qa.example.test'},
   password:{value:'pass-'+role}};
  forms[role]={
   getAttribute(k){return k==='data-eclat-qa-form'?role:null;},
   querySelector(k){return fields[k==='[name="email"]'?'email':'password'];},
   reset(){fields.password.value='';fields.email.value='';}
  };
  elements['[data-eclat-qa="login-'+role+'"]']=forms[role];
 }
 const root={
  addEventListener(k,fn){listeners[k]=fn;},
  removeEventListener(k,fn){if(listeners[k]===fn)delete listeners[k];},
  querySelector(k){return elements[k]||null;},
  contains(){return true;}
 };
 const sid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const status=()=>({access:true,active:true,content_version:2,coffret_id:9,
  device_mode:'two',session_id:sid,role_a:'qa-A',role_b:'qa-B'});
 const workbench=createEclatV2QaWorkbench({
  root,productionUrl:PROD,refreshIntervalMs:1000000,
  createClient(url,key,options){
   assert.equal(url,QA);assert.equal(key,KEY);
   const role=options.auth.storageKey.endsWith('-A')?'A':'B';
   const client={role,auth:{
    async signInWithPassword({email,password}){
     assert.match(email,/@qa.example.test/);
     assert.equal(password,'pass-'+role);
     return {data:{user:{id:'qa-'+role}},error:null};
    },
    async getUser(){return {data:{user:{id:'qa-'+role}},error:null};},
    async signOut(){return {error:null};}
   },async rpc(){throw new Error('Unexpected direct RPC');}};
   created.push(client);return client;
  },
  createApi(client){
   return {
    async status(session){
     rpcLog.push([client.role,'status',session||null]);
     return session?status():{access:true,active:false};
    },
    async start(params){
     rpcLog.push([client.role,'start',params]);return status();
    }
   };
  },
  createPlayer({root:stage,viewerId,initialStatus}){
   views.push({stage,viewerId,initialStatus});
   return {destroy(){stage.textContent='';},async refresh(){}};
  }
 });
 assert.equal(created.length,0,'must not contact QA while mounting the admin pane');
 async function click(action){
  await listeners.click({target:{closest(){return {
   getAttribute(){return action;}
  };}}});
 }
 await click('connect');
 assert.equal(created.length,2);
 assert.notEqual(created[0],created[1]);
 assert.equal(elements['[data-eclat-qa="key"]'].value,'');
 for(const role of ['A','B'])await listeners.submit({
  target:forms[role],preventDefault(){}
 });
 assert.equal(elements['[data-eclat-qa="game"]'].hidden,false);
 await click('start');
 assert.deepEqual(rpcLog.map(x=>x[0]+':'+x[1]),[
  'A:status','B:status','A:start','B:status']);
 assert.equal(rpcLog[2][2].deviceMode,'two');
 assert.deepEqual(views.map(x=>x.viewerId),['qa-A','qa-B']);
 assert.notEqual(views[0].stage,views[1].stage);
 await click('refresh');
 workbench.destroy();
 assert.equal(Object.keys(listeners).length,0);
});
