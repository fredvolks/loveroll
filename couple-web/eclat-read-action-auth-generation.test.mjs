import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ownsCoupleAsyncRead} from './evening-private-queue.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf('let latestEclatHistoryRead=null,latestEclatStatusRead=null;');
const end=app.indexOf('function renderEclat(){',start);
assert.ok(start>=0&&end>start,'real Éclat read and action implementation exists');
const source='let latestEclatAudioOwner=null;\n'+app.slice(start,end);

function deferred(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {promise,resolve,reject};
}
function harness({rpc=async()=>null,loadEclatHistory=async()=>[]}={}){
 const state={user:{id:'alice'},coupleId:'couple-a',tab:'eclat',
  members:[{id:'alice'},{id:'bob'}],eclat:{id:'initial',access:true},
  eclatHistory:[{id:'initial-history'}],
  eclatHistoryCouple:'couple-a',eclatHistoryUserId:'alice'};
 const warnings=[],renders=[];let audioStops=0;
 const ctx={state,authFeedbackGeneration:1,ownsCoupleAsyncRead,
  eclatNoteDrafts:new Map(),eclatAudio:{stop:()=>{audioStops++;}},
  client:{},rpc,loadEclatHistory,
  isSharedCoupleReady:(couple,members)=>!!couple&&members?.length===2,
  render:()=>renders.push(state.eclat?.access??null),
  console:{warn:(...args)=>warnings.push(args)}};
 const funcs=runInNewContext(source+
  ';({refreshEclatHistory,refreshEclatStatus,beginEclatAction,ownsEclatAction,runEclatMutation,applyEclatActionResult,getForeground:()=>latestEclatExplicitRead})',ctx);
 return {state,ctx,warnings,renders,audioStops:()=>audioStops,...funcs};
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
 waiting.resolve({access:true,id:'old-private-status'});
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
 assert.equal(h.applyEclatActionResult({id:'latest-receipt',access:true},current),true);
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
 pending.resolve({access:true,id:'former-couple-status'});
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
 delayed.resolve({access:true,id:'fresh'});
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
 old.resolve({access:true,id:'stale'});
 assert.equal(await first,null);
 assert.equal(h.getForeground(),latest,'the older finally cannot clear the current ticket');
 recent.resolve({access:true,id:'new'});
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


test('LR-026: foreground revoked status stops Éclat audio immediately before any paint',async()=>{
 const h=harness({rpc:async()=>({access:false,active:false})});
 h.state.eclat={access:true,active:true};
 h.state.eclatMusic=true;
 h.ctx.eclatNoteDrafts.set('private',{note:'old'});
 await h.refreshEclatStatus();
 assert.equal(h.audioStops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.ctx.eclatNoteDrafts.size,0);
});

test('LR-026: action receipt with lost entitlement purges private state and audio',()=>{
 const h=harness();
 h.state.eclatMusic=true;
 h.state.eclatFinished='Private finish';
 h.state.eclatHistory=[{id:'private-history'}];
 h.ctx.eclatNoteDrafts.set('note',{note:'Private text'});
 const owner=h.beginEclatAction();
 assert.equal(h.applyEclatActionResult({access:false,active:false},owner),true);
 assert.equal(h.state.eclat?.access,false);
 assert.equal(h.audioStops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.state.eclatFinished,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.ctx.eclatNoteDrafts.size,0);
});

test('LR-026: active Éclat action result keeps music and private cached history',()=>{
 const h=harness();
 h.state.eclatMusic=true;
 h.ctx.eclatNoteDrafts.set('note',{note:'Owned draft'});
 const owner=h.beginEclatAction();
 assert.equal(h.applyEclatActionResult({access:true,active:true},owner),true);
 assert.equal(h.audioStops(),0);
 assert.equal(h.state.eclatMusic,true);
 assert.equal(h.ctx.eclatNoteDrafts.get('note')?.note,'Owned draft');
});


test('LR-026: foreground completed session stops music before history request finishes',async()=>{
 const history=deferred(),started=deferred();
 const h=harness({rpc:async()=>({access:true,active:false}),
  loadEclatHistory:()=>{started.resolve();return history.promise;}});
 h.state.eclat={access:true,active:true};
 h.state.eclatMusic=true;
 h.ctx.eclatNoteDrafts.set('note',{note:'Retained private note'});
 const reading=h.refreshEclatStatus();
 await started.promise;
 assert.equal(h.audioStops(),1,
  'soundtrack stops immediately rather than waiting for history network');
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.ctx.eclatNoteDrafts.get('note').note,'Retained private note',
  'normal completion must not erase authorized notes');
 history.resolve([{id:'completed-coffret'}]);
 await reading;
 assert.deepEqual(Array.from(h.state.eclatHistory,x=>x.id),['completed-coffret']);
});

