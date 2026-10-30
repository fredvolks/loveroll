import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {isAcceptedTimedEveningChallenge,isSameCompletedEveningChallenge,completeTimedEveningChallenge,timedEveningTimerControl} from './timed-evening-completion.mjs';
const card={id:'card-a',recipient:'alice',session_id:'session-a',status:'accepted'};
test('Only accepted, recipient-owned Soirée cards qualify; unrelated timers never count',()=>{
 assert.equal(isAcceptedTimedEveningChallenge(card,'alice','session-a'),true);
 for(const bad of [
  {...card,status:'proposed'},{...card,status:'passed'},{...card,status:'completed'},
  {...card,session_id:'different'},{...card,recipient:'bob'},
  {id:'advent-2026-12-01'},{id:'monthly-2026-10'},null
 ])assert.equal(isAcceptedTimedEveningChallenge(bad,'alice','session-a'),false);
});
test('00:00 validates once via RPC and checks the shared board',async()=>{
 const calls=[];
 const rpc=async(name,args)=>{
  calls.push({name,args});
  if(name==='my_love_evening_board')return {finished:false};
 };
 const result=await completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc,query:async()=>[]});
 assert.deepEqual(result,{outcome:'completed',finished:false});
 assert.equal(calls[0].name,'answer_challenge');
 assert.deepEqual(calls[0].args,{p_id:'card-a',p_status:'completed'});
 assert.equal(calls[1].name,'my_love_evening_board');
 assert.equal(calls.length,2);
});
test('Completes shared Soirée only if server board is finished',async()=>{
 const calls=[];
 const rpc=async name=>{calls.push(name);if(name==='my_love_evening_board')return {finished:true};};
 const result=await completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc,query:async()=>[]});
 assert.deepEqual(result,{outcome:'completed',finished:true});
 assert.deepEqual(calls,['answer_challenge','my_love_evening_board','finish_couple_session']);
});
test('Concurrent device completion is idempotent; passed challenge is not silently completed',async()=>{
 const rpc=async name=>{
  if(name==='answer_challenge')throw Error('Défi déjà terminé');
  if(name==='my_love_evening_board')return {finished:false};
 };
 const check=async name=>name==='couple_challenges'?[{...card,status:'completed'}]:[];
 const result=await completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc,query:check});
 assert.equal(result.outcome,'already-completed');
 await assert.rejects(completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc,query:async()=>[{status:'passed'}]}),/Défi déjà terminé/);
});
test('An offline/server failure remains a failure, never a fake completed challenge',async()=>{
 await assert.rejects(completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc:async()=>{throw Error('offline');},
  query:async()=>{throw Error('offline');}}),/offline/);
});
test('The real app retains an expiry retry and no double-validation on reload',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/autoCompletePending:challengeTimer\.autoCompletePending/);
 assert.match(source,/retryExpiredTimedEvening\(\)/);
 assert.match(source,/isAcceptedTimedEveningChallenge\(item,state\.user\?\.id,state\.session\?\.id\)/);
 assert.match(source,/timerCompletionRetryAt=Date\.now\(\)\+15000/);
 assert.match(source,/p_status:'accepted'/);
});


test('LR-002 reload restoration scans saved challenge timers without opening the card',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/function reconcileSavedEveningTimers\(\)/);
 assert.match(app,/sessionStorage\.getItem\(key\)/);
 assert.match(app,/localStorage\.getItem\(key\)/);
 assert.match(app,/localStorage\.setItem\(key,json\)/);
 assert.match(app,/writeSavedChallengeTimer\(key,expired\)/);
 assert.match(app,/saved\.deadline<=now/);
 assert.match(app,/saved\.autoCompletePending/);
 assert.match(app,/isAcceptedTimedEveningChallenge\(item,state\.user\.id,state\.session\.id\)/);
 assert.equal((app.match(/ownsRequest:\(\)=>state\.timerCompletionContext===context/g)||[]).length,2);
 assert.match(app,/void reconcileSavedEveningTimers\(\)/);
 assert.match(app,/savedTimerScanAfter=Date\.now\(\)\+15000/);
});


test('LR-002 a reset after the real deadline cannot cancel automatic completion',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/if\(challengeTimer\.running&&challengeTimer\.deadline>0&&Date\.now\(\)>=challengeTimer\.deadline\)/);
 assert.match(source,/const autoComplete=!challengeTimer\.decisionPending&&isAcceptedTimedEveningChallenge\(item,state\.user\?\.id,state\.session\?\.id\)/);
 assert.match(source,/if\(!challengeTimer\.autoCompletePending\|\|challengeTimer\.decisionPending\|\|\s*!state\.user\|\|!state\.session\)return;/);
 assert.match(source,/if\(timerCompletionInFlight&&ownsTimerCompletionSession\(timerCompletionInFlight\)\)return;/);
 assert.match(source,/if\(\['completed','passed','refused'\]\.includes\(item\.status\)\)/);
 assert.match(source,/Validation automatique du défi en cours/);
 assert.doesNotMatch(source,/À vous de décider si le défi continue/);
});



test('LR-002 handles pause immediately after expiry before changing running state',()=>{
 const src=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=src.indexOf("if(verb==='timer-toggle')");
 const finish=src.indexOf("if(verb==='give-challenge')",start);
 assert.ok(start>=0&&finish>start);
 const block=src.slice(start,finish);
 assert.ok(block.indexOf('updateChallengeClock();')<block.indexOf('if(challengeTimer.running)'));
 assert.ok(block.indexOf('if(challengeTimer.autoCompletePending)')<block.indexOf('if(challengeTimer.running)'));
 assert.match(block,/validation automatique en cours/);
});



test('LR-002 rejects false idempotency across different sessions or partners',async()=>{
 const completed={...card,status:'completed'};
 assert.equal(isSameCompletedEveningChallenge(card,completed,'alice','session-a'),true);
 for(const wrong of [
  {...completed,recipient:'bob'},
  {...completed,session_id:'session-b'},
  {...completed,id:'card-b'},
  {...completed,status:'passed'},
  {...completed,status:'refused'},
  {status:'completed'},
  null
 ]){
  assert.equal(isSameCompletedEveningChallenge(card,wrong,'alice','session-a'),false);
  const calls=[];
  await assert.rejects(completeTimedEveningChallenge({challenge:card,userId:'alice',
   sessionId:'session-a',rpc:async name=>{calls.push(name);throw Error('Accès refusé');},
   query:async name=>name==='couple_challenges'?[wrong]:[]}),/Accès refusé/);
  assert.deepEqual(calls,['answer_challenge'],'A rejected completion must not close a different soirée');
 }
});

test('LR-002 countdown renders one truthful, actionable control at every phase',()=>{
 const base={durationMs:240000,remainingMs:240000,running:false,autoCompletePending:false};
 assert.deepEqual(timedEveningTimerControl(base),{
  label:'▶ Démarrer',status:'À votre rythme',disabled:false,resetDisabled:false
 });
 assert.deepEqual(timedEveningTimerControl({...base,remainingMs:100000}),{
  label:'▶ Reprendre',status:'À votre rythme',disabled:false,resetDisabled:false
 });
 assert.deepEqual(timedEveningTimerControl({...base,running:true}),{
  label:'Ⅱ Pause',status:'En cours',disabled:false,resetDisabled:false
 });
 assert.deepEqual(timedEveningTimerControl({...base,remainingMs:0}),{
  label:'♡ Terminé',status:'Terminé',disabled:true,resetDisabled:false
 });
 assert.deepEqual(timedEveningTimerControl({...base,remainingMs:0,autoCompletePending:true}),{
  label:'♡ Validation en cours',status:'Validation du défi en cours',
  disabled:true,resetDisabled:true
 });
 assert.equal(timedEveningTimerControl({...base,remainingMs:-1}).disabled,true);
});

