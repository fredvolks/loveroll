import test from 'node:test';
import assert from 'node:assert/strict';
import {createEclatV2AdminPair} from './eclat-v2-admin-pair.mjs';
const ids={A:'11111111-1111-4111-8111-111111111111',B:'22222222-2222-4222-8222-222222222222'};
const sid='33333333-3333-4333-8333-333333333333';
function setup({sameUser=false,wrongCouple=false,unauthorized=false}={}){
 const made=[],signedOut=[];
 const clients=role=>{
  const id=sameUser?ids.A:ids[role];
  const client={role,auth:{
   async signInWithPassword({email,password}){
    assert.equal(password,'temporary test-only');
    assert.match(email,/@example.test$/);
    return {error:null};
   },
   async getUser(){return {data:{user:{id}},error:null}},
   async signOut(){signedOut.push(role)}
  }};
  made.push(client);return client;
 };
 let live=false;
 const status=role=>{
  if(!live)return {access:!unauthorized,active:false};
  return {access:!unauthorized,active:true,content_version:2,session_id:wrongCouple&&role==='B'?'bad':sid,
   role_a:ids.A,role_b:ids.B,device_mode:'two',coffret_id:9};
 };
 const pair=createEclatV2AdminPair({adminUserId:'admin-only',clientFactory:clients,
  gatewayFactory:client=>({status:async()=>status(client.role),
   start:async({coffretId,minutes,deviceMode})=>{
    assert.equal(coffretId,9);assert.equal(minutes,60);assert.equal(deviceMode,'two');
    live=true;return status('A');
   }})});
 return {pair,made,signedOut,activate:()=>{live=true}};
}
test('two isolated signed-in users drive one real V2 start without impersonation',async()=>{
 const t=setup();
 await t.pair.connect('A','a@example.test','temporary test-only');
 await t.pair.connect('B','b@example.test','temporary test-only');
 assert.equal(t.made.length,2);
 assert.notEqual(t.made[0],t.made[1]);
 const opened=await t.pair.start({coffretId:9,minutes:60});
 assert.equal(opened.sessionId,sid);
 assert.equal((await t.pair.attach()).sessionId,sid);
 await t.pair.destroy();
 assert.deepEqual(t.signedOut.sort(),['A','B']);
});
test('same identity cannot impersonate both partners',async()=>{
 const t=setup({sameUser:true});
 await t.pair.connect('A','a@example.test','temporary test-only');
 await assert.rejects(()=>t.pair.connect('B','b@example.test','temporary test-only'),/distincts/);
 assert.equal(t.pair.summary('B').connected,false);
 assert.deepEqual(t.signedOut,['B']);
 await t.pair.destroy();
});
test('a wrong couple cannot be rendered as the second user',async()=>{
 const t=setup({wrongCouple:true});
 await t.pair.connect('A','a@example.test','temporary test-only');
 await t.pair.connect('B','b@example.test','temporary test-only');
 await assert.rejects(()=>t.pair.start({coffretId:9,minutes:60}),/même séance réelle/);
 await t.pair.destroy();
});
test('platform owner login and missing entitlement are rejected, with signout',async()=>{
 const t=setup({unauthorized:true});
 await assert.rejects(()=>t.pair.connect('A','a@example.test','temporary test-only'),/Accès Éclat refusé/);
 assert.deepEqual(t.signedOut,['A']);
 const another=createEclatV2AdminPair({adminUserId:ids.A,clientFactory:()=>({
  auth:{signInWithPassword:async()=>({error:null}),
   getUser:async()=>({data:{user:{id:ids.A}}}),signOut:async()=>{}}
 }),gatewayFactory:()=>({status:async()=>({access:true,active:false})})});
 await assert.rejects(()=>another.connect('A','owner@example.test','pwd'),/Super Admin/);
});
test('new game needs both real identities and rejects invalid duration',async()=>{
 const t=setup();
 await t.pair.connect('A','a@example.test','temporary test-only');
 await assert.rejects(()=>t.pair.start({coffretId:9,minutes:60}),/deux/);
 await t.pair.connect('B','b@example.test','temporary test-only');
 await assert.rejects(()=>t.pair.start({coffretId:9,minutes:12}),RangeError);
 await t.pair.destroy();
});
