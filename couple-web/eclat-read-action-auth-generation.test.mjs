import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ownsCoupleAsyncRead} from './evening-private-queue.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf('let latestEclatHistoryRead=null,latestEclatStatusRead=null;');
const end=app.indexOf('function renderEclat(){',start);
assert.ok(start>=0&&end>start,'real Éclat read and action implementation exists');
const source=app.slice(start,end);

function deferred(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {promise,resolve,reject};
}
function harness({rpc=async()=>null,loadEclatHistory=async()=>[]}={}){
 const state={user:{id:'alice'},coupleId:'couple-a',tab:'eclat',
  members:[{id:'alice'},{id:'bob'}],eclat:{id:'initial'},
  eclatHistory:[{id:'initial-history'}],
  eclatHistoryCouple:'couple-a',eclatHistoryUserId:'alice'};
 const warnings=[];
 const ctx={state,authFeedbackGeneration:1,ownsCoupleAsyncRead,
  client:{},rpc,loadEclatHistory,
  isSharedCoupleReady:(couple,members)=>!!couple&&members?.length===2,
  console:{warn:(...args)=>warnings.push(args)}};
 const funcs=runInNewContext(source+
  ';({refreshEclatHistory,refreshEclatStatus,beginEclatAction,ownsEclatAction,applyEclatActionResult,getForeground:()=>latestEclatExplicitRead})',ctx);
 return {state,ctx,warnings,...funcs};
}

test('LR-026: delayed Éclat history does not cross same-user reauthentication',async()=>{
 const oldRead=deferred();
 let requests=0;
 const h=harness({loadEclatHistory:()=>++requests===1?
  oldRead.promise:Promise.resolve([{id:'current-history'}])});
 const old=h.refreshEclatHistory();
 h.ctx.authFeedbackGeneration=2;
 oldRead.resolve([{id:'old-private-history'}]);
 await old;
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
 await h.refreshEclatHistory();
 assert.deepEqual(Array.from(h.state.eclatHistory,x=>x.id),['current-history']);
 assert.equal(requests,2);
});

test('LR-026: delayed Éclat status after same-user login is ignored',async()=>{
 const waiting=deferred();
 const h=harness({rpc:()=>waiting.promise});
 const old=h.refreshEclatStatus();
 h.ctx.authFeedbackGeneration=2;
 waiting.resolve({id:'old-private-status'});
 assert.equal(await old,null);
 assert.equal(h.state.eclat.id,'initial');
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
});

test('LR-026: old Éclat action receipt cannot mutate reauthenticated state',()=>{
 const h=harness();
 const previous=h.beginEclatAction();
 assert.ok(previous);
 assert.equal(h.ownsEclatAction(previous),true);
 h.ctx.authFeedbackGeneration=2;
 assert.equal(h.ownsEclatAction(previous),false);
 assert.equal(h.applyEclatActionResult({id:'former-receipt'},previous),false);
 assert.equal(h.state.eclat.id,'initial');
 const current=h.beginEclatAction();
 assert.ok(current);
 assert.equal(h.applyEclatActionResult({id:'latest-receipt'},current),true);
 assert.equal(h.state.eclat.id,'latest-receipt');
});

test('LR-026: old history error cannot alter a fresh login error state',async()=>{
 const oldRead=deferred();
 const h=harness({loadEclatHistory:()=>oldRead.promise});
 const previous=h.refreshEclatHistory();
 h.ctx.authFeedbackGeneration=2;
 oldRead.reject(new Error('expired login'));
 await previous;
 assert.equal(h.state.eclatHistoryError,undefined);
 assert.equal(h.warnings.length,0);
});

test('LR-026: Éclat status cannot apply a reply after couple membership is lost',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 const read=h.refreshEclatStatus();
 h.state.members=[{id:'alice'}];
 pending.resolve({id:'former-couple-status'});
 assert.equal(await read,null);
 assert.equal(h.state.eclat.id,'initial');
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
});

