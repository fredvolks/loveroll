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
 assert.match(app,/completeTimedEveningChallenge\(\{challenge:item,userId,sessionId,rpc,query\}\)/);
 assert.match(app,/void reconcileSavedEveningTimers\(\)/);
 assert.match(app,/savedTimerScanAfter=Date\.now\(\)\+15000/);
});


test('LR-002 a reset after the real deadline cannot cancel automatic completion',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/if\(challengeTimer\.running&&challengeTimer\.deadline>0&&Date\.now\(\)>=challengeTimer\.deadline\)/);
 assert.match(source,/const autoComplete=!challengeTimer\.decisionPending&&isAcceptedTimedEveningChallenge\(item,state\.user\?\.id,state\.session\?\.id\)/);
 assert.match(source,/if\(!challengeTimer\.autoCompletePending\|\|challengeTimer\.decisionPending\|\|timerCompletionInFlight/);
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
