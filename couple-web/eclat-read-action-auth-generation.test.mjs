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
  eclatNoteDrafts:new Map(),client:{},rpc,loadEclatHistory,
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

test('LR-026: null Éclat status drops cached history without querying private records',async()=>{
 let historyReads=0;
 const h=harness({
  rpc:async()=>null,
  loadEclatHistory:async()=>{historyReads++;return [{id:'should-not-load'}];}
 });
 h.state.eclat={active:true,id:'previous-coffret'};
 h.state.eclatHistoryError=true;
 assert.equal(await h.refreshEclatStatus(),null);
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatHistoryError,false);
 assert.equal(historyReads,0,'unavailable status must not trigger another private history fetch');
});

test('LR-026: null Éclat response cannot delete history after identity changes',async()=>{
 const delayed=deferred();
 const h=harness({rpc:()=>delayed.promise});
 const previous=h.refreshEclatStatus();
 h.state.user={id:'bob'};
 h.state.eclat={id:'bob-coffret'};
 h.state.eclatHistory=[{id:'bob-history'}];
 delayed.resolve(null);
 assert.equal(await previous,null);
 assert.equal(h.state.eclat.id,'bob-coffret');
 assert.deepEqual(h.state.eclatHistory,[{id:'bob-history'}]);
});

test('LR-026: a pending history response cannot restore content after null status',async()=>{
 const delayed=deferred();
 const h=harness({rpc:async()=>null,loadEclatHistory:()=>delayed.promise});
 const stale=h.refreshEclatHistory();
 await h.refreshEclatStatus();
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 delayed.resolve([{id:'stale-private-history'}]);
 await stale;
 assert.deepEqual(Array.from(h.state.eclatHistory),[],
  'the null status invalidates a previously authorized history request');
});


test('LR-026: denied foreground Éclat status removes prior private history without refetch',async()=>{
 let reads=0;
 const denied={id:'denied',access:false,active:false,total_cents:999};
 const h=harness({rpc:async()=>denied,loadEclatHistory:async()=>{
  reads++;return [{id:'must-not-be-read'}];
 }});
 h.state.eclat={id:'former',access:true,active:true};
 h.state.eclatHistoryError=true;
 const result=await h.refreshEclatStatus();
 assert.equal(result?.id,'denied','denied status remains available for public offer');
 assert.equal(h.state.eclat?.access,false);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatHistoryError,false);
 assert.equal(reads,0,'revoked access must not start private history query');
});

test('LR-026: history cannot reload while Éclat entitlement is denied',async()=>{
 let reads=0;
 const h=harness({loadEclatHistory:async()=>{reads++;return []; }});
 h.state.eclat={access:false,active:false};
 await h.refreshEclatHistory();
 assert.equal(reads,0);
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}],
  'a skipped fetch does not invent or overwrite history; status handler owns its purge');
});

test('LR-026: stale history read cannot restore private data after access is denied',async()=>{
 const old=deferred();
 let reads=0;
 const h=harness({rpc:async()=>({access:false,active:false}),loadEclatHistory:()=>{
  reads++;return old.promise;
 }});
 h.state.eclat={access:true,active:true};
 const earlier=h.refreshEclatHistory();
 await h.refreshEclatStatus();
 assert.equal(reads,1);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 old.resolve([{id:'former-private-history'}]);
 await earlier;
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclat?.access,false);
});


test('LR-026: denied foreground status purges cached private draft and completion',async()=>{
 const denied={access:false,active:false,total_cents:999};
 const h=harness({rpc:async()=>denied});
 h.state.eclat={access:true,active:true,session_id:'same-session'};
 h.state.eclatFinished='Old private completion';
 h.ctx.eclatNoteDrafts.set('alice:same-session:1',{note:'Old private draft'});
 const status=await h.refreshEclatStatus();
 assert.equal(status,denied);
 assert.equal(h.ctx.eclatNoteDrafts.size,0,
  'a revoked user must not reuse stale private drafts if access is regranted');
 assert.equal(h.state.eclatFinished,null,
  'revocation must remove old private completion from memory');
});

test('LR-026: stale denied response must not erase newer login private drafts',async()=>{
 const waiting=deferred();
 const h=harness({rpc:()=>waiting.promise});
 const old=h.refreshEclatStatus();
 h.ctx.authFeedbackGeneration=2;
 h.state.eclatFinished='New login completion';
 h.ctx.eclatNoteDrafts.set('current',{note:'New login only'});
 waiting.resolve({access:false,active:false});
 assert.equal(await old,null);
 assert.equal(h.ctx.eclatNoteDrafts.get('current').note,'New login only');
 assert.equal(h.state.eclatFinished,'New login completion');
});