test('LR-026: pending Éclat history cannot commit after couple membership is revoked',async()=>{
 const pending=deferred();
 const h=harness({loadEclatHistory:()=>pending.promise});
 const old=h.refreshEclatHistory();
 h.state.members=[{id:'alice'}];
 pending.resolve([{id:'former-private-history'}]);
 await old;
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
 assert.equal(h.state.eclatHistoryError,undefined);
});

test('LR-026: Éclat history does not query the server without a ready couple',async()=>{
 let calls=0;
 const h=harness({loadEclatHistory:async()=>{calls++;return [];}});
 h.state.members=[{id:'alice'}];
 await h.refreshEclatHistory();
 assert.equal(calls,0);
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
});

test('LR-026: an Éclat action is invalid after couple membership is revoked',()=>{
 const h=harness();
 const owner=h.beginEclatAction();
 assert.ok(owner);
 h.state.members=[{id:'alice'}];
 assert.equal(h.ownsEclatAction(owner),false);
 assert.equal(h.applyEclatActionResult({id:'unavailable'},owner),false);
 assert.equal(h.beginEclatAction(),null,
  'cannot start another action after losing couple membership');
 assert.equal(h.state.eclat.id,'initial');
});

test('LR-026: foreground Éclat status request releases its priority on success',async()=>{
 const delayed=deferred();
 const h=harness({rpc:()=>delayed.promise});
 const reading=h.refreshEclatStatus();
 assert.equal(h.getForeground()?.userId,'alice');
 assert.equal(h.getForeground()?.coupleId,'couple-a');
 assert.equal(h.getForeground()?.generation,1);
 delayed.resolve({id:'fresh'});
 assert.equal((await reading).id,'fresh');
 assert.equal(h.getForeground(),null,'successful foreground reads release their priority');
 assert.equal(h.state.eclat.id,'fresh');
});

test('LR-026: foreground Éclat status request releases its priority on network error',async()=>{
 const delayed=deferred();
 const h=harness({rpc:()=>delayed.promise});
 const reading=h.refreshEclatStatus();
 assert.ok(h.getForeground());
 delayed.reject(new Error('network offline'));
 await assert.rejects(reading,/network offline/);
 assert.equal(h.getForeground(),null,'a failed foreground read must not freeze background sync');
});

test('LR-026: old foreground completion cannot clear a newer request after reauthentication',async()=>{
 const old=deferred(),recent=deferred();
 let count=0;
 const h=harness({rpc:()=>++count===1?old.promise:recent.promise});
 const first=h.refreshEclatStatus();
 const former=h.getForeground();
 h.ctx.authFeedbackGeneration=2;
 const second=h.refreshEclatStatus();
 const latest=h.getForeground();
 assert.notEqual(former,latest);
 old.resolve({id:'stale'});
 assert.equal(await first,null);
 assert.equal(h.getForeground(),latest,'the older finally cannot clear the current ticket');
 recent.resolve({id:'new'});
 assert.equal((await second).id,'new');
 assert.equal(h.getForeground(),null);
 assert.equal(h.state.eclat.id,'new');
});

test('LR-026: missing foreground Éclat status clears a previously cached coffret',async()=>{
 const h=harness({rpc:async()=>null});
 h.state.eclat={active:true,id:'previous-coffret'};
 assert.equal(await h.refreshEclatStatus(),null);
 assert.equal(h.state.eclat,null,
  'the foreground refresh must not display an old coffret after a null server status');
 assert.equal(h.getForeground(),null);
});

test('LR-026: obsolete null Éclat status cannot clear a newer authenticated state',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 const old=h.refreshEclatStatus();
 h.ctx.authFeedbackGeneration=2;
 h.state.eclat={active:true,id:'new-session'};
 pending.resolve(null);
 assert.equal(await old,null);
 assert.equal(h.state.eclat.id,'new-session');
 assert.equal(h.getForeground(),null);
});

test('LR-026: failed foreground status request preserves the displayed coffret',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 const old=h.refreshEclatStatus();
 pending.reject(new Error('temporary status outage'));
 await assert.rejects(old,/temporary status outage/);
 assert.equal(h.state.eclat.id,'initial');
 assert.equal(h.getForeground(),null);
});
