import test from 'node:test';
import assert from 'node:assert/strict';
import {createEclatV2PlayController} from './eclat-v2-play-controller.mjs';
import {eclatV2Plan} from './eclat-v2-contract.mjs';

const aid='11111111-1111-4111-8111-111111111111';
const bid='22222222-2222-4222-8222-222222222222';
const sid='33333333-3333-4333-8333-333333333333';
function initial(){
 const plan=eclatV2Plan(1,30,0);
 return {access:true,active:true,content_version:2,session_id:sid,coffret_id:1,
  variant:0,minutes:30,role_a:aid,role_b:bid,device_mode:'two',
  chapter_number:1,chapter_index:1,chapter_total:plan.length,
  budget_minutes:plan[0].budgetMinutes,state:'active',skipped_scenes:[],
  revealed:false,can_reveal:false,my_ready:false};
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fakeRoot(){
 const handlers={};
 return {innerHTML:'',handlers,contains:()=>true,
  addEventListener:(type,fn)=>handlers[type]=fn,
  removeEventListener:(type)=>delete handlers[type]};
}

test('a stale status request never rolls back a newer official user action',async()=>{
 const root=fakeRoot(),status=initial(),oldRead=deferred(),calls=[];
 const current={...status,state:'paused'};
 const controller=createEclatV2PlayController({
  root,api:{
   status:async requested=>{assert.equal(requested,sid);return oldRead.promise;},
   act:async args=>{calls.push(args);return current;}
  },viewerId:aid,initialStatus:status
 });
 const pending=controller.refresh();
 const button={getAttribute:()=> 'act:pause'};
 await root.handlers.click({target:{closest:()=>button}});
 assert.deepEqual(calls,[{sessionId:sid,expectedStep:1,action:'pause'}]);
 assert.equal(controller.getStatus().state,'paused');
 oldRead.resolve(status);
 assert.equal(await pending,false,'older read discarded after successful RPC');
 assert.equal(controller.getStatus().state,'paused');
 controller.destroy();
});

test('out-of-order read responses cannot replace the freshest real server view',async()=>{
 const root=fakeRoot(),old=initial(),requests=[],newer={...old,state:'paused'};
 const controller=createEclatV2PlayController({
  root,api:{status:()=>new Promise(resolve=>requests.push(resolve))},
  viewerId:bid,initialStatus:old
 });
 const first=controller.refresh(),second=controller.refresh();
 assert.equal(requests.length,2);
 requests[1](newer);
 assert.equal(await second,true);
 requests[0](old);
 assert.equal(await first,false,'late earlier response must not supersede latest');
 assert.equal(controller.getStatus().state,'paused');
 controller.destroy();
});

test('destroyed player discards late server response and never repaints hidden secrets',async()=>{
 const root=fakeRoot(),old=initial(),read=deferred();
 const controller=createEclatV2PlayController({
  root,api:{status:()=>read.promise},viewerId:aid,initialStatus:old
 });
 const pending=controller.refresh();
 controller.destroy();
 read.resolve({...old,state:'paused'});
 assert.equal(await pending,false);
 assert.equal(root.innerHTML,'','private screen remains blank after disposal');
});


test('server-side Premium revocation blanks the real Éclat player instead of keeping private content',async()=>{
 const root=fakeRoot(),original=initial();
 const controller=createEclatV2PlayController({
  root,api:{status:async()=>({access:false,active:false})},
  viewerId:aid,initialStatus:original
 });
 assert.match(root.innerHTML,/ÉCLAT · COFFRET/,'original authorized scene is mounted');
 assert.equal(await controller.refresh(),true);
 assert.deepEqual(controller.getStatus(),{access:false,active:false});
 assert.match(root.innerHTML,/Accès Éclat requis/);
 assert.doesNotMatch(root.innerHTML,/ÉCLAT · COFFRET|Mission privée|data-eclat-v2-action="show-role/);
 controller.destroy();
});

test('a replaced real V2 session fails closed even if the old view was valid',async()=>{
 const root=fakeRoot(),original=initial();
 const controller=createEclatV2PlayController({
  root,api:{status:async()=>({...original,session_id:'44444444-4444-4444-8444-444444444444'})},
  viewerId:aid,initialStatus:original
 });
 await assert.rejects(controller.refresh(),/Séance Éclat remplacée/);
 assert.deepEqual(controller.getStatus(),{access:false,active:false});
 assert.match(root.innerHTML,/Accès Éclat requis/);
 controller.destroy();
});

test('expired authentication clears private screen; transient network failure does not destroy drafts',async()=>{
 const root=fakeRoot(),original=initial();
 let error=Object.assign(new Error('Temporary outage'),{status:503});
 const controller=createEclatV2PlayController({
  root,api:{status:async()=>{throw error;}},viewerId:aid,initialStatus:original
 });
 await assert.rejects(controller.refresh(),/Temporary outage/);
 assert.equal(controller.getStatus().session_id,sid);
 assert.match(root.innerHTML,/ÉCLAT · COFFRET/);
 error=Object.assign(new Error('JWT revoked'),{status:401});
 await assert.rejects(controller.refresh(),/JWT revoked/);
 assert.deepEqual(controller.getStatus(),{access:false,active:false});
 assert.match(root.innerHTML,/Accès Éclat requis/);
 controller.destroy();
});

test('an external finished session clears private role and renders only a consented public finale',async()=>{
 const root=fakeRoot(),original=initial();
 const controller=createEclatV2PlayController({
  root,api:{status:async()=>({...original,active:false,state:'finished'})},
  viewerId:aid,initialStatus:original
 });
 assert.equal(await controller.refresh(),true);
 assert.equal(controller.getStatus().active,false);
 assert.doesNotMatch(root.innerHTML,/ÉCLAT · COFFRET|data-eclat-v2-action="show-role/);
 controller.destroy();
});


test('stop on the original device erases private role/drafts without waiting for polling',async()=>{
 const root=fakeRoot(),original=initial(),actions=[];
 const controller=createEclatV2PlayController({
  root,api:{act:async args=>{
   actions.push(args);
   return {...original,active:false,state:'stopped'};
  }},
  viewerId:aid,initialStatus:original,confirmStop:async()=>true
 });
 const button={getAttribute:()=> 'act:stop'};
 await root.handlers.click({target:{closest:()=>button}});
 assert.deepEqual(actions,[{sessionId:sid,expectedStep:1,action:'stop'}]);
 assert.equal(controller.getStatus().active,false);
 assert.doesNotMatch(root.innerHTML,/ÉCLAT · COFFRET|Mission privée/);
 controller.destroy();
});