test('LR-026: completed action receipt stops audio without purging retained history',()=>{
 const h=harness();
 h.state.eclat={access:true,active:true};
 h.state.eclatMusic=true;
 h.state.eclatHistory=[{id:'already-finished'}];
 h.ctx.eclatNoteDrafts.set('note',{note:'Keep this'});
 const owner=h.beginEclatAction();
 assert.equal(h.applyEclatActionResult({access:true,active:false},owner),true);
 assert.equal(h.audioStops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.deepEqual(h.state.eclatHistory,[{id:'already-finished'}]);
 assert.equal(h.ctx.eclatNoteDrafts.get('note').note,'Keep this');
});

test('LR-026: in-progress server receipt does not silence authorized soundtrack',()=>{
 const h=harness({rpc:async()=>({access:true,active:true})});
 h.state.eclatMusic=true;
 const owner=h.beginEclatAction();
 assert.equal(h.applyEclatActionResult({access:true,active:true},owner),true);
 assert.equal(h.audioStops(),0);
 assert.equal(h.state.eclatMusic,true);
});


// Exercise the actual production membership transition, including its in-flight
// request invalidation. Reordering the same two people must not wipe drafts.
const membershipStart=app.indexOf('function eclatMembershipScope(coupleId,members){');
const membershipEnd=app.indexOf('function eclatNoteState(){',membershipStart);
assert.ok(membershipStart>=0&&membershipEnd>membershipStart,
 'Éclat membership privacy boundary must remain part of production code');
const membershipSource=app.slice(membershipStart,membershipEnd);
function membershipFixture(){
 const members=[{user_id:'alice',name:'Alice'},{user_id:'bob',name:'Bob'}];
 const state={user:{id:'alice'},coupleId:'duo',members,
  eclatMembershipScope:JSON.stringify(['duo','alice','bob']),
  eclat:{access:true,active:true,id:'old-session'},
  eclatHistory:[{id:'old-private-history'}],eclatHistoryCouple:'duo',
  eclatHistoryUserId:'alice',eclatFinished:'Completed private coffret',
  eclatHistoryError:true,eclatGalleryScroll:5,eclatBrowse:true,
  eclatDetails:true,eclatMusic:true};
 let stops=0;
 const drafts=new Map([['old',{note:'Old partner private note'}]]);
 const ctx={state,eclatNoteDrafts:drafts,isSharedCoupleReady:(c,m)=>!!c&&m?.length===2,
  latestEclatHistoryRead:{},latestEclatStatusRead:{},latestEclatExplicitRead:{},
  latestEclatActionRequest:{},latestEclatAudioOwner:{},
  eclatAudio:{stop:()=>{stops++;}}};
 const funcs=runInNewContext(membershipSource+
  ';({acceptEclatMembership,eclatMembershipScope})',ctx);
 return {state,ctx,drafts,stops:()=>stops,...funcs};
}

test('LR-026: unchanged couple membership and display rename preserve Éclat drafts',()=>{
 const h=membershipFixture();
 h.acceptEclatMembership([{user_id:'bob',name:'Robert'},
  {user_id:'alice',name:'Alice 2'}]);
 assert.equal(h.state.members[0].name,'Robert');
 assert.equal(h.state.eclat.id,'old-session');
 assert.equal(h.state.eclatHistory[0].id,'old-private-history');
 assert.equal(h.drafts.get('old').note,'Old partner private note');
 assert.equal(h.stops(),0,'same members reordered must not interrupt soundtrack');
});

test('LR-026: membership change must clear previous partner private state',()=>{
 const h=membershipFixture();
 h.acceptEclatMembership([{user_id:'alice'},{user_id:'carol'}]);
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatHistoryCouple,null);
 assert.equal(h.state.eclatHistoryUserId,null);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.state.eclatBrowse,false);
 assert.equal(h.state.eclatDetails,false);
 assert.equal(h.drafts.size,0);
 assert.equal(h.stops(),1);
 assert.equal(h.ctx.latestEclatHistoryRead,null);
 assert.equal(h.ctx.latestEclatStatusRead,null);
 assert.equal(h.ctx.latestEclatActionRequest,null);
});

test('LR-026: new couple ID with identical two users is a new Éclat privacy boundary',()=>{
 const h=membershipFixture();
 h.state.coupleId='new-duo';
 h.acceptEclatMembership([{user_id:'alice'},{user_id:'bob'}]);
 assert.equal(h.state.eclat,null);
 assert.equal(h.drafts.size,0);
 assert.equal(h.stops(),1);
 assert.equal(h.state.eclatMembershipScope,JSON.stringify(['new-duo','alice','bob']));
});

test('LR-026: incomplete membership invalidates Éclat access and private cache',()=>{
 const h=membershipFixture();
 h.acceptEclatMembership([{user_id:'alice'}]);
 assert.equal(h.state.eclatMembershipScope,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.drafts.size,0);
 assert.equal(h.stops(),1);
});

