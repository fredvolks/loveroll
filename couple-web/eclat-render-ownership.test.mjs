import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {previewEclatStatus} from './account-preview-mode.mjs';

// Verify the live renderEclat function rather than duplicating its privacy rules.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const begin=app.indexOf('function renderEclat(){');
const end=app.indexOf('function renderHome(){',begin);
assert.ok(begin>0&&end>begin,'renderEclat production implementation exists');
const source=app.slice(begin,end)+';renderEclat();';

function renderFixture(memberCount,{statusOverrides={},mode='real',eligible=false,music=false}={}){
 const status={active:true,access:true,coffret_id:1,chapter_number:1,variant_number:0,...statusOverrides};
 const history=[{coffret_id:1,private_note:'old couple content'}];
 const state={user:{id:'alice'},coupleId:'shared-duo',
  members:Array.from({length:memberCount},(_,i)=>({id:i?'bob':'alice'})),
  testMode:mode,testModeEligible:eligible,eclat:status,
  tab:'eclat',eclatMusic:music,eclatSelection:1,eclatMinutes:30,
  eclatDetails:false,eclatBrowse:false,eclatIntent:'all',
  eclatFinished:'private completed title',eclatHistory:history,
  eclatHistoryCouple:'shared-duo',eclatHistoryUserId:'alice',
  eclatHistoryError:false};
 const captured=[];let stops=0,notes=0,frames=0,moods=0;
 runInNewContext(source,{
  state,isSharedCoupleReady:(c,m)=>!!c&&Array.isArray(m)&&m.length===2,
  previewEclatStatus,eclatStage:()=>({mood:'romantique'}),
  eclatAudio:{setMood:()=>moods++,stop:()=>stops++},
  eclatHtml:payload=>{captured.push(payload);return '<eclat>';},
  eclatNoteState:()=>{notes++;return {note:'not-shared'};},
  frame:()=>frames++
 });
 return {state,status,history,payload:captured[0],stops,notes,frames,moods};
}

test('LR-026: revoked couple cannot display cached Éclat status, history or completed title',()=>{
 const f=renderFixture(1);
 assert.equal(f.payload.status,null);
 assert.equal(f.payload.coupleReady,false);
 assert.equal(f.payload.history.length,0);
 assert.equal(f.payload.finished,null);
 assert.equal(f.notes,0,'no private note can load while the couple is unavailable');
 assert.equal(f.frames,1);
});

test('LR-026: valid couple retains normal Éclat status, history and completion',()=>{
 const f=renderFixture(2);
 assert.equal(f.payload.status,f.status);
 assert.equal(f.payload.coupleReady,true);
 assert.equal(f.payload.history,f.history);
 assert.equal(f.payload.finished,'private completed title');
 assert.equal(f.notes,1);
 assert.equal(f.frames,1);
});


test('LR-026: revoked Éclat access never loads private notes or sets audio mood',()=>{
 const f=renderFixture(2,{statusOverrides:{access:false},music:true});
 assert.equal(f.payload.status,f.status);
 assert.equal(f.payload.status.active,true,'reproduces stale active status');
 assert.equal(f.payload.status.access,false);
 assert.equal(f.notes,0,'no private note request without entitlement');
 assert.equal(f.moods,0,'no music mood without entitlement');
 assert.equal(f.stops,1,'previous audio is silenced');
 assert.equal(f.state.eclatMusic,false);
});

test('LR-026: member preview never loads private Éclat notes or plays music',()=>{
 const f=renderFixture(2,{mode:'member',eligible:true,music:true});
 assert.equal(f.payload.status.access,false);
 assert.equal(f.payload.status.active,false);
 assert.equal(f.notes,0);
 assert.equal(f.moods,0);
 assert.equal(f.stops,1);
});

test('LR-026: authorized active Éclat retains private notes and music mood',()=>{
 const f=renderFixture(2,{music:true});
 assert.equal(f.payload.status.access,true);
 assert.equal(f.notes,1);
 assert.equal(f.moods,1);
 assert.equal(f.stops,0);
});

const permissionBegin=app.indexOf('function canPlayEclat(){');
const permissionEnd=app.indexOf('function beginEclatAction(){',permissionBegin);
const actionBegin=app.indexOf(" if(verb==='eclat'){");
const actionEnd=app.indexOf(" if(verb==='referral-copy'",actionBegin);
assert.ok(permissionBegin>=0&&permissionEnd>permissionBegin,'production entitlement gate exists');
assert.ok(actionBegin>=0&&actionEnd>actionBegin,'production Éclat actions exist');
const actionSource=app.slice(permissionBegin,permissionEnd)+
 '\nlet latestEclatAudioOwner=null;\n'+
 "async function invoke(command){const verb='eclat',parts=command.split(':'),element=null;\n"+
 app.slice(actionBegin,actionEnd)+'\n}\n;invoke;';