test('LR-026 pending D100 decision locks both timer buttons, without changing time',()=>{
 const base={durationMs:240000,remainingMs:120000,deadline:240000,
  running:true,decisionPending:true,autoCompletePending:false};
 assert.deepEqual(timedEveningTimerControl(base),{
  label:'♡ Réponse en cours',status:'Décision sur le défi en cours',
  disabled:true,resetDisabled:true
 });
 assert.equal(base.running,true);
 assert.equal(base.remainingMs,120000);
 assert.equal(timedEveningTimerControl({...base,running:false}).resetDisabled,true);
 assert.equal(timedEveningTimerControl({...base,decisionPending:false}).resetDisabled,false);
 assert.equal(timedEveningTimerControl({...base,autoCompletePending:true}).status,
  'Validation du défi en cours');
});

test('LR-026 timer locks only the active owner/card and never the next account',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const begin=app.indexOf('function isVisibleEveningTimerActionPending(){');
 const end=app.indexOf('function clockMs(){',begin);
 assert.ok(begin>0&&end>begin);
 const state={user:{id:'A'},session:{id:'s1'},tab:'session',
  redrawBusyContext:null,eveningStartContext:null,timerStartContext:null};
 const timer={id:'card-A',decisionPending:false};
 const owned=(id,u,s)=>timer.id===id&&u==='A'&&s==='s1'&&
  state.user?.id===u&&state.session?.id===s;
 const same=(view,c)=>view.user?.id===c?.userId&&
  view.session?.id===c?.sessionId&&view.tab===c?.tab;
 const guards=runInNewContext(app.slice(begin,end)+
  ';({busy:isVisibleEveningTimerActionPending,protect:protectEveningTimerPresentation});',{
  state,challengeTimer:timer,ownsVisibleEveningTimer:owned,
  isActiveEveningRedrawPending:()=>!!state.redrawBusyContext,
  isSameEveningResponseContext:same
 });
 assert.equal(guards.busy(),false);
 for(const key of ['redrawBusyContext','eveningStartContext','timerStartContext']){
  state[key]={userId:'A',sessionId:'s1',tab:'session',challengeId:'card-A'};
  assert.equal(guards.busy(),true,key+' must block the owned card');
  const view={label:'▶ Reprendre',status:'En cours',disabled:false,resetDisabled:false};
  guards.protect(view);
  assert.equal(view.disabled,true);
  assert.equal(view.resetDisabled,true);
  assert.match(view.label,/Réponse en cours/);
  state[key].challengeId='other-card';
  assert.equal(guards.busy(),false,'another card cannot lock the timer');
  state[key]=null;
 }
 timer.decisionPending=true;
 assert.equal(guards.busy(),true);
 timer.autoCompletePending=true;
 const completedView={label:'♡ Validation en cours',status:'Validation du défi en cours',
  disabled:true,resetDisabled:true};
 guards.protect(completedView);
 assert.equal(completedView.status,'Validation du défi en cours',
  'server completion must take precedence over pending redraw UI');
 timer.autoCompletePending=false;
 state.user={id:'B'};
 assert.equal(guards.busy(),false,'the previous owner cannot block B');
});

test('LR-026 real reset handler ignores pending clicks before any timer mutation',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf("if(verb==='timer-reset')");
 const end=app.indexOf("if(verb==='timer-toggle')",start);
 assert.ok(start>0&&end>start);
 const reset=app.slice(start,end);
 assert.ok(reset.indexOf('if(isVisibleEveningTimerActionPending())return;')<
  reset.indexOf('challengeTimer.running=false;'));
 const execute=(busy)=>{
  const timer={id:'c1',running:true,deadline:Date.now()+50000,
   remainingMs:50000,durationMs:120000,notified:true,autoCompletePending:false};
  let saves=0,updates=0;
  runInNewContext('(function(verb){'+reset+'})("timer-reset");',{
   state:{user:{id:'A'},session:{id:'s1'}},challengeTimer:timer,
   ownsVisibleEveningTimer:()=>true,isVisibleEveningTimerActionPending:()=>busy,
   saveChallengeTimer:()=>saves++,updateChallengeClock:()=>updates++,
   endSignal:()=>{throw Error('not expired');},
   notify:()=>{throw Error('unexpected notification');}
  });
  return {timer,saves,updates};
 };
 const pending=execute(true);
 assert.equal(pending.timer.running,true);
 assert.equal(pending.timer.deadline>0,true);
 assert.equal(pending.timer.remainingMs,50000);
 assert.equal(pending.saves,0);
 assert.equal(pending.updates,0);
 const released=execute(false);
 assert.equal(released.timer.running,false);
 assert.equal(released.timer.deadline,0);
 assert.equal(released.timer.remainingMs,120000);
 assert.equal(released.saves,1);
 assert.equal(released.updates,1);
 const updateStart=app.indexOf('function updateChallengeClock(){');
 const updateEnd=app.indexOf('setInterval(updateChallengeClock,500)',updateStart);
 const renderStart=app.indexOf('function timerWidget(challenge,minutes){');
 const renderEnd=app.indexOf('function renderLegacySession()',renderStart);
 assert.match(app.slice(updateStart,updateEnd),/protectEveningTimerPresentation\(presentation\)/);
 assert.match(app.slice(renderStart,renderEnd),/protectEveningTimerPresentation\(presentation\)/);
 assert.match(app.slice(end,end+1400),/isVisibleEveningTimerActionPending\(\)/);
});

test('LR-002 live countdown and rerender cannot revive an inert Reprendre button',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('function updateChallengeClock(){');
 const end=app.indexOf('setInterval(updateChallengeClock,500)',start);
 const clock=app.slice(start,end);
 assert.match(clock,/timedEveningTimerControl\(challengeTimer\)/);
 assert.match(clock,/button\.disabled=presentation\.disabled/);
 assert.match(clock,/reset\.disabled=presentation\.resetDisabled/);
 assert.match(clock,/status\.textContent=presentation\.status/);
 const renderStart=app.indexOf('function timerWidget(challenge,minutes){');
 const renderEnd=app.indexOf('function renderLegacySession()',renderStart);
 const render=app.slice(renderStart,renderEnd);
 assert.match(render,/const presentation=timedEveningTimerControl\(challengeTimer\)/);
 assert.match(render,/presentation\.disabled\?' disabled aria-disabled="true"'/);
 assert.match(render,/presentation\.resetDisabled\?' disabled aria-disabled="true"'/);
 assert.match(render,/presentation\.label/);
});

test('LR-026 async completion ignores a result after switching account or evening',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',start);
 assert.ok(start>0&&end>start);
 const executable=source.slice(start,end)+'; retryExpiredTimedEvening;';
 for(const moved of ['account','session','tab','couple']){
  let release;
  const server=new Promise(resolve=>{release=resolve;});
  const state={user:{id:'alice'},session:{id:'s1'},coupleId:'couple-1',
   tab:'session',timerCompletionContext:null,showEveningChallenges:true,
   selectedEveningChallengeId:'card-1'};
  const challengeTimer={id:'card-1',autoCompletePending:true,decisionPending:false};
  const counters={refresh:0,render:0,notify:0,saves:0};
  const retry=runInNewContext(executable,{
   state,challengeTimer,timerCompletionInFlight:null,timerCompletionRetryAt:0,
   timedEveningItem:()=>({id:'card-1',status:'accepted',recipient:'alice',session_id:'s1'}),
   isAcceptedTimedEveningChallenge:()=>true,rpc:async()=>null,query:async()=>[],
   completeTimedEveningChallenge:async()=>{await server;return {outcome:'completed',finished:true};},
   ownsVisibleEveningTimer:(id,u,s)=>state.user?.id===u&&state.session?.id===s,
   saveChallengeTimer:()=>counters.saves++,
   refreshShared:async()=>{counters.refresh++;return true;},
   render:()=>counters.render++,notify:()=>counters.notify++,
   console,document:{hidden:false},Date
  });
  const pending=retry();
  assert.ok(state.timerCompletionContext,'each RPC must acquire a scoped owner');
  if(moved==='account')state.user={id:'bob'};
  if(moved==='session')state.session={id:'s2'};
  if(moved==='tab')state.tab='home';
  if(moved==='couple')state.coupleId='couple-2';
  release();
  await pending;
  assert.deepEqual(counters,{refresh:0,render:0,notify:0,saves:moved==='tab'?2:0},
   moved+' must not modify the now-visible user interface');
  assert.equal(challengeTimer.autoCompletePending,true,
   'a changed tab or identity cannot clear pending until scoped refresh confirms');
  assert.equal(state.timerCompletionContext,null);
 }
});