test('LR-026: stale history fetch cannot reintroduce data after membership changes',async()=>{
 const h=membershipFixture(),waiting=deferred();
 const start=app.indexOf('let latestEclatHistoryRead=null,latestEclatStatusRead=null;');
 const end=app.indexOf('function applyEclatStatus(value){',start);
 assert.ok(start>=0&&end>start);
 // Make the real history read and membership transition share the same VM
 // request token so a retired partner response cannot repopulate the gallery.
 let reads=0;
 const runtime={state:h.state,authFeedbackGeneration:1,
  isSharedCoupleReady:(c,m)=>!!c&&m?.length===2,ownsCoupleAsyncRead,
  eclatNoteDrafts:h.drafts,eclatAudio:{stop:()=>{}},
  loadEclatHistory:()=>{reads++;return waiting.promise;},
  client:{},console};
 const scripts=membershipSource+'\n'+app.slice(start,end);
 // Status variables in the production slice are initialized in this VM.
 const f=runInNewContext(scripts+
  ';({acceptEclatMembership,refreshEclatHistory})',runtime);
 const pending=f.refreshEclatHistory();
 assert.equal(reads,1);
 f.acceptEclatMembership([{user_id:'alice'},{user_id:'carol'}]);
 waiting.resolve([{id:'former-partner-only'}]);
 await pending;
 assert.deepEqual(Array.from(h.state.eclatHistory),[],
  'retired member history must not overwrite new member boundary');
});


test('LR-026: foreground new active Éclat session hides older completion banner',async()=>{
 const h=harness({rpc:async()=>({id:'new-session',access:true,active:true})});
 h.state.eclatFinished='Old completed coffret';
 const value=await h.refreshEclatStatus();
 assert.equal(value.id,'new-session');
 assert.equal(h.state.eclatFinished,null,
  'a new playable coffret cannot display the old private completion');
 assert.equal(h.audioStops(),0);
});

test('LR-026: active action receipt clears completion but keeps authorized notes',()=>{
 const h=harness();
 h.state.eclatFinished='Former ending';
 h.ctx.eclatNoteDrafts.set('owned',{note:'Still owned'});
 const owner=h.beginEclatAction();
 assert.equal(h.applyEclatActionResult({id:'new',access:true,active:true},owner),true);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.ctx.eclatNoteDrafts.get('owned').note,'Still owned');
 assert.equal(h.audioStops(),0);
});

test('LR-026: stale foreground activation cannot erase newer login completion',async()=>{
 const previous=deferred();
 const h=harness({rpc:()=>previous.promise});
 const old=h.refreshEclatStatus();
 h.ctx.authFeedbackGeneration=2;
 h.state.eclatFinished='New login ending';
 previous.resolve({access:true,active:true});
 assert.equal(await old,null);
 assert.equal(h.state.eclatFinished,'New login ending');
});


test('LR-026: null Éclat status cannot initiate a private history query',async()=>{
 let requests=0;
 const h=harness({loadEclatHistory:async()=>{requests++;return [{id:'leak'}];}});
 h.state.eclat=null;
 await h.refreshEclatHistory();
 assert.equal(requests,0);
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
});

test('LR-026: incomplete Éclat status is not evidence of entitlement',async()=>{
 let requests=0;
 const h=harness({loadEclatHistory:async()=>{requests++;return [{id:'leak'}];}});
 for(const status of [{active:true},{access:null,active:true},{access:0,active:true}]){
  h.state.eclat=status;
  await h.refreshEclatHistory();
 }
 assert.equal(requests,0,'missing or non-boolean access must never fetch private history');
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
});

test('LR-026: current authorized history request still loads private gallery',async()=>{
 let requests=0;
 const h=harness({loadEclatHistory:async()=>{requests++;return [{id:'authorized'}];}});
 h.state.eclat={access:true,active:false};
 await h.refreshEclatHistory();
 assert.equal(requests,1,'finished users still have authorized gallery access');
 assert.deepEqual(Array.from(h.state.eclatHistory,x=>x.id),['authorized']);
});

test('LR-026: pending history cannot commit after entitlement becomes unconfirmed',async()=>{
 const pending=deferred();
 const h=harness({loadEclatHistory:()=>pending.promise});
 h.state.eclat={access:true,active:true};
 const reading=h.refreshEclatHistory();
 h.state.eclat={active:true};
 pending.resolve([{id:'stale-private-history'}]);
 await reading;
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
 assert.equal(h.state.eclatHistoryError,undefined);
});

test('LR-026: foreground status with missing access never fetches private history',async()=>{
 let requests=0;
 const h=harness({rpc:async()=>({active:true}),
  loadEclatHistory:async()=>{requests++;return [{id:'leak'}];}});
 await h.refreshEclatStatus();
 assert.equal(requests,0);
 assert.equal(h.state.eclat.active,true);
});


test('LR-026: incomplete foreground entitlement erases prior private state',async()=>{
 const h=harness({rpc:async()=>({id:'incomplete',active:true})});
 h.state.eclat={id:'previous',access:true,active:true};
 h.state.eclatFinished='Private ending';
 h.state.eclatHistory=[{id:'previous-private'}];
 h.state.eclatMusic=true;
 h.ctx.eclatNoteDrafts.set('private',{note:'Former private note'});
 const result=await h.refreshEclatStatus();
 assert.equal(result.id,'incomplete','public offer data remains available');
 assert.equal(h.state.eclat.access,undefined);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.ctx.eclatNoteDrafts.size,0);
 assert.equal(h.audioStops(),1);
});

test('LR-026: a later authorized status can load its own history after uncertainty',async()=>{
 let calls=0;
 const h=harness({rpc:async()=>++calls===1?
  ({id:'unknown',active:false}):({id:'fresh',access:true,active:true}),
  loadEclatHistory:async()=>[{id:'fresh-owned'}]});
 h.state.eclat={id:'prior',access:true,active:true};
 await h.refreshEclatStatus();
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 const status=await h.refreshEclatStatus();
 assert.equal(status.id,'fresh');
 assert.deepEqual(Array.from(h.state.eclatHistory,x=>x.id),['fresh-owned']);
});

