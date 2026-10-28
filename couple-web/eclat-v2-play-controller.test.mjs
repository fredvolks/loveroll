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