test('LR-026 async completion refreshes only the confirmed original session',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',start);
 const executable=source.slice(start,end)+'; retryExpiredTimedEvening;';
 for(const closure of [false,true]){
  const state={user:{id:'alice'},session:{id:'s1'},coupleId:'couple-1',
   tab:'session',timerCompletionContext:null,showEveningChallenges:true,
   selectedEveningChallengeId:'card-1'};
  const challengeTimer={id:'card-1',autoCompletePending:true,decisionPending:false};
  const outputs={renders:0,notifications:[],refreshes:[],saves:0};
  const retry=runInNewContext(executable,{
   state,challengeTimer,timerCompletionInFlight:null,timerCompletionRetryAt:0,
   timedEveningItem:()=>({id:'card-1',status:'accepted',recipient:'alice',session_id:'s1'}),
   isAcceptedTimedEveningChallenge:()=>true,rpc:async()=>null,query:async()=>[],
   completeTimedEveningChallenge:async()=>({outcome:'completed',finished:closure}),
   ownsVisibleEveningTimer:(id,u,s)=>id==='card-1'&&u==='alice'&&s==='s1',
   saveChallengeTimer:()=>outputs.saves++,
   refreshShared:async context=>{
    outputs.refreshes.push({...context});
    if(closure)state.session=null;
    return true;
   },
   render:()=>outputs.renders++,
   notify:message=>outputs.notifications.push(message),
   console,document:{hidden:false},Date
  });
  await retry();
  assert.equal(outputs.refreshes.length,1);
  assert.deepEqual(outputs.refreshes[0],{
   userId:'alice',sessionId:'s1',coupleId:'couple-1',tab:'session',challengeId:'card-1'
  });
  assert.equal(challengeTimer.autoCompletePending,false);
  assert.equal(outputs.renders,1);
  assert.deepEqual(outputs.notifications,['♡ Défi accompli ♥']);
  assert.equal(state.timerCompletionContext,null);
  assert.equal(state.showEveningChallenges,!closure);
  assert.equal(state.selectedEveningChallengeId,closure?null:'card-1');
 }
});

test('LR-026 a late scoped refresh cannot paint a replaced account or night',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',start);
 const executable=source.slice(start,end)+'; retryExpiredTimedEvening;';
 for(const moved of ['account','session','server-rejected']){
  let releaseRefresh;
  const refreshWait=new Promise(resolve=>{releaseRefresh=resolve;});
  const state={user:{id:'alice'},session:{id:'s1'},coupleId:'couple-1',
   tab:'session',timerCompletionContext:null,showEveningChallenges:true,
   selectedEveningChallengeId:'card-1'};
  let refreshed=0,rendered=0,notified=0;
  const retry=runInNewContext(executable,{
   state,challengeTimer:{id:'card-1',autoCompletePending:true,decisionPending:false},
   timerCompletionInFlight:null,timerCompletionRetryAt:0,
   timedEveningItem:()=>({id:'card-1',status:'accepted',recipient:'alice',session_id:'s1'}),
   isAcceptedTimedEveningChallenge:()=>true,rpc:async()=>null,query:async()=>[],
   completeTimedEveningChallenge:async()=>({outcome:'completed',finished:true}),
   ownsVisibleEveningTimer:()=>true,saveChallengeTimer:()=>{},
   refreshShared:async()=>{refreshed++;await refreshWait;return moved!=='server-rejected';},
   render:()=>rendered++,notify:()=>notified++,console,document:{hidden:false},Date
  });
  const pending=retry();
  for(let tick=0;tick<5&&refreshed===0;tick++)await Promise.resolve();
  assert.equal(refreshed,1);
  if(moved==='account')state.user={id:'bob'};
  if(moved==='session')state.session={id:'new-evening'};
  releaseRefresh();
  await pending;
  assert.equal(rendered,0);
  assert.equal(notified,0);
 }
});

test('LR-026 saved timer recovery uses same request ownership and cleans its lock',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const begin=app.indexOf('async function reconcileSavedEveningTimers(){');
 const end=app.indexOf('function endSignal(){',begin);
 assert.ok(begin>0&&end>begin);
 const recovery=app.slice(begin,end);
 assert.match(recovery,/state\.timerCompletionContext=context;/);
 assert.match(recovery,/await refreshConfirmedTimedEvening\(context\)/);
 assert.match(recovery,/if\(state\.timerCompletionContext===context\)state\.timerCompletionContext=null;/);
 assert.doesNotMatch(recovery,/await refreshAndShow\(\)/);
 const syncBegin=app.indexOf('async function refreshShared(expectedContext=null){');
 const syncEnd=app.indexOf('const liveSync=createCoupleLiveSync',syncBegin);
 const refresh=app.slice(syncBegin,syncEnd);
 assert.match(refresh,/state\.timerCompletionContext===expectedContext/);
 assert.match(refresh,/return true; \/\/ A caller may render only after the scoped refresh really finished/);
});

test('LR-026 restored timer completion persists only its original private key',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('function endSignal(){',start);
 assert.ok(start>0&&end>start);
 const executable=source.slice(start,end)+'; reconcileSavedEveningTimers;';
 for(const moved of ['account','session','couple','tab']){
  let release;
  const server=new Promise(resolve=>{release=resolve;});
  const state={user:{id:'alice'},session:{id:'s1'},coupleId:'couple-1',tab:'session',
   timerCompletionContext:null,challenges:[{id:'card-1',recipient:'alice',
    session_id:'s1',status:'accepted'}]};
  const clock={id:'card-1',ownerUserId:'alice',ownerSessionId:'s1',
   autoCompletePending:false,decisionPending:false,running:false,remainingMs:1000};
  const stored={ownerUserId:'alice',ownerSessionId:'s1',cardId:'card-1',
   deadline:Date.now()-10000,durationMs:60000,running:true,remainingMs:1000};
  const writes=[],notifications=[],events=[];
  const recover=runInNewContext(executable,{
   state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:0,
   readSavedChallengeTimer:()=>stored,
   ownedSavedEveningTimerSnapshot:(saved,id,u,s)=>
    saved.cardId===id&&saved.ownerUserId===u&&saved.ownerSessionId===s?saved:null,
   writeSavedChallengeTimer:(key,value)=>writes.push({key,value}),
   isAcceptedTimedEveningChallenge:()=>true,
   completeTimedEveningChallenge:async()=>{await server;return {outcome:'completed',finished:true};},
   ownsVisibleEveningTimer:(id,u,s)=>clock.id===id&&state.user?.id===u&&state.session?.id===s,
   saveChallengeTimer:()=>events.push('saved-visible'),
   refreshShared:async()=>{events.push('refresh');return true;},
   render:()=>events.push('render'),notify:msg=>notifications.push(msg),
   rpc:async()=>null,query:async()=>[],console,document:{hidden:false},Date
  });
  const pending=recover();
  assert.equal(writes.length,1,'expired private timer is marked pending before server RPC');
  assert.ok(state.timerCompletionContext,'the original owner is captured');
  if(moved==='account')state.user={id:'bob'};
  if(moved==='session')state.session={id:'s2'};
  if(moved==='couple')state.coupleId='couple-2';
  if(moved==='tab')state.tab='home';
  release();
  await pending;
  assert.equal(writes.length,3,'unconfirmed refresh restores original timer receipt');
  assert.deepEqual(writes.map(entry=>entry.key),Array(3).fill(
   'loveroll-challenge-clock:alice:card-1'));
  assert.equal(writes[0].value.autoCompletePending,true);
  assert.equal(writes[1].value.autoCompletePending,false,
   'server completion is recorded before attempted refresh');
  assert.equal(writes[2].value.autoCompletePending,true,
   'without confirmed recipient-only refresh, original receipt stays retryable');
  assert.ok(!events.includes('refresh')&&!events.includes('render'));
  assert.deepEqual(notifications,[]);
  assert.equal(state.timerCompletionContext,null);
  if(moved==='tab')assert.deepEqual(events,['saved-visible','saved-visible'],
   'same owner and evening may persist retry state without changing the page');
  else assert.deepEqual(events,[]);
 }
});