const noteReadStart=app.indexOf('function eclatNoteState(){');
const noteReadEnd=app.indexOf('// Every Éclat response is tied',noteReadStart);
const noteDenialStart=app.indexOf('function applyEclatStatus(value){');
const noteDenialEnd=app.indexOf('// Supabase may serialize the same status fields',noteDenialStart);
assert.ok(noteReadStart>=0&&noteReadEnd>noteReadStart&&
 noteDenialStart>noteReadEnd&&noteDenialEnd>noteDenialStart,
 'real Éclat private note and denial handlers are required');
const noteReadSource='let latestEclatHistoryRead=null,latestEclatAudioOwner=null;\n'+
 app.slice(noteReadStart,noteReadEnd)+'\n'+app.slice(noteDenialStart,noteDenialEnd);

function privateNoteDenialHarness({scopedKeys=false,saveUi=false}={}){
 const pendingRead=deferred(),pendingSave=deferred();
 const state={user:{id:'alice'},coupleId:'couple-a',tab:'eclat',
  members:[{id:'alice'},{id:'bob'}],
  eclat:{access:true,active:true,session_id:'session-a',chapter_index:1},
  eclatHistory:[{id:'private-gallery'}],eclatMusic:true,
  eclatFinished:'Private completion'};
 const drafts=new Map(),renders=[];
 const ui={button:{disabled:false,textContent:'Enregistrer ma note'},
  label:{textContent:'Écris ici, puis enregistre.'}};
 let audioStops=0;
 const ctx={state,client:{},authFeedbackGeneration:1,eclatNoteDrafts:drafts,
  ownsCoupleAsyncRead,eclatNoteKey:status=>scopedKeys?
   (status?.active&&status?.session_id?`${status.session_id}:${status.chapter_index}`:null):'private-key',
  isSharedCoupleReady:(c,m)=>!!c&&m?.length===2,
  loadEclatNote:()=>pendingRead.promise,saveEclatNote:()=>pendingSave.promise,
  eclatAudio:{stop:()=>{audioStops++;}},root:{querySelector:selector=>saveUi?
   (selector==='[data-action="eclat:note-save"]'?ui.button:
    selector==='[data-eclat-note-status]'?ui.label:null):null},
  render:()=>renders.push(state.eclat?.access??null)};
 const functions=runInNewContext(noteReadSource+
  ';({eclatNoteState,saveCurrentEclatNote})',ctx);
 return {state,ctx,drafts,renders,pendingRead,pendingSave,ui,...functions,
  audioStops:()=>audioStops};
}