function actionFixture(status,{mode='real',eligible=false,startAudio=null,saveNote=null,confirm=null,withDraft=false,rpcStatus=null,historyLoad=null}={}){
 const state={user:{id:'alice'},coupleId:'shared-duo',
  members:[{id:'alice'},{id:'bob'}],tab:'eclat',
  eclat:{coffret_id:1,chapter_number:1,chapter_index:1,chapter_total:6,variant_number:0,...status},
  eclatMusic:false,testMode:mode,testModeEligible:eligible,eclatMinutes:30};
 const calls=[],played=[],renders=[];let stops=0,confirms=0,notes=0;
 const context={
  state,authFeedbackGeneration:1,previewEclatStatus,
  isSharedCoupleReady:(id,members)=>id==='shared-duo'&&members?.length===2,
  ownsCoupleAsyncRead:(view,owner)=>view.user?.id===owner.userId&&view.coupleId===owner.coupleId,
  eclatNoteDrafts:withDraft?new Map([['note-key',{loading:false,error:false,moment_done:true}]]):new Map(),
  eclatNoteKey:()=> 'note-key',
  saveCurrentEclatNote:async()=>{notes++;return saveNote?await saveNote():'note-key';},
  beginEclatAction:()=>({}),ownsEclatAction:()=>true,
  applyEclatActionResult:value=>{if(rpcStatus)state.eclat={...state.eclat,...value};return true;},
  eclatStage:()=>({mood:'romantique',coffret:{title:'Coffret'}}),
  eclatAudio:{
   stop:()=>{stops++;},
   start:async mood=>{played.push(mood);return startAudio?await startAudio():true;}
  },
  document:{documentElement:{classList:{contains:()=>false}}},
  rpc:async name=>{calls.push(name);return rpcStatus||{access:true,active:true};},
  render:()=>renders.push('render'),
  refreshEclatHistory:async()=>{if(historyLoad)await historyLoad();},
  premiumConfirm:async()=>{confirms++;return confirm?await confirm():true;},
  notify:()=>{},
  root:{querySelector:()=>null},
  handle:async()=>{}
 };
 const invoke=runInNewContext(actionSource,context);
 return {state,invoke,calls,played,renders,stops:()=>stops,confirms:()=>confirms,notes:()=>notes};
}

test('LR-026: stale active status without access blocks every private Éclat command',async()=>{
 for(const command of ['note-retry','choose:0','next','end','music']){
  const h=actionFixture({access:false,active:true});
  if(['end','music'].includes(command))await h.invoke(command);
  else await assert.rejects(h.invoke(command),/Aucun coffret actif/);
  assert.deepEqual(h.calls,[],'no mutating RPC for '+command);
  assert.deepEqual(h.played,[],'no audio start for '+command);
  assert.equal(h.notes(),0,'no private note write for '+command);
  assert.equal(h.confirms(),0,'no exit confirmation for '+command);
 }
});

test('LR-026: member preview and missing user cannot invoke Éclat choices',async()=>{
 const preview=actionFixture({access:true,active:true},{mode:'member',eligible:true});
 await assert.rejects(preview.invoke('choose:0'),/Aucun coffret actif/);
 assert.deepEqual(preview.calls,[]);
 const unsigned=actionFixture({access:true,active:true});
 unsigned.state.user=null;
 await assert.rejects(unsigned.invoke('choose:0'),/Aucun coffret actif/);
 assert.deepEqual(unsigned.calls,[]);
});

test('LR-026: authorized Éclat commands still invoke their real RPC names',async()=>{
 for(const [command,name] of [['choose:0','love_eclat_choose'],
  ['next','love_eclat_next'],['end','love_eclat_end']]){
  const h=actionFixture({access:true,active:true});
  await h.invoke(command);
  assert.deepEqual(h.calls,[name]);
  assert.equal(h.renders.length,1);
 }
 const audio=actionFixture({access:true,active:true});
 await audio.invoke('music');
 assert.deepEqual(audio.played,['romantique']);
 assert.equal(audio.state.eclatMusic,true);
});

test('LR-026: audio that resumes after entitlement revocation is stopped',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve;});
 const h=actionFixture({access:true,active:true},{startAudio:()=>wait});
 const pending=h.invoke('music');
 assert.deepEqual(h.played,['romantique']);
 h.state.eclat={...h.state.eclat,access:false};
 release(true);
 await pending;
 assert.equal(h.stops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.deepEqual(h.renders,[],'stale audio success must not repaint');
});