test('LR-026 changed authentication interrupts completion after accepted answer',async()=>{
 const calls=[];
 let owns=true;
 const rpc=async name=>{
  calls.push(name);
  if(name==='answer_challenge')owns=false;
  return {finished:true};
 };
 const result=await completeTimedEveningChallenge({
  challenge:card,userId:'alice',sessionId:'session-a',rpc,
  query:async()=>{throw Error('Cross-account SELECT must not be issued');},
  ownsRequest:()=>owns
 });
 assert.deepEqual(result,{outcome:'superseded',finished:false});
 assert.deepEqual(calls,['answer_challenge'],
  'new account must never receive the old evening board or finish RPC');
});

test('LR-026 a late board cannot close an evening after account switch',async()=>{
 const calls=[];
 let owns=true;
 const rpc=async name=>{
  calls.push(name);
  if(name==='my_love_evening_board'){owns=false;return {finished:true};}
 };
 const result=await completeTimedEveningChallenge({
  challenge:card,userId:'alice',sessionId:'session-a',rpc,
  query:async()=>{throw Error('Unexpected SELECT');},ownsRequest:()=>owns
 });
 assert.deepEqual(result,{outcome:'superseded',finished:false});
 assert.deepEqual(calls,['answer_challenge','my_love_evening_board']);
});

test('LR-026 authentication switch during RPC failure skips private recovery SELECT',async()=>{
 const calls=[];
 let owns=true;
 const rpc=async name=>{
  calls.push(name);owns=false;
  throw Error('A different account is now active');
 };
 const result=await completeTimedEveningChallenge({
  challenge:card,userId:'alice',sessionId:'session-a',rpc,
  query:async()=>{calls.push('SELECT');return [];},ownsRequest:()=>owns
 });
 assert.deepEqual(result,{outcome:'superseded',finished:false});
 assert.deepEqual(calls,['answer_challenge']);
});

test('LR-026 authentication switch during private recovery skips board and close',async()=>{
 const calls=[];
 let owns=true;
 const rpc=async name=>{calls.push(name);throw Error('already completed');};
 const query=async name=>{
  calls.push(name);owns=false;
  return [{...card,status:'completed'}];
 };
 const result=await completeTimedEveningChallenge({
  challenge:card,userId:'alice',sessionId:'session-a',rpc,query,
  ownsRequest:()=>owns
 });
 assert.deepEqual(result,{outcome:'superseded',finished:false});
 assert.deepEqual(calls,['answer_challenge','couple_challenges']);
});

test('LR-026 superseded timer leaves original pending receipt for later retry',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const first=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',first);
 assert.ok(first>0&&end>first);
 const code=source.slice(first,end)+'; retryExpiredTimedEvening;';
 const state={user:{id:'alice'},coupleId:'c1',session:{id:'s1'},tab:'session',
  timerCompletionContext:null};
 const timer={id:'card-1',autoCompletePending:true,decisionPending:false};
 const original={id:'card-1',recipient:'alice',session_id:'s1',status:'accepted'};
 const events=[];
 const retry=runInNewContext(code,{
  state,challengeTimer:timer,timerCompletionInFlight:null,timerCompletionRetryAt:0,
  timedEveningItem:()=>original,
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge,
  rpc:async name=>{events.push(name);if(name==='answer_challenge')state.user={id:'bob'};},
  query:async()=>{events.push('query');return [];},
  ownsVisibleEveningTimer:()=>true,
  saveChallengeTimer:()=>events.push('save'),
  refreshShared:async()=>{events.push('refresh');return true;},
  render:()=>events.push('render'),notify:()=>events.push('notify'),
  console,document:{hidden:false},Date
 });
 await retry();
 assert.deepEqual(events,['answer_challenge']);
 assert.equal(timer.autoCompletePending,true,'original timer stays retryable');
 assert.equal(state.timerCompletionContext,null,'the obsolete request lock is released');
});

test('LR-026 restored timer keeps a pending receipt after an account switch mid-RPC',async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('function ownsTimerCompletionSession(context){');
 const end=app.indexOf('function endSignal(){',start);
 assert.ok(start>0&&end>start);
 const state={user:{id:'alice'},session:{id:'session-a'},coupleId:'couple-1',
  tab:'session',timerCompletionContext:null,challenges:[card]};
 const clock={id:'card-a',ownerUserId:'alice',ownerSessionId:'session-a',
  autoCompletePending:false,decisionPending:false};
 const saved={cardId:'card-a',ownerUserId:'alice',ownerSessionId:'session-a',
  durationMs:60000,remainingMs:0,deadline:Date.now()-10000,running:true};
 const writes=[],calls=[];
 const recover=runInNewContext(app.slice(start,end)+'; reconcileSavedEveningTimers;',{
  state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:0,
  readSavedChallengeTimer:()=>saved,ownedSavedEveningTimerSnapshot:()=>saved,
  writeSavedChallengeTimer:(key,value)=>writes.push({key,value}),
  isAcceptedTimedEveningChallenge,completeTimedEveningChallenge,
  rpc:async name=>{
   calls.push(name);
   if(name==='answer_challenge')state.user={id:'bob'};
  },
  query:async name=>{calls.push('SELECT '+name);return [];},
  ownsVisibleEveningTimer:()=>false,
  saveChallengeTimer:()=>{throw Error('Must not save new account timer');},
  refreshShared:async()=>{throw Error('Must not refresh new account');},
  render:()=>{throw Error('Must not render new account');},
  notify:()=>{throw Error('Must not notify new account');},
  console,document:{hidden:false},Date
 });
 await recover();
 assert.deepEqual(calls,['answer_challenge'],
  'no board, finish, or private SELECT may use the new account');
 assert.equal(writes.length,1,'pending original timer remains saved for retry');
 assert.equal(writes[0].key,'loveroll-challenge-clock:alice:card-a');
 assert.equal(writes[0].value.autoCompletePending,true);
 assert.equal(state.timerCompletionContext,null);
});