test('LR-026: private note read with SQLSTATE 42501 revokes cached Éclat access',async()=>{
 const h=privateNoteDenialHarness();
 const draft=h.eclatNoteState();
 assert.equal(draft.loading,true);
 h.pendingRead.reject({status:400,code:'42501'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.drafts.size,0);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.deepEqual(h.renders,[null]);
});

test('LR-026: private note save with HTTP 403 revokes the local draft',async()=>{
 const h=privateNoteDenialHarness();
 h.drafts.set('private-key',{generation:1,loading:false,error:false,saving:false,
  note:'My private text',clue:'',moment_done:false,dirty:true});
 const saving=h.saveCurrentEclatNote();
 h.pendingSave.reject({status:403,code:'permission_denied'});
 assert.equal(await saving,null,'denied writes must not be treated as completed');
 assert.equal(h.state.eclat,null);
 assert.equal(h.drafts.size,0);
 assert.deepEqual(h.renders,[null]);
});

test('LR-026: temporary private note failure keeps local edits and allows retry',async()=>{
 const h=privateNoteDenialHarness();
 const draft={generation:1,loading:false,error:false,saving:false,
  note:'Unsent text',clue:'',moment_done:false,dirty:true};
 h.drafts.set('private-key',draft);
 const saving=h.saveCurrentEclatNote();
 h.pendingSave.reject(new Error('offline'));
 await assert.rejects(saving,/offline/);
 assert.equal(h.state.eclat.access,true);
 assert.equal(h.drafts.get('private-key'),draft);
 assert.equal(draft.saving,false);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: old note permission denial cannot revoke a new login',async()=>{
 const h=privateNoteDenialHarness();
 h.eclatNoteState();
 h.ctx.authFeedbackGeneration=2;
 h.state.eclat={access:true,active:true,session_id:'new-session'};
 h.drafts.clear();
 h.drafts.set('private-key',{note:'New login only',generation:2});
 h.pendingRead.reject({status:400,code:'42501'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.state.eclat.session_id,'new-session');
 assert.equal(h.drafts.get('private-key').note,'New login only');
 assert.deepEqual(h.renders,[]);
});

test('LR-026: permission denied for active Éclat mutation clears private state',async()=>{
 for(const error of [{status:403},{status:400,code:'42501'}]){
  const h=harness({rpc:async()=>{throw error;}});
  const owner=h.beginEclatAction();
  h.state.eclatMusic=true;
  h.ctx.eclatNoteDrafts.set('private',{note:'Sensitive'});
  const receipt=await h.runEclatMutation(owner,'love_eclat_next');
  assert.equal(receipt.applied,false);
  assert.equal(h.state.eclat,null);
  assert.deepEqual(Array.from(h.state.eclatHistory),[]);
  assert.equal(h.ctx.eclatNoteDrafts.size,0);
  assert.equal(h.state.eclatMusic,false);
  assert.equal(h.audioStops(),1);
  assert.deepEqual(h.renders,[null]);
 }
});

test('LR-026: transient Éclat mutation outage preserves private state and propagates error',async()=>{
 const h=harness({rpc:async()=>{throw new Error('offline');}});
 const owner=h.beginEclatAction();
 h.state.eclatMusic=true;
 h.ctx.eclatNoteDrafts.set('private',{note:'Unsaved'});
 await assert.rejects(h.runEclatMutation(owner,'love_eclat_choose',{p_choice:1}),/offline/);
 assert.equal(h.state.eclat.access,true);
 assert.equal(h.ctx.eclatNoteDrafts.get('private').note,'Unsaved');
 assert.deepEqual(h.state.eclatHistory,[{id:'initial-history'}]);
 assert.equal(h.state.eclatMusic,true);
 assert.equal(h.audioStops(),0);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: stale mutation permission denial cannot revoke replacement login',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 const owner=h.beginEclatAction();
 const result=h.runEclatMutation(owner,'love_eclat_end');
 h.ctx.authFeedbackGeneration=2;
 h.state.eclat={access:true,id:'replacement'};
 h.state.eclatHistory=[{id:'new-owner-private'}];
 pending.reject({status:403,code:'42501'});
 assert.equal((await result).applied,false);
 assert.equal(h.state.eclat.id,'replacement');
 assert.deepEqual(h.state.eclatHistory,[{id:'new-owner-private'}]);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: current mutation returns the authoritative server receipt unchanged',async()=>{
 const receipt={access:false,active:false,id:'ended'};
 const h=harness({rpc:async()=>receipt});
 const owner=h.beginEclatAction();
 const result=await h.runEclatMutation(owner,'love_eclat_end');
 assert.equal(result.applied,true);
 assert.equal(result.value,receipt);
 assert.equal(h.applyEclatActionResult(result.value,owner),true);
 assert.equal(h.state.eclat.id,'ended');
 assert.deepEqual(h.renders,[]);
});

test('LR-026: completed Éclat mutation cannot reopen server-revoked access',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'session-old',coffret_id:1,chapter_index:2};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_choose',{p_choice:1});
 h.state.eclat={access:false,active:false,session_id:'session-old'};
 pending.resolve({access:true,active:true,session_id:'session-old',id:'stale-choice'});
 const receipt=await writing;
 assert.equal(receipt.applied,false,'a stale mutation cannot regrant access after a newer server denial');
 assert.equal(h.state.eclat.access,false);
});

test('LR-026: stale mutation cannot restore a previous partner session',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'session-old',coffret_id:1,chapter_index:2};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_next');
 h.state.eclat={access:true,active:true,session_id:'session-new',coffret_id:2,chapter_index:1};
 pending.resolve({access:true,active:true,session_id:'session-old',coffret_id:1,chapter_index:3});
 assert.equal((await writing).applied,false);
 assert.equal(h.state.eclat.session_id,'session-new');
 assert.equal(h.state.eclat.coffret_id,2);
});

test('LR-026: stale mutation cannot roll back a chapter already advanced by partner',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'session-old',coffret_id:1,chapter_index:2};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_next');
 h.state.eclat={...h.state.eclat,chapter_index:3};
 pending.resolve({access:true,active:true,session_id:'session-old',coffret_id:1,chapter_index:2});
 assert.equal((await writing).applied,false);
 assert.equal(h.state.eclat.chapter_index,3);
});

test('LR-026: partner choice updates do not discard current authorized mutation',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'same-session',
  coffret_id:1,chapter_index:2,my_choice:null};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_choose',{p_choice:0});
 h.state.eclat={...h.state.eclat,my_choice:1};
 const result={access:true,active:true,session_id:'same-session',
  coffret_id:1,chapter_index:2,my_choice:0};
 pending.resolve(result);
 const receipt=await writing;
 assert.equal(receipt.applied,true,'a choice update in the same chapter is not a new session');
 assert.equal(receipt.value,result);
});