test('LR-026: expired entitlement during private-note save cannot send choose RPC',async()=>{
 let finish;
 const pendingSave=new Promise(resolve=>{finish=resolve;});
 const h=actionFixture({access:true,active:true},{
  withDraft:true,saveNote:()=>pendingSave
 });
 const pending=h.invoke('choose:1');
 assert.equal(h.notes(),1,'note save starts while access is authorized');
 h.state.eclat={...h.state.eclat,access:false};
 finish('note-key');
 await pending;
 assert.deepEqual(h.calls,[],'a late note-save receipt cannot authorize a choice');
 assert.deepEqual(h.renders,[]);
});

test('LR-026: authorized choice after note-save still reaches the official RPC',async()=>{
 const h=actionFixture({access:true,active:true},{withDraft:true});
 await h.invoke('choose:1');
 assert.equal(h.notes(),1);
 assert.deepEqual(h.calls,['love_eclat_choose']);
 assert.equal(h.renders.length,1);
});

test('LR-026: revoking Éclat access during Quitter confirmation cannot send end RPC',async()=>{
 let finish;
 const decision=new Promise(resolve=>{finish=resolve;});
 const h=actionFixture({access:true,active:true},{confirm:()=>decision});
 const pending=h.invoke('end');
 assert.equal(h.confirms(),1,'confirmation was actually opened');
 h.state.eclat={...h.state.eclat,access:false};
 finish(true);
 await pending;
 assert.deepEqual(h.calls,[]);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: delayed audio from previous Éclat session cannot play in new coffret',async()=>{
 let finish;
 const pendingAudio=new Promise(resolve=>{finish=resolve;});
 const h=actionFixture({access:true,active:true,session_id:'coffret-old'},{
  startAudio:()=>pendingAudio
 });
 const pending=h.invoke('music');
 assert.deepEqual(h.played,['romantique']);
 h.state.eclat={...h.state.eclat,session_id:'coffret-new',coffret_id:2};
 finish(true);
 await pending;
 assert.equal(h.stops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: delayed audio is also cancelled when chapter changes',async()=>{
 let finish;
 const pendingAudio=new Promise(resolve=>{finish=resolve;});
 const h=actionFixture({access:true,active:true,session_id:'same-session'},{
  startAudio:()=>pendingAudio
 });
 const pending=h.invoke('music');
 h.state.eclat={...h.state.eclat,chapter_number:2};
 finish(true);
 await pending;
 assert.equal(h.stops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.deepEqual(h.renders,[]);
});


test('LR-026: final chapter with server-revoked access cannot recreate private ending',async()=>{
 const h=actionFixture({access:true,active:true,chapter_index:6,chapter_total:6},
  {rpcStatus:{access:false,active:false}});
 await h.invoke('next');
 assert.deepEqual(h.calls,['love_eclat_next']);
 assert.equal(h.state.eclatFinished,undefined,
  'a revoked entitlement cannot produce a private completed-coffret message');
 assert.equal(h.stops(),0,'revoked status handler owns soundtrack cleanup');
 assert.equal(h.renders.length,1,'render the no-access state');
});

test('LR-026: authorized last chapter still displays completed-coffret banner',async()=>{
 const h=actionFixture({access:true,active:true,chapter_index:6,chapter_total:6},
  {rpcStatus:{access:true,active:false}});
 await h.invoke('next');
 assert.deepEqual(h.calls,['love_eclat_next']);
 assert.equal(h.state.eclatFinished,'Coffret');
 assert.equal(h.stops(),1);
 assert.equal(h.renders.length,1);
});

test('LR-026: revocation during final history read cannot restore completion',async()=>{
 let resolveHistory,reads=0;
 const pendingHistory=new Promise(resolve=>{resolveHistory=resolve;});
 const h=actionFixture({access:true,active:true,chapter_index:6,chapter_total:6},
  {rpcStatus:{access:true,active:false},
   historyLoad:()=>{reads++;return pendingHistory;}});
 const finishing=h.invoke('next');
 assert.equal(reads,1,'the final history request must have started');
 h.state.eclat={...h.state.eclat,access:false};
 resolveHistory();
 await finishing;
 assert.equal(h.state.eclatFinished,undefined);
 assert.equal(h.stops(),0);
 assert.equal(h.renders.length,0,
  'a stale completion must not repaint revoked content');
});

test('LR-026: a new active coffret supersedes pending last-chapter completion',async()=>{
 let finishHistory;
 const pending=new Promise(resolve=>{finishHistory=resolve;});
 const h=actionFixture({access:true,active:true,chapter_index:6,chapter_total:6},
  {rpcStatus:{access:true,active:false},historyLoad:()=>pending});
 const finishing=h.invoke('next');
 h.state.eclat={...h.state.eclat,session_id:'new-coffret',active:true};
 finishHistory();
 await finishing;
 assert.equal(h.state.eclatFinished,undefined);
 assert.equal(h.stops(),0);
 assert.deepEqual(h.renders,[]);
});