test('LR-026 completed RPC holds timer controls locked until scoped refresh settles',async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const guardStart=app.indexOf('function isVisibleEveningTimerActionPending(){');
 const guardEnd=app.indexOf('function clockMs(){',guardStart);
 const completionStart=app.indexOf('function ownsTimerCompletionSession(context){');
 const completionEnd=app.indexOf('// LR-002: recover ALL due challenge timers',completionStart);
 assert.ok(guardStart>0&&guardEnd>guardStart&&completionStart>guardEnd);
 let releaseRefresh;
 const waitRefresh=new Promise(resolve=>{releaseRefresh=resolve;});
 let refreshCalls=0,saves=0,renderCount=0;
 const state={user:{id:'alice'},session:{id:'s1'},coupleId:'couple-1',
  tab:'session',timerCompletionContext:null,redrawBusyContext:null,
  eveningStartContext:null,timerStartContext:null};
 const timer={id:'card-1',ownerUserId:'alice',ownerSessionId:'s1',
  autoCompletePending:true,decisionPending:false,running:false,
  durationMs:60000,remainingMs:0,deadline:0,notified:true};
 const ownsVisible=(id,userId,sessionId)=>timer.id===id&&
  state.user?.id===userId&&state.session?.id===sessionId;
 const api=runInNewContext(
  app.slice(guardStart,guardEnd)+app.slice(completionStart,completionEnd)+
  '; ({retry:retryExpiredTimedEvening,busy:isVisibleEveningTimerActionPending,'+
  'protect:protectEveningTimerPresentation});',{
   state,challengeTimer:timer,timerCompletionInFlight:null,timerCompletionRetryAt:0,
   ownsVisibleEveningTimer:ownsVisible,isActiveEveningRedrawPending:()=>false,
   isSameEveningResponseContext:()=>true,
   timedEveningItem:()=>({id:'card-1',recipient:'alice',session_id:'s1',status:'accepted'}),
   isAcceptedTimedEveningChallenge:()=>true,
   completeTimedEveningChallenge:async()=>({outcome:'completed',finished:false}),
   rpc:async()=>{},query:async()=>[],saveChallengeTimer:()=>saves++,
   refreshShared:async()=>{refreshCalls++;await waitRefresh;return true;},
   render:()=>renderCount++,notify:()=>{},console,document:{hidden:false},Date
  });
 const work=api.retry();
 for(let n=0;n<8&&refreshCalls===0;n++)await Promise.resolve();
 assert.equal(refreshCalls,1,'the server confirmed completion before the UI refresh resolves');
 assert.equal(timer.autoCompletePending,false,'the timer is no longer marked pending locally');
 assert.equal(api.busy(),true,'reset remains locked while refresh is unresolved');
 const view={label:'▶ Recommencer',status:'À votre rythme',
  disabled:false,resetDisabled:false};
 api.protect(view);
 assert.equal(view.disabled,true);
 assert.equal(view.resetDisabled,true);
 assert.equal(view.status,'Validation du défi en cours');
 const resetStart=app.indexOf("if(verb==='timer-reset')");
 const resetEnd=app.indexOf("if(verb==='timer-toggle')",resetStart);
 const reset=runInNewContext('(function(verb){'+app.slice(resetStart,resetEnd)+'})',{
  state,challengeTimer:timer,ownsVisibleEveningTimer:ownsVisible,
  isVisibleEveningTimerActionPending:api.busy,
  saveChallengeTimer:()=>{throw Error('reset must not save during server sync');},
  updateChallengeClock:()=>{throw Error('reset must not repaint during server sync');},
  endSignal:()=>{},notify:()=>{},Date
 });
 reset('timer-reset');
 assert.equal(timer.remainingMs,0,'a pending refresh must not restart a completed challenge');
 assert.equal(saves,1,'only the original server-confirmed completion may persist');
 state.user={id:'bob'};
 assert.equal(api.busy(),false,'A completion lock cannot disable the next account');
 state.user={id:'alice'};
 releaseRefresh();
 await work;
 assert.equal(api.busy(),false,'the completion lock is released after settling');
 assert.equal(renderCount,1);
});

test('LR-026 unconfirmed refresh leaves the live expired timer retryable',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',start);
 assert.ok(start>0&&end>start);
 for(const response of ['unconfirmed','offline']){
  const state={user:{id:'alice'},session:{id:'s1'},coupleId:'c1',
   tab:'session',timerCompletionContext:null};
  const clock={id:'card-1',ownerUserId:'alice',ownerSessionId:'s1',
   autoCompletePending:true,decisionPending:false,remainingMs:0};
  let saves=0,notifications=0;
  const retry=runInNewContext(source.slice(start,end)+'; retryExpiredTimedEvening;',{
   state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:0,
   timedEveningItem:()=>({id:'card-1',recipient:'alice',session_id:'s1',status:'accepted'}),
   isAcceptedTimedEveningChallenge:()=>true,
   completeTimedEveningChallenge:async()=>({outcome:'completed',finished:false}),
   ownsVisibleEveningTimer:()=>true,saveChallengeTimer:()=>saves++,
   refreshShared:async()=>{
    if(response==='offline')throw Error('offline');
    return undefined;
   },
   rpc:async()=>{},query:async()=>[],render:()=>{},notify:()=>notifications++,
   console:{warn:()=>{}},document:{hidden:false},Date
  });
  await retry();
  assert.equal(clock.autoCompletePending,true,
   'failed '+response+' refresh cannot enable reset of a completed server card');
  assert.ok(saves>=1);
  assert.equal(state.timerCompletionContext,null);
  if(response==='unconfirmed')assert.equal(notifications,0);
 }
});

test('LR-026 unconfirmed saved-timer refresh retains the original pending receipt',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('function endSignal(){',start);
 assert.ok(start>0&&end>start);
 const item={id:'card-1',recipient:'alice',session_id:'s1',status:'accepted'};
 const state={user:{id:'alice'},session:{id:'s1'},coupleId:'c1',
  tab:'session',challenges:[item],timerCompletionContext:null};
 const clock={id:'other-card',autoCompletePending:false,decisionPending:false};
 const saved={cardId:'card-1',ownerUserId:'alice',ownerSessionId:'s1',
  running:true,durationMs:60000,remainingMs:0,deadline:Date.now()-5000};
 const writes=[];
 const recover=runInNewContext(source.slice(start,end)+'; reconcileSavedEveningTimers;',{
  state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:0,
  readSavedChallengeTimer:()=>saved,ownedSavedEveningTimerSnapshot:()=>saved,
  writeSavedChallengeTimer:(key,value)=>writes.push({key,value}),
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async()=>({outcome:'completed',finished:false}),
  ownsVisibleEveningTimer:()=>false,saveChallengeTimer:()=>{},
  refreshShared:async()=>undefined,rpc:async()=>{},query:async()=>[],
  render:()=>{throw Error('unconfirmed view must not render');},
  notify:()=>{throw Error('unconfirmed view must not announce completion');},
  console:{warn:()=>{}},document:{hidden:false},Date
 });
 await recover();
 assert.ok(writes.length>=2);
 assert.equal(writes.at(-1).key,'loveroll-challenge-clock:alice:card-1');
 assert.equal(writes.at(-1).value.autoCompletePending,true,
  'failed private sync must preserve the original timer for later reconciliation');
 assert.equal(state.timerCompletionContext,null);
});

test('LR-026 retry backoff belongs to its original account, couple and card',async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const begin=app.indexOf('function ownsTimerCompletionSession(context){');
 const end=app.indexOf('// LR-002: recover ALL due challenge timers',begin);
 assert.ok(begin>0&&end>begin);
 const run=(person,session,couple,retryOwner,cardId='card-1')=>{
  const state={user:{id:person},session:{id:session},coupleId:couple,
   tab:'session',timerCompletionContext:null,timerCompletionRetryOwner:retryOwner};
  const clock={id:cardId,autoCompletePending:true,decisionPending:false};
  const calls=[];
  const retry=runInNewContext(app.slice(begin,end)+'; retryExpiredTimedEvening;',{
   state,challengeTimer:clock,timerCompletionInFlight:null,
   timerCompletionRetryAt:Date.now()+60000,
   timedEveningItem:()=>({id:cardId,recipient:person,session_id:session,status:'accepted'}),
   isAcceptedTimedEveningChallenge:()=>true,
   completeTimedEveningChallenge:async()=>{calls.push('completion');return {outcome:'superseded',finished:false};},
   rpc:async()=>{},query:async()=>[],ownsVisibleEveningTimer:()=>false,
   saveChallengeTimer:()=>{},refreshShared:async()=>true,
   render:()=>{},notify:()=>{},console,document:{hidden:false},Date
  });
  return {retry,calls};
 };
 const owner=JSON.stringify(['alice','couple-1','s1','card-1']);
 const original=run('alice','s1','couple-1',owner);
 await original.retry();
 assert.deepEqual(original.calls,[],'original challenge still respects its own backoff');
 const nextAccount=run('bob','s2','couple-2',owner);
 await nextAccount.retry();
 assert.deepEqual(nextAccount.calls,['completion'],
  'Alice\'s offline timeout must never block Bob\'s eligible minuteur');
 const nextCard=run('alice','s2','couple-1',owner);
 await nextCard.retry();
 assert.deepEqual(nextCard.calls,['completion'],
  'another evening cannot inherit the old retry delay');
 const siblingCard=run('alice','s1','couple-1',owner,'card-2');
 await siblingCard.retry();
 assert.deepEqual(siblingCard.calls,['completion'],
  'a different card in the SAME evening must not inherit the original retry delay');
});