test('LR-026: obsolete SQLSTATE 42501 from prior Éclat session does not revoke current session',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'former',coffret_id:1,chapter_index:3};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_next');
 // An authoritative newer server poll already opened another coffret.
 h.state.eclat={access:true,active:true,session_id:'current',coffret_id:2,chapter_index:1};
 h.state.eclatHistory=[{id:'current-private-gallery'}];
 h.ctx.eclatNoteDrafts.set('current',{note:'Protected by current session'});
 pending.reject({status:400,code:'42501'});
 const result=await writing;
 assert.equal(result.applied,false);
 assert.equal(h.state.eclat.session_id,'current');
 assert.deepEqual(h.state.eclatHistory,[{id:'current-private-gallery'}]);
 assert.equal(h.ctx.eclatNoteDrafts.get('current').note,'Protected by current session');
 assert.equal(h.audioStops(),0);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: obsolete HTTP 403 from prior chapter cannot revoke newer chapter',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'same',coffret_id:1,chapter_index:2};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_choose',{p_choice:1});
 h.state.eclat={access:true,active:true,session_id:'same',coffret_id:1,chapter_index:3};
 pending.reject({status:403,code:'permission_denied'});
 assert.equal((await writing).applied,false);
 assert.equal(h.state.eclat.chapter_index,3);
 assert.equal(h.state.eclat.access,true);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: current session permission denial still revokes private Éclat access',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'same',coffret_id:1,chapter_index:2};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_choose',{p_choice:0});
 // Status with a newer partner choice is still the same authorized scene.
 h.state.eclat={...h.state.eclat,my_choice:1};
 h.state.eclatHistory=[{id:'private-gallery'}];
 pending.reject({status:400,code:'42501'});
 assert.equal((await writing).applied,false);
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.deepEqual(h.renders,[null]);
});

test('LR-026: obsolete transient mutation error does not notify an already advanced chapter',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 h.state.eclat={access:true,active:true,session_id:'same',coffret_id:1,chapter_index:2};
 const owner=h.beginEclatAction();
 const writing=h.runEclatMutation(owner,'love_eclat_next');
 h.state.eclat={access:true,active:true,session_id:'same',coffret_id:1,chapter_index:3};
 pending.reject(new Error('former chapter network error'));
 assert.equal((await writing).applied,false);
 assert.equal(h.state.eclat.chapter_index,3);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: obsolete private note read 42501 cannot revoke a newer chapter',async()=>{
 const h=privateNoteDenialHarness({scopedKeys:true});
 const old=h.eclatNoteState();
 assert.equal(old.loading,true);
 h.state.eclat={...h.state.eclat,chapter_index:2};
 h.drafts.set('session-a:2',{generation:1,note:'Current chapter only'});
 h.pendingRead.reject({status:400,code:'42501'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.state.eclat.chapter_index,2);
 assert.equal(h.state.eclat.access,true);
 assert.equal(h.drafts.get('session-a:2').note,'Current chapter only');
 assert.equal(h.state.eclatHistory[0].id,'private-gallery');
 assert.equal(h.audioStops(),0);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: obsolete private note read HTTP 403 cannot revoke a replacement coffret',async()=>{
 const h=privateNoteDenialHarness({scopedKeys:true});
 h.eclatNoteState();
 h.state.eclat={...h.state.eclat,session_id:'new-coffret',chapter_index:1};
 h.drafts.set('new-coffret:1',{generation:1,note:'Replacement scene'});
 h.pendingRead.reject({status:403,code:'permission_denied'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.state.eclat.session_id,'new-coffret');
 assert.equal(h.drafts.get('new-coffret:1').note,'Replacement scene');
 assert.equal(h.state.eclatMusic,true);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: old note read success cannot write previous chapter draft',async()=>{
 const h=privateNoteDenialHarness({scopedKeys:true});
 const old=h.eclatNoteState();
 h.state.eclat={...h.state.eclat,chapter_index:2};
 h.pendingRead.resolve({note:'Previous chapter response',clue:'private',moment_done:false});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.state.eclat.chapter_index,2);
 assert.equal(old.note,'');
 assert.equal(old.clue,'');
 assert.deepEqual(h.renders,[]);
});

test('LR-026: double tap cannot send two mutations for the same Éclat scene',async()=>{
 const first=deferred();
 let calls=0;
 const h=harness({rpc:()=>{calls++;return calls===1?first.promise:Promise.resolve({access:true});}});
 h.state.eclat={access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:2};
 const original=h.beginEclatAction();
 const pending=h.runEclatMutation(original,'love_eclat_next');
 assert.equal(calls,1);
 assert.equal(h.beginEclatAction(),null,'an in-flight mutation must reject the second tap');
 assert.equal(calls,1,'the second tap must not reach Supabase');
 first.resolve({access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:3});
 assert.equal((await pending).applied,true);
 assert.ok(h.beginEclatAction(),'the next user action must work after the original settles');
});

test('LR-026: failed mutation releases the double-submit guard for retry',async()=>{
 const first=deferred();
 let calls=0;
 const h=harness({rpc:()=>{calls++;return calls===1?first.promise:Promise.resolve({access:true});}});
 h.state.eclat={access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:2};
 const pending=h.runEclatMutation(h.beginEclatAction(),'love_eclat_choose',{p_choice:0});
 assert.equal(h.beginEclatAction(),null);
 first.reject(new Error('network offline'));
 await assert.rejects(pending,/network offline/);
 const retry=h.beginEclatAction();
 assert.ok(retry,'a temporary failure cannot permanently lock the controls');
 assert.equal((await h.runEclatMutation(retry,'love_eclat_choose',{p_choice:0})).applied,true);
 assert.equal(calls,2);
});