test("LR-026 an old account's in-flight completion never blocks or unlocks the new account",async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('function ownsTimerCompletionSession(context){');
 const end=app.indexOf('// LR-002: recover ALL due challenge timers',start);
 assert.ok(start>0&&end>start);
 let finishOld,finishNew;
 const oldNetwork=new Promise(resolve=>{finishOld=resolve;});
 const newNetwork=new Promise(resolve=>{finishNew=resolve;});
 const calls=[];
 const state={user:{id:'alice'},coupleId:'couple-A',session:{id:'s-A'},
  tab:'session',timerCompletionContext:null,timerCompletionRetryOwner:null};
 const clock={id:'card-A',autoCompletePending:true,decisionPending:false};
 const api=runInNewContext(app.slice(start,end)+
  '; ({retry:retryExpiredTimedEvening,inFlight:()=>timerCompletionInFlight});',{
  state,challengeTimer:clock,timerCompletionInFlight:null,
  timerCompletionRetryAt:0,timerCompletionRetryOwner:null,
  timedEveningItem:()=>({id:clock.id,recipient:state.user.id,
   session_id:state.session.id,status:'accepted'}),
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async ({challenge})=>{
   calls.push(challenge.id);
   await (challenge.id==='card-A'?oldNetwork:newNetwork);
   return {outcome:'superseded',finished:false};
  },
  rpc:async()=>{},query:async()=>[],ownsVisibleEveningTimer:()=>false,
  saveChallengeTimer:()=>{},refreshShared:async()=>true,
  render:()=>{},notify:()=>{},console,document:{hidden:false},Date
 });
 const first=api.retry();
 assert.deepEqual(calls,['card-A']);
 state.user={id:'bob'};state.coupleId='couple-B';state.session={id:'s-B'};
 clock.id='card-B';
 const second=api.retry();
 assert.deepEqual(calls,['card-A','card-B'],
  'a previous account waiting on the network cannot block the new timer');
 const newOwner=state.timerCompletionContext;
 assert.equal(newOwner.userId,'bob');
 finishOld();await first;
 assert.equal(state.timerCompletionContext,newOwner,
  'the old response cannot unlock the new account context');
 assert.equal(api.inFlight(),newOwner,
  'the old finally block cannot drop the new in-flight token');
 finishNew();await second;
 assert.equal(api.inFlight(),null);
 assert.equal(state.timerCompletionContext,null);
});

test("LR-026 previous account's saved timer scan cannot monopolize a new account",async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('function ownsTimerCompletionSession(context){');
 const end=app.indexOf('function endSignal(){',start);
 assert.ok(start>0&&end>start);
 let releaseOld,releaseNew;
 const oldServer=new Promise(resolve=>{releaseOld=resolve;});
 const newServer=new Promise(resolve=>{releaseNew=resolve;});
 const state={user:{id:'alice'},coupleId:'couple-A',session:{id:'s-A'},
  tab:'session',timerCompletionContext:null,challenges:[
   {id:'card-A',recipient:'alice',session_id:'s-A',status:'accepted'}]};
 const clock={id:'card-A',autoCompletePending:false,decisionPending:false};
 const writes=[],calls=[];
 const api=runInNewContext(app.slice(start,end)+
  '; ({recover:reconcileSavedEveningTimers,active:()=>timerCompletionInFlight,'+
  'saved:()=>savedTimerSyncInFlight});',{
  state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:0,
  readSavedChallengeTimer:key=>{
   const parts=key.split(':');
   return {cardId:parts.at(-1),ownerUserId:parts[1],
    ownerSessionId:state.session.id,durationMs:60000,
    deadline:Date.now()-2000,running:true,remainingMs:0};
  },
  ownedSavedEveningTimerSnapshot:saved=>saved,
  writeSavedChallengeTimer:(key,value)=>writes.push({key,value}),
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async({challenge})=>{
   calls.push(challenge.id);
   await (challenge.id==='card-A'?oldServer:newServer);
   return {outcome:'superseded',finished:false};
  },
  ownsVisibleEveningTimer:()=>false,saveChallengeTimer:()=>{},
  refreshShared:async()=>true,rpc:async()=>{},query:async()=>[],
  render:()=>{},notify:()=>{},console,document:{hidden:false},Date
 });
 const first=api.recover();
 assert.deepEqual(calls,['card-A']);
 state.user={id:'bob'};state.coupleId='couple-B';state.session={id:'s-B'};
 state.challenges=[{id:'card-B',recipient:'bob',session_id:'s-B',status:'accepted'}];
 clock.id='card-B';
 const second=api.recover();
 assert.deepEqual(calls,['card-A','card-B'],
  'the old pending RPC and its 4-second scan cooldown must not block the next account');
 const newer=state.timerCompletionContext;
 assert.equal(newer.challengeId,'card-B');
 releaseOld();await first;
 assert.equal(state.timerCompletionContext,newer);
 assert.equal(api.active(),newer);
 assert.equal(api.saved(),newer,'old scan may not release the new saved scan lock');
 releaseNew();await second;
 assert.equal(api.active(),null);
 assert.equal(api.saved(),null);
 assert.equal(state.timerCompletionContext,null);
 assert.deepEqual(writes.map(x=>x.key),[
  'loveroll-challenge-clock:alice:card-A',
  'loveroll-challenge-clock:bob:card-B'
 ]);
});

test("LR-026 stale successful completion must not clear another account's retry delay",async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',start);
 assert.ok(start>0&&end>start);
 let releaseOld;
 const pendingOld=new Promise(resolve=>{releaseOld=resolve;});
 const state={user:{id:'alice'},coupleId:'couple-A',session:{id:'session-A'},
  tab:'session',timerCompletionContext:null,timerCompletionRetryOwner:null};
 const timer={id:'card-A',autoCompletePending:true,decisionPending:false};
 const calls=[],notifications=[];
 const api=runInNewContext(source.slice(start,end)+
  '; ({retry:retryExpiredTimedEvening,backoff:()=>timerCompletionRetryAt});',{
  state,challengeTimer:timer,timerCompletionInFlight:null,timerCompletionRetryAt:0,
  timedEveningItem:()=>({id:timer.id,recipient:state.user.id,
   session_id:state.session.id,status:'accepted'}),
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async ({challenge})=>{
   calls.push(challenge.id);
   if(challenge.id==='card-A'){
    await pendingOld;
    return {outcome:'completed',finished:false};
   }
   throw Error('offline for Bob');
  },
  rpc:async()=>{},query:async()=>[],ownsVisibleEveningTimer:()=>false,
  saveChallengeTimer:()=>{},refreshShared:async()=>true,
  render:()=>{},notify:msg=>notifications.push(msg),
  console:{warn:()=>{}},document:{hidden:false},Date
 });
 const oldRun=api.retry();
 assert.deepEqual(calls,['card-A']);
 state.user={id:'bob'};state.coupleId='couple-B';state.session={id:'session-B'};
 timer.id='card-B';
 const newRun=api.retry();
 await newRun;
 const bobOwner=JSON.stringify(['bob','couple-B','session-B','card-B']);
 assert.equal(state.timerCompletionRetryOwner,bobOwner);
 const deadline=api.backoff();
 assert.ok(deadline>Date.now()+10000);
 releaseOld();
 await oldRun;
 assert.deepEqual(calls,['card-A','card-B']);
 assert.equal(state.timerCompletionRetryOwner,bobOwner,
  'Alice must not erase Bob\'s scheduled offline retry');
 assert.equal(api.backoff(),deadline,
  'Alice must not shorten Bob\'s pending backoff');
});

test("LR-026 an owned success clears its own expired retry delay",async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',start);
 assert.ok(start>0&&end>start);
 const owner=JSON.stringify(['alice','couple-A','session-A','card-A']);
 const state={user:{id:'alice'},coupleId:'couple-A',session:{id:'session-A'},
  tab:'session',timerCompletionContext:null,timerCompletionRetryOwner:owner};
 const clock={id:'card-A',autoCompletePending:true,decisionPending:false};
 const events=[];
 const api=runInNewContext(source.slice(start,end)+
  '; ({retry:retryExpiredTimedEvening,backoff:()=>timerCompletionRetryAt});',{
  state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:Date.now()-100,
  timedEveningItem:()=>({id:'card-A',recipient:'alice',session_id:'session-A',status:'accepted'}),
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async()=>({outcome:'completed',finished:false}),
  rpc:async()=>{},query:async()=>[],ownsVisibleEveningTimer:()=>true,
  saveChallengeTimer:()=>{},refreshShared:async()=>true,
  render:()=>events.push('render'),notify:()=>events.push('notify'),
  console:{warn:()=>{}},document:{hidden:false},Date
 });
 await api.retry();
 assert.equal(state.timerCompletionRetryOwner,null);
 assert.equal(api.backoff(),0);
 assert.deepEqual(events,['render','notify']);
 assert.equal(clock.autoCompletePending,false);
});

test("LR-026 an expiring D100 card disables pass refuse start and manual completion",async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const helper=app.indexOf('function isEveningCardCompleting(cardId){');
 const next=app.indexOf('function isVisibleEveningTimerActionPending(){',helper);
 assert.ok(helper>0&&next>helper,'one common per-card guard must exist');
 const state={user:{id:'alice'},session:{id:'s1'},coupleId:'c1',
  timerCompletionContext:null};
 const timer={id:'card-A',autoCompletePending:true};
 const completing=runInNewContext(app.slice(helper,next)+
  ';isEveningCardCompleting;',{
  state,challengeTimer:timer,
  ownsVisibleEveningTimer:(id,u,s)=>id==='card-A'&&u==='alice'&&s==='s1',
  ownsTimerCompletionSession:context=>state.user.id===context.userId&&
   state.session.id===context.sessionId&&state.coupleId===context.coupleId
 });
 assert.equal(completing('card-A'),true);
 assert.equal(completing('card-B'),false,'unrelated D100 card stays available');
 timer.autoCompletePending=false;
 state.timerCompletionContext={userId:'alice',coupleId:'c1',sessionId:'s1',
  tab:'session',challengeId:'card-A'};
 assert.equal(completing('card-A'),true,'RPC in progress also locks card A');
 assert.equal(completing('card-B'),false);
 state.user={id:'bob'};
 assert.equal(completing('card-A'),false,'Alice must not lock Bob');
 const passStart=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const passEnd=app.indexOf("if(verb==='evening-start')",passStart);
 const refuseStart=app.indexOf("if(verb==='evening-refuse'){");
 const refuseEnd=app.indexOf("if(verb==='evening-refuse-cancel')",refuseStart);
 const answerStart=app.indexOf("if(verb==='answer'){");
 const answerEnd=app.indexOf("if(verb==='finish-session')",answerStart);
 const startEnd=app.indexOf("if(verb==='surprise-activity')",passEnd);
 assert.ok(passStart>0&&passEnd>passStart&&refuseEnd>refuseStart&&
  answerEnd>answerStart&&startEnd>passEnd);
 for(const code of [app.slice(passStart,passEnd),app.slice(refuseStart,refuseEnd),
  app.slice(passEnd,startEnd),app.slice(answerStart,answerEnd)])
  assert.match(code,/isEveningCardCompleting\(/);
 const ui=app.slice(app.indexOf('const mineCards=session?'),answerStart);
 assert.match(ui,/isEveningCardCompleting\(view\.id\)/);
});

test("LR-026 real D100 handlers reject clicks while automatic completion is pending",async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const boundaries=[
  ['evening-refuse','evening-refuse-cancel','evening-refuse'],
  ["evening-pass'||verb==='evening-refuse-choice",'evening-start','evening-pass'],
  ['evening-start','surprise-activity','evening-start'],
  ['answer','finish-session','answer']
 ];
 for(const [startName,endName,verb] of boundaries){
  const start=app.indexOf("if(verb==='"+startName+"')");
  const end=app.indexOf("if(verb==='"+endName+"')",start+1);
  assert.ok(start>0&&end>start,'find source handler for '+verb);
  const action=runInNewContext('(async function(verb,parts){'+
   app.slice(start,end)+'})',{
   state:{redrawReady:true,user:{id:'alice'},session:{id:'s1'}},
   isEveningCardCompleting:cardId=>cardId==='card-A',
   isActiveEveningRedrawPending:()=>false,
   rpc:async()=>{throw Error('Forbidden RPC while the timer is completing');}
  });
  await action(verb,['card-A','yes']);
 }
 const ui=app.slice(app.indexOf('const mineCards=session?'),
  app.indexOf("if(verb==='evening-refuse')"));
 for(const action of ['evening-start','evening-pass','evening-refuse','answer'])
  assert.match(ui,new RegExp("button\\('"+action+":'\\+view\\.id[\\s\\S]*?isEveningCardCompleting\\(view\\.id\\)"),
   'visible '+action+' button must disable for the completing card');
 assert.match(ui,/button\('evening-refuse-cancel','Annuler','class="subtle" '\+\(isActiveEveningRedrawPending\(\)\?'disabled':''\)/,
  'Cancel stays available so the player may dismiss the dialog');
});

test("LR-026 manual response takes priority over automatic timer completion",async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const first=source.indexOf('function isEveningCardCompleting(cardId){');
 const finish=source.indexOf('function clockMs(){',first);
 const begin=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('// LR-002: recover ALL due challenge timers',begin);
 assert.ok(first>0&&finish>first&&begin>finish&&end>begin);
 const state={user:{id:'alice'},coupleId:'couple-1',session:{id:'s1'},
  tab:'session',timerCompletionContext:null,
  legacyAnswerContext:{userId:'alice',sessionId:'s1',tab:'session',challengeId:'card-A'}};
 const clock={id:'card-A',ownerUserId:'alice',ownerSessionId:'s1',
  autoCompletePending:true,decisionPending:false,remainingMs:0};
 let completions=0;
 const context={
  state,challengeTimer:clock,timerCompletionInFlight:null,timerCompletionRetryAt:0,
  ownsVisibleEveningTimer:(id,u,s)=>id==='card-A'&&u==='alice'&&s==='s1',
  isSameEveningResponseContext:(view,request)=>view.user?.id===request?.userId&&
   view.session?.id===request?.sessionId&&view.tab===request?.tab,
  isActiveEveningRedrawPending:()=>false,
  timedEveningItem:()=>({id:'card-A',recipient:'alice',session_id:'s1',status:'accepted'}),
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async()=>{completions++;return {outcome:'completed',finished:false};},
  rpc:async()=>{},query:async()=>[],saveChallengeTimer:()=>{},
  refreshShared:async()=>true,render:()=>{},notify:()=>{},
  console,document:{hidden:false},Date
 };
 const guard=runInNewContext(source.slice(first,finish)+
  '; ({busy:isEveningCardCompleting,controls:isVisibleEveningTimerActionPending});',context);
 const retry=runInNewContext(source.slice(begin,end)+'; retryExpiredTimedEvening;',context);
 assert.equal(guard.busy('card-A'),true,'manual decision must lock the same D100 card');
 assert.equal(guard.controls(),true,'reset and pause stay disabled during manual reply');
 assert.equal(guard.busy('card-B'),false,'another card remains independent');
 // Switching tabs must not release the same authenticated account's manual
 // RPC: the HTTP response is still outstanding even when its UI is hidden.
 state.tab='special';clock.autoCompletePending=false;
 assert.equal(guard.busy('card-A'),true,'manual card stays locked on another tab');
 assert.equal(guard.controls(),true,'hidden manual RPC keeps pause/reset locked');
 clock.autoCompletePending=true;
 await retry();
 assert.equal(completions,0,'a tab switch cannot start duplicate auto-completion');
 state.tab='session';
 assert.equal(clock.autoCompletePending,true,'expired timer waits for manual reply');
 state.legacyAnswerContext=null;
 assert.equal(guard.busy('card-A'),true,'expired timer remains locked until validated');
 await retry();
 assert.equal(completions,1,'automatic retry resumes after manual request settles');
});