test('LR-026: old mutation completion cannot unlock newer chapter request',async()=>{
 const older=deferred(),current=deferred();
 let calls=0;
 const h=harness({rpc:()=>++calls===1?older.promise:current.promise});
 h.state.eclat={access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:2};
 const oldAction=h.runEclatMutation(h.beginEclatAction(),'love_eclat_next');
 h.state.eclat={...h.state.eclat,chapter_index:3};
 const next=h.beginEclatAction();
 assert.ok(next,'chapter progress from server permits a new action');
 const newAction=h.runEclatMutation(next,'love_eclat_choose',{p_choice:0});
 assert.equal(calls,2);
 older.resolve({access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:2});
 assert.equal((await oldAction).applied,false);
 assert.equal(h.beginEclatAction(),null,'older finally must not release the newer mutation');
 current.resolve({access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:3});
 assert.equal((await newAction).applied,true);
 assert.ok(h.beginEclatAction(),'latest mutation finally must release its own guard');
});

test('LR-026: stalled Éclat mutation guard expires after 30 seconds',async()=>{
 const pending=deferred();
 const h=harness({rpc:()=>pending.promise});
 let now=0;
 h.ctx.Date={now:()=>now};
 h.state.eclat={access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:2};
 const oldAction=h.runEclatMutation(h.beginEclatAction(),'love_eclat_next');
 now=29999;
 assert.equal(h.beginEclatAction(),null);
 now=30000;
 assert.ok(h.beginEclatAction(),'the guard must not block controls permanently after a stalled request');
 pending.resolve({access:true,active:true,session_id:'scene',coffret_id:1,chapter_index:3});
 assert.equal((await oldAction).applied,false,'expired action receipt is superseded');
});

test('LR-026: saving private Éclat note announces progress and restores submit',async()=>{
 const h=privateNoteDenialHarness({saveUi:true});
 const draft={generation:1,loading:false,error:false,saving:false,
  note:'Saved note',clue:'',moment_done:false,dirty:true};
 h.drafts.set('private-key',draft);
 const pending=h.saveCurrentEclatNote();
 assert.equal(draft.saving,true);
 assert.equal(h.ui.button.disabled,true);
 assert.equal(h.ui.button.textContent,'Enregistrement…');
 assert.equal(h.ui.label.textContent,'Enregistrement en cours…');
 h.pendingSave.resolve();
 assert.equal(await pending,'private-key');
 assert.equal(h.ui.button.disabled,false);
 assert.equal(h.ui.button.textContent,'Enregistrer ma note');
 assert.equal(h.ui.label.textContent,'Note enregistrée pour toi');
 assert.equal(draft.dirty,false);
});

test('LR-026: failed note save restores submit without hiding retry explanation',async()=>{
 const h=privateNoteDenialHarness({saveUi:true});
 h.drafts.set('private-key',{generation:1,loading:false,error:false,saving:false,
  note:'Keep private text',clue:'',moment_done:false,dirty:true});
 const saving=h.saveCurrentEclatNote();
 h.pendingSave.reject(new Error('offline'));
 await assert.rejects(saving,/offline/);
 assert.equal(h.ui.button.disabled,false);
 assert.equal(h.ui.button.textContent,'Enregistrer ma note');
 assert.equal(h.ui.label.textContent,'Non enregistré. Ton texte est conservé ici; réessaie.');
 assert.equal(h.drafts.get('private-key').note,'Keep private text');
});

test('LR-026: new private typing during pending save remains dirty and editable',async()=>{
 const h=privateNoteDenialHarness({saveUi:true});
 const draft={generation:1,loading:false,error:false,saving:false,
  note:'Original snapshot',clue:'',moment_done:false,dirty:true};
 h.drafts.set('private-key',draft);
 const pending=h.saveCurrentEclatNote();
 assert.equal(h.ui.button.disabled,true);
 // A user can continue typing in their private editor while Supabase saves.
 draft.note='More recent private text';
 draft.dirty=true;
 draft.saved=false;
 h.pendingSave.resolve();
 assert.equal(await pending,null,'stale save cannot confirm newer unsaved edits');
 assert.equal(draft.note,'More recent private text');
 assert.equal(draft.saved,false);
 assert.equal(draft.dirty,true);
 assert.equal(h.ui.button.disabled,false);
 assert.equal(h.ui.label.textContent,'Modifications non enregistrées');
});

test('LR-026: obsolete private note save cannot update replacement coffret status',async()=>{
 const h=privateNoteDenialHarness({saveUi:true,scopedKeys:true});
 const draft={generation:1,loading:false,error:false,saving:false,
  note:'Old chapter',clue:'',moment_done:false,dirty:true};
 h.drafts.set('session-a:1',draft);
 const pending=h.saveCurrentEclatNote();
 assert.equal(h.ui.label.textContent,'Enregistrement en cours…');
 h.state.eclat={...h.state.eclat,session_id:'replacement',chapter_index:1};
 h.drafts.set('replacement:1',{generation:1,note:'New private chapter'});
 h.ui.label.textContent='Nouvelle séance';
 h.pendingSave.resolve();
 assert.equal(await pending,null);
 assert.equal(h.ui.label.textContent,'Nouvelle séance',
  'late completion from prior coffret must not overwrite active UI status');
 assert.equal(h.drafts.get('replacement:1').note,'New private chapter');
 assert.equal(h.state.eclat.access,true);
});