test('LR-026 saved timers skip only the card with an active manual answer',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const first=source.indexOf('function ownsTimerCompletionSession(context){');
 const end=source.indexOf('function endSignal(){',first);
 assert.ok(first>0&&end>first);
 const state={user:{id:'alice'},coupleId:'c1',session:{id:'s1'},tab:'session',
  legacyAnswerContext:{userId:'alice',sessionId:'s1',tab:'session',challengeId:'card-A'},
  timerCompletionContext:null,challenges:[
   {id:'card-A',recipient:'alice',session_id:'s1',status:'accepted'},
   {id:'card-B',recipient:'alice',session_id:'s1',status:'accepted'}]};
 const calls=[],pendingWrites=[];
 // A hidden manual response still owns card A after navigating away.
 state.tab='settings';
 const api=runInNewContext(source.slice(first,end)+'; reconcileSavedEveningTimers;',{
  state,challengeTimer:{id:'card-A',autoCompletePending:true,decisionPending:false},
  timerCompletionInFlight:null,timerCompletionRetryAt:0,
  readSavedChallengeTimer:key=>({cardId:key.split(':').at(-1),ownerUserId:'alice',
   ownerSessionId:'s1',running:true,deadline:Date.now()-2000,durationMs:60000}),
  ownedSavedEveningTimerSnapshot:saved=>saved,
  writeSavedChallengeTimer:(key,saved)=>pendingWrites.push({key,saved}),
  isSameEveningResponseContext:(view,request)=>view.user.id===request?.userId&&
   view.session.id===request?.sessionId&&view.tab===request?.tab,
  isAcceptedTimedEveningChallenge:()=>true,
  completeTimedEveningChallenge:async({challenge})=>{
   calls.push(challenge.id);return {outcome:'superseded',finished:false};
  },
  ownsVisibleEveningTimer:(id)=>id==='card-A',
  saveChallengeTimer:()=>{},refreshShared:async()=>true,rpc:async()=>{},
  query:async()=>[],render:()=>{},notify:()=>{},console,document:{hidden:false},Date
 });
 await api();
 assert.deepEqual(calls,['card-B'],
  'automatic recovery skips manually answered card A, not unrelated B');
 assert.ok(pendingWrites.every(x=>x.key.endsWith(':card-B')));
});

test("LR-026 real manual answer handler retains card and couple ownership during RPC",async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const first=app.indexOf("if(verb==='answer'){");
 const end=app.indexOf("if(verb==='finish-session')",first);
 assert.ok(first>0&&end>first);
 let release;
 const pendingRpc=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},session:{id:'s1'},coupleId:'couple-1',
  tab:'session',legacyAnswerContext:null,challenges:[
   {id:'card-A',recipient:'alice',session_id:'s1',status:'accepted'}]};
 const calls=[],paint=[];
 const answer=runInNewContext('(async function(verb,parts){'+app.slice(first,end)+'})',{
  state,isEveningCardCompleting:()=>false,
  ownEveningChallenges:rows=>rows,
  isSameEveningResponseContext:(v,c)=>v.user?.id===c?.userId&&
   v.session?.id===c?.sessionId&&v.tab===c?.tab,
  rpc:async name=>{calls.push(name);await pendingRpc;},
  query:async()=>{throw Error('old response must not query under another tab');},
  ownsVisibleEveningTimer:()=>false,refreshShared:async()=>{paint.push('refresh');},
  render:()=>paint.push('render'),saveChallengeTimer:()=>{},
  console,document:{hidden:false}
 });
 const task=answer('answer',['card-A','completed']);
 assert.deepEqual(calls,['answer_challenge']);
 assert.deepEqual({...state.legacyAnswerContext},{
  userId:'alice',coupleId:'couple-1',sessionId:'s1',
  tab:'session',challengeId:'card-A'
 });
 state.tab='special';
 release();
 await task;
 assert.deepEqual(calls,['answer_challenge']);
 assert.deepEqual(paint,[]);
 assert.equal(state.legacyAnswerContext,null);
});

test('LR-026 manual D100 answer immediately renders busy state and restores controls after failed RPC',async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf("if(verb==='answer'){");
 const end=app.indexOf("if(verb==='finish-session')",start);
 assert.ok(start>0&&end>start);
 let fail;
 const pending=new Promise((_,reject)=>{fail=reject;});
 const state={user:{id:'alice'},session:{id:'s1'},coupleId:'c1',tab:'session',
  legacyAnswerContext:null,showEveningChallenges:true,
  challenges:[{id:'card-A',recipient:'alice',session_id:'s1',status:'accepted'}]};
 const rendered=[],calls=[];
 const handler=runInNewContext('(async function(verb,parts){'+app.slice(start,end)+'})',{
  state,isEveningCardCompleting:()=>false,
  ownEveningChallenges:r=>r,
  isSameEveningResponseContext:(v,c)=>v.user?.id===c?.userId&&
   v.session?.id===c?.sessionId&&v.tab===c?.tab,
  rpc:async name=>{calls.push(name);return pending;},
  query:async()=>[],ownsVisibleEveningTimer:()=>false,
  refreshShared:async()=>true,render:()=>rendered.push(
   state.legacyAnswerContext?.challengeId||'idle'),
  saveChallengeTimer:()=>{},notify:()=>{},
  console,document:{hidden:false}
 });
 const operation=handler('answer',['card-A','completed']);
 assert.deepEqual(calls,['answer_challenge']);
 assert.deepEqual(rendered,['card-A'],
  'the same card must render busy state before the RPC response');
 fail(Error('network unavailable'));
 await assert.rejects(operation,/network unavailable/);
 assert.equal(state.legacyAnswerContext,null);
 assert.deepEqual(rendered,['card-A','idle'],
  'failed answer must immediately restore usable controls');
});

test('LR-026 manual D100 completion cannot render an unconfirmed scoped refresh',async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf("if(verb==='answer'){");
 const end=app.indexOf("if(verb==='finish-session')",start);
 assert.ok(start>0&&end>start);
 const state={user:{id:'alice'},session:{id:'s1'},coupleId:'c1',
  tab:'session',legacyAnswerContext:null,
  challenges:[{id:'card-A',recipient:'alice',session_id:'s1',status:'accepted'}]};
 const renders=[],notices=[],calls=[];
 const handler=runInNewContext('(async function(verb,parts){'+app.slice(start,end)+'})',{
  state,isEveningCardCompleting:()=>false,
  ownEveningChallenges:r=>r,
  isSameEveningResponseContext:(v,c)=>v.user?.id===c?.userId&&
   v.session?.id===c?.sessionId&&v.tab===c?.tab,
  rpc:async name=>{calls.push(name);return {finished:false};},
  query:async()=>[],ownsVisibleEveningTimer:()=>false,
  refreshShared:async()=>undefined,
  render:()=>renders.push(state.legacyAnswerContext?.challengeId||'idle'),
  notify:message=>notices.push(message),saveChallengeTimer:()=>{},
  console,document:{hidden:false}
 });
 await handler('answer',['card-A','completed']);
 assert.deepEqual(calls,['answer_challenge','my_love_evening_board']);
 assert.deepEqual(renders,['card-A','idle'],
  'no success render may follow an unconfirmed authoritative refresh');
 assert.ok(notices.some(message=>/actualis|confirm|connexion/i.test(message)),
  'give a truthful action to recover from an unconfirmed refresh');
 assert.equal(state.legacyAnswerContext,null);
});

test('LR-026 D100 manual completion shows accessible disabled busy label',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const queue=source.slice(source.indexOf('const mineCards=session?'),
  source.indexOf('function renderLegacySession(){'));
 assert.match(queue,/isEveningCardCompleting\(view\.id\)\?'♡ Réponse en cours':'✓ Défi réalisé'/);
 assert.match(queue,/aria-busy="true"/);
});