const boundInputStart=app.indexOf('function bindEclatPrivateNoteFields(){');
const boundInputEnd=app.indexOf('function bindActions(){',boundInputStart);
assert.ok(boundInputStart>=0&&boundInputEnd>boundInputStart,'real scoped Éclat field binding exists');
const boundInputSource=app.slice(boundInputStart,boundInputEnd);

function boundPrivateInputHarness(){
 const state={user:{id:'alice'},coupleId:'couple-a',tab:'eclat',
  members:[{id:'alice'},{id:'bob'}],
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const key=status=>status?.active&&status.session_id&&state.user?.id?
  [state.user.id,status.session_id,status.chapter_index].join(':'):null;
 const draft={generation:1,loading:false,error:false,note:'Before',clue:'',
  saved:true,dirty:false};
 const drafts=new Map([['alice:session-1:1',draft]]);
 const status={textContent:'Note enregistrée pour toi'};
 const fields=['note','clue','not-a-note'].map(property=>({
  dataset:{eclatField:property},value:'',listener:null,mounted:true,
  addEventListener(type,listener){assert.equal(type,'input');this.listener=listener;},
  input(value){this.value=value;this.listener();}
 }));
 const ctx={state,authFeedbackGeneration:1,eclatNoteDrafts:drafts,
  eclatNoteKey:(s,id)=>s?.active&&s.session_id&&id?
   [id,s.session_id,s.chapter_index].join(':'):null,
  ownsCoupleAsyncRead,
  isSharedCoupleReady:(c,m)=>!!c&&m?.length===2,
  root:{contains:field=>fields.includes(field)&&field.mounted===true,
   querySelectorAll:()=>fields,
   querySelector:selector=>selector==='[data-eclat-note-status]'?status:null}};
 runInNewContext(boundInputSource+';bindEclatPrivateNoteFields()',ctx);
 return {state,ctx,draft,drafts,status,fields};
}

test('LR-026: current Éclat inputs update only note and clue for their owner',()=>{
 const h=boundPrivateInputHarness();
 h.fields[0].input('Nouvelle note');
 assert.equal(h.draft.note,'Nouvelle note');
 assert.equal(h.draft.dirty,true);
 assert.equal(h.draft.saved,false);
 assert.equal(h.status.textContent,'Modifications non enregistrées');
 h.fields[1].input('Indice privé');
 assert.equal(h.draft.clue,'Indice privé');
 h.fields[2].input('malicious');
 assert.equal(h.draft['not-a-note'],undefined,'unrecognized data field must not mutate draft');
});

test('LR-026: stale Éclat input cannot write into a replacement chapter',()=>{
 const h=boundPrivateInputHarness();
 h.state.eclat={...h.state.eclat,chapter_index:2};
 h.drafts.set('alice:session-1:2',{generation:1,note:'Chapitre suivant'});
 h.status.textContent='Nouvelle scène';
 h.fields[0].input('Ancienne zone de texte');
 assert.equal(h.drafts.get('alice:session-1:2').note,'Chapitre suivant');
 assert.equal(h.draft.note,'Before');
 assert.equal(h.status.textContent,'Nouvelle scène');
});

test('LR-026: former login input cannot alter a new account private note',()=>{
 const h=boundPrivateInputHarness();
 h.state.user={id:'bob'};
 h.ctx.authFeedbackGeneration=2;
 h.drafts.set('bob:session-1:1',{generation:2,note:'Note de Bob'});
 h.fields[0].input('Texte ancien Alice');
 assert.equal(h.drafts.get('bob:session-1:1').note,'Note de Bob');
 assert.equal(h.draft.note,'Before');
});

test('LR-026: revoked Éclat entitlement or replaced draft rejects stale input',()=>{
 const denied=boundPrivateInputHarness();
 denied.state.eclat.access=false;
 denied.fields[0].input('Cannot write after denial');
 assert.equal(denied.draft.note,'Before');
 const replaced=boundPrivateInputHarness();
 replaced.drafts.set('alice:session-1:1',{generation:1,note:'New retry draft'});
 replaced.fields[0].input('Cannot overwrite retry');
 assert.equal(replaced.drafts.get('alice:session-1:1').note,'New retry draft');
 assert.equal(replaced.draft.note,'Before');
});

test('LR-026: a detached private text field cannot overwrite the same chapter after rerender',()=>{
 const h=boundPrivateInputHarness();
 h.fields[0].mounted=false;
 h.status.textContent='Nouvel écran';
 h.fields[0].input('Old DOM event after rerender');
 assert.equal(h.draft.note,'Before','unmounted field is no longer authorized to edit');
 assert.equal(h.draft.saved,true);
 assert.equal(h.draft.dirty,false);
 assert.equal(h.status.textContent,'Nouvel écran');
 h.fields[1].input('New live clue');
 assert.equal(h.draft.clue,'New live clue','live mounted inputs must still work');
});

test('LR-026: private field mounted outside the current app root cannot alter the draft',()=>{
 const h=boundPrivateInputHarness();
 h.fields[0].mounted=false;
 h.fields[0].input('Stale textarea attached to unrelated view');
 assert.equal(h.draft.note,'Before');
});
