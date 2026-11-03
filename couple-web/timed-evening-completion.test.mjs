import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAcceptedTimedEveningChallenge,isSameCompletedEveningChallenge,completeTimedEveningChallenge,timedEveningTimerControl,refreshAfterTimedEveningConfirmation,timerBelongsToUser,canControlTimedEveningChallenge} from './timed-evening-completion.mjs';
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
 assert.match(source,/if\(\['passed','refused'\]\.includes\(item\.status\)\)/);
 assert.match(source,/isSameCompletedEveningChallenge\(item,item,state\.user\.id,state\.session\.id\)/,
  'A server-confirmed card may still need its last Soirée board synchronization');
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

test('LR-002 running countdown cannot revive Pause from a stale snapshot without a deadline',()=>{
 const timer={durationMs:240000,remainingMs:120000,running:true,autoCompletePending:false};
 for(const deadline of [0,null,undefined,NaN,Infinity,-Infinity,'invalid']){
  const presentation=timedEveningTimerControl({...timer,deadline});
  assert.equal(presentation.label,'♡ Terminé',String(deadline));
  assert.equal(presentation.disabled,true,String(deadline));
  assert.equal(presentation.status,'Terminé',String(deadline));
 }
 // A deliberately paused clock is different: it has no running deadline
 // and must retain its genuine remaining duration and Reprendre action.
 assert.equal(timedEveningTimerControl({...timer,running:false,deadline:0}).label,'▶ Reprendre');
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

test('LR-002 server-confirmed timed challenge remains completed when the screen refresh fails',async()=>{
 let tries=0;
 assert.equal(await refreshAfterTimedEveningConfirmation(async()=>{tries++;}),true);
 assert.equal(await refreshAfterTimedEveningConfirmation(async()=>{tries++;throw Error('offline after save');}),false);
 assert.equal(tries,2,'Refresh is attempted only once; helper never re-submits completion');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('async function retryExpiredTimedEvening(){');
 const end=app.indexOf('function endSignal(){',start);
 const timers=app.slice(start,end);
 assert.equal((timers.match(/await refreshConfirmedTimedEvening\(\)/g)||[]).length,2,
  'Active timer and reload recovery use the same safe refresh');
 assert.doesNotMatch(timers,/await refreshAndShow\(\)/,
  'Post-save display refresh must not be caught as a failed server write');
 assert.match(app,/Défi accompli sur le serveur\. L’affichage n’a pas pu être actualisé/);
 assert.match(app,/const updated=await refreshAfterTimedEveningConfirmation\(refreshAndShow\)/);
});

test('LR-002 timers belong only to the account which opened the challenge',()=>{
 const timer={id:'same-card',ownerUserId:'alice'};
 assert.equal(timerBelongsToUser(timer,'alice'),true);
 assert.equal(timerBelongsToUser(timer,'bob'),false);
 assert.equal(timerBelongsToUser(timer,null),false);
 assert.equal(timerBelongsToUser({id:'same-card'},'alice'),false);
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/challengeTimer\.ownerUserId!==ownerId/);
 assert.match(source,/challengeTimer\.ownerUserId=ownerId/);
 assert.match(source,/if\(!timerBelongsToUser\(challengeTimer,state\.user\?\.id\)\)return;/);
 assert.match(source,/if\(!state\.user\?\.id\)return;/);
 assert.match(source,/challengeTimer\.decisionPending=false;/);
 // Neither the old timer's saved key nor its pending confirmation can ever
 // be written/sent as the new account merely because the card ID is reused.
 const save=source.slice(source.indexOf('function saveChallengeTimer(){'),source.indexOf('function activeTimer('));
 assert.ok(save.indexOf('timerBelongsToUser')<save.indexOf('writeSavedChallengeTimer'));
 const retry=source.slice(source.indexOf('async function retryExpiredTimedEvening(){'),source.indexOf('async function reconcileSavedEveningTimers()'));
 assert.match(retry,/timerBelongsToUser\(challengeTimer,state\.user\?\.id\)/);
});

test('LR-002 stale card or account cannot reset or restart a timed Soirée challenge',()=>{
 const owner={id:'a',ownerUserId:'alice'};
 const open={id:'a',recipient:'alice',session_id:'evening',status:'proposed'};
 assert.equal(canControlTimedEveningChallenge(owner,open,'alice','evening'),true);
 assert.equal(canControlTimedEveningChallenge(owner,{...open,status:'accepted'},'alice','evening'),true);
 for(const card of [
  {...open,status:'completed'}, {...open,status:'passed'}, {...open,status:'refused'},
  {...open,recipient:'bob'}, {...open,session_id:'another'}, {...open,id:'b'},null
 ])assert.equal(canControlTimedEveningChallenge(owner,card,'alice','evening'),false);
 assert.equal(canControlTimedEveningChallenge(owner,open,'bob','evening'),false);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 for(const verb of ['timer-reset','timer-toggle']){
  const start=app.indexOf("if(verb==='"+verb+"')");
  const stop=app.indexOf("if(verb==='",start+5);
  const block=app.slice(start,stop);
  assert.ok(start>=0&&stop>start);
  assert.match(block,/canControlTimedEveningChallenge\(challengeTimer,timedEveningItem\(challengeTimer.id\)/);
 }
 const toggle=app.slice(app.indexOf("if(verb==='timer-toggle')"),app.indexOf("if(verb==='give-challenge')"));
 assert.equal((toggle.match(/canControlTimedEveningChallenge\(/g)||[]).length,2,
  'Revalidate after the asynchronous server acceptance or sound permission');
});

test('LR-002 rapid-tap accept is serialized and Reset cannot race the server acceptance',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/let timerActivationInFlight=false/);
 const reset=source.slice(source.indexOf("if(verb==='timer-reset')"),source.indexOf("if(verb==='timer-toggle')"));
 assert.match(reset,/if\(timerActivationInFlight\)/,
  'Reset cannot silently rewind a timer while the acceptance is pending');
 const start=source.indexOf("if(verb==='timer-toggle')"),stop=source.indexOf("if(verb==='give-challenge')",start);
 const toggle=source.slice(start,stop);
 assert.ok(start>=0&&stop>start);
 assert.match(toggle,/if\(timerActivationInFlight\)return/);
 assert.match(toggle,/timerActivationInFlight=true/);
 assert.match(toggle,/try\{/);
 assert.match(toggle,/finally\{/);
 assert.match(toggle,/timerActivationInFlight=false/);
 assert.ok(toggle.indexOf('timerActivationInFlight=true')<
  toggle.indexOf("await rpc('answer_challenge'"),
  'The first tap owns the lock BEFORE the async server write');
 assert.ok(toggle.indexOf('timerActivationInFlight=false')>
  toggle.indexOf('await rpc(\'answer_challenge\''),
  'Release lock only after the server callback resolves or rejects');
});

test('LR-002 board outage after saved completion reports the card as persisted, but retries session sync',async()=>{
 const calls=[];
 const rpc=async name=>{
  calls.push(name);
  if(name==='my_love_evening_board')throw Error('temporary board outage');
 };
 await assert.rejects(completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc,query:async()=>[]}),error=>{
  assert.equal(error.challengeCompletionConfirmed,true);
  assert.match(error.message,/Défi enregistré/);
  assert.match(error.cause.message,/temporary board outage/);
  return true;
 });
 assert.deepEqual(calls,['answer_challenge','my_love_evening_board'],
  'A stored card is not submitted twice in the same attempt');
 // Later retry uses the existing exact-identity idempotency guard.
 const confirmAgain=async name=>{
  if(name==='answer_challenge')throw Error('already saved');
  if(name==='my_love_evening_board')return {finished:true};
 };
 const result=await completeTimedEveningChallenge({challenge:card,userId:'alice',
  sessionId:'session-a',rpc:confirmAgain,
  query:async name=>name==='couple_challenges'?[{...card,status:'completed'}]:[]});
 assert.equal(result.outcome,'already-completed');
 assert.equal(result.finished,true);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.equal((app.match(/error\?\.challengeCompletionConfirmed===true/g)||[]).length,2,
  'Active and restored timers distinguish server save from board synchronization');
 assert.equal((app.match(/Synchronisation de Soirée en attente de connexion/g)||[]).length,2);
});

test('LR-002 a completed card can finish a pending Soirée board after app restart without re-answering',async()=>{
 const completed={...card,status:'completed'},calls=[];
 const rpc=async(name,args)=>{
  calls.push({name,args});
  if(name==='my_love_evening_board')return {finished:true};
 };
 const result=await completeTimedEveningChallenge({
  challenge:completed,userId:'alice',sessionId:'session-a',rpc,
  query:async()=>{throw Error('No challenge lookup needed for confirmed local server record');}
 });
 assert.deepEqual(result,{outcome:'already-completed',finished:true});
 assert.deepEqual(calls.map(x=>x.name),['my_love_evening_board','finish_couple_session'],
  'Resume only board and finish RPC: answer_challenge must not run again');
 for(const wrong of [{...completed,recipient:'bob'},
  {...completed,session_id:'other'}, {...completed,status:'passed'}]){
  const out=await completeTimedEveningChallenge({challenge:wrong,userId:'alice',
   sessionId:'session-a',rpc,query:async()=>[]});
  assert.equal(out.outcome,'ineligible');
 }
 assert.equal(calls.length,2,'Invalid partner/session cannot call any RPC');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const retry=app.slice(app.indexOf('async function retryExpiredTimedEvening(){'),
  app.indexOf('async function reconcileSavedEveningTimers()'));
 const recovery=app.slice(app.indexOf('async function reconcileSavedEveningTimers(){'),app.indexOf('function endSignal(){'));
 for(const code of [retry,recovery]){
  assert.match(code,/isSameCompletedEveningChallenge\(item,item,state\.user\.id,state\.session\.id\)/);
  assert.match(code,/completeTimedEveningChallenge\(\{challenge:item,userId,sessionId,rpc,query\}\)/);
 }
 assert.doesNotMatch(retry,/\['completed','passed','refused'\]/);
 assert.doesNotMatch(recovery,/\['completed','passed','refused'\]/);
});

test('LR-002 pending responses never mutate or display previous account timers after sign-out',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const retry=app.slice(app.indexOf('async function retryExpiredTimedEvening(){'),
  app.indexOf('async function reconcileSavedEveningTimers()'));
 const recovery=app.slice(app.indexOf('async function reconcileSavedEveningTimers(){'),app.indexOf('function endSignal(){'));
 assert.match(retry,/if\(timerBelongsToUser\(challengeTimer,userId\)&&challengeTimer\.id===id\)/);
 for(const section of [retry,recovery]){
  assert.match(section,/if\(state\.user\?\.id===userId&&state\.session\?\.id===sessionId&&!document\.hidden\)/,
   'An offline response for the previous account must not notify a newly signed-in user');
 }
});

test('LR-002 initial Soirée start blocks double acceptance and respects an acknowledged write',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf("if(verb==='evening-start')");
 const end=app.indexOf("if(verb==='surprise-activity')",start);
 assert.ok(start>=0&&end>start);
 const block=app.slice(start,end);
 assert.match(app,/let eveningStartInFlight=false/);
 assert.match(block,/if\(eveningStartInFlight\)return/);
 assert.match(block,/eveningStartInFlight=true/);
 assert.match(block,/finally\{eveningStartInFlight=false;\}/);
 assert.match(block,/picked\.status='accepted'/);
 assert.ok(block.indexOf("picked.status='accepted'")>block.indexOf("await rpc('answer_challenge'"));
 assert.match(block,/const refreshed=await refreshAfterConfirmedWrite\(refreshAndShow\)/);
 assert.match(block,/if\(state\.user\?\.id!==ownerId\|\|state\.session\?\.id!==sessionId\)return;/);
 assert.match(block,/isAcceptedTimedEveningChallenge\(challenge,ownerId,sessionId\)/);
 assert.match(block,/if\(active&&\['completed','passed','refused'\]\.includes\(active\.status\)\)return;/);
 assert.match(block,/Défi accepté sur le serveur/);
});

test('LR-002 a rendered 00:00 never offers Pause before the 500ms timer tick',()=>{
 const running={durationMs:120000,remainingMs:120000,running:true};
 const completed={label:'♡ Terminé',status:'Terminé',disabled:true,resetDisabled:false};
 for(const offset of [-1000,-15000]){
  assert.deepEqual(timedEveningTimerControl({...running,deadline:Date.now()+offset}),completed);
 }
 assert.deepEqual(timedEveningTimerControl({...running,deadline:Date.now()+60000}),{
  label:'Ⅱ Pause',status:'En cours',disabled:false,resetDisabled:false
 });
 assert.deepEqual(timedEveningTimerControl({...running,deadline:Date.now()-1000,autoCompletePending:true}),{
  label:'♡ Validation en cours',status:'Validation du défi en cours',
  disabled:true,resetDisabled:true
 });
});


test('LR-002: an error closing Soirée is idempotent only for a chronologically closed matching session',async()=>{
 const start='2026-11-03T19:00:00Z';
 const valid={id:'session-a',started_at:start,finished_at:'2026-11-03T20:00:00Z',counted:true};
 const rpc=async name=>{
  if(name==='my_love_evening_board')return {finished:true};
  if(name==='finish_couple_session')throw Error('closure RPC interrupted');
 };
 const complete=previous=>completeTimedEveningChallenge({
  challenge:card,userId:'alice',sessionId:'session-a',rpc,
  query:async(table,opts)=>{
   assert.equal(table,'couple_sessions');
   assert.deepEqual(opts,{eq:{id:'session-a'}});
   return previous?[previous]:[];
  }
 });
 assert.deepEqual(await complete(valid),{outcome:'completed',finished:true},
  'A session already closed by another device is a successful idempotent close');
 assert.deepEqual(await complete({...valid,
  started_at:'2026-11-03T19:00:00.123+00:00',
  finished_at:'2026-11-03T20:00:00.123+00:00'}),
  {outcome:'completed',finished:true},
  'PostgREST ISO timestamps with fractional seconds and a numeric offset remain valid');
 for(const [started_at,finished_at] of [
  ['2026-11-03T20:00:00.123100Z','2026-11-03T20:00:00.123456Z'],
  ['2026-11-03T20:00:00.123456Z','2026-11-03T20:00:00.123456Z'],
  ['2024-02-29T23:59:59.999998+01:00','2024-02-29T22:59:59.999999Z']
 ]){
  assert.deepEqual(await complete({...valid,started_at,finished_at}),
   {outcome:'completed',finished:true},
   'Microsecond and leap-day timestamps must retain chronological precision');
 }
 for(const previous of [
  null,
  {...valid,id:'session-b'},
  {...valid,counted:false},
  {...valid,counted:null},
  {...valid,counted:undefined},
  {...valid,counted:'true'},
  {...valid,started_at:'2026-11-03T20:00:00.123456Z',finished_at:'2026-11-03T20:00:00.123100Z'},
  {...valid,started_at:'2026-11-03T20:00:00.123456+01:00',finished_at:'2026-11-03T19:00:00.123455Z'},
  {...valid,started_at:null},
  {...valid,started_at:'invalid'},
  {...valid,finished_at:null},
  {...valid,finished_at:'invalid'},
  {...valid,started_at:'0'},
  {...valid,started_at:0},
  {...valid,started_at:'2026-02-31T19:00:00Z'},
  {...valid,started_at:'2026-02-29T19:00:00Z'},
  {...valid,started_at:'2026-04-31T19:00:00Z'},
  {...valid,started_at:'2026-00-03T19:00:00Z'},
  {...valid,finished_at:'2026-11-03T24:00:00Z'},
  {...valid,finished_at:'2026-11-03T20:61:00Z'},
  {...valid,finished_at:'2026-11-03'},
  {...valid,finished_at:'2026-11-03T20:00:00+14:30'},
  {...valid,finished_at:'2026-11-03T18:59:59Z'}
 ]){
  await assert.rejects(complete(previous),error=>{
   assert.equal(error.challengeCompletionConfirmed,true,
    'The challenge remains saved even when session synchronization fails');
   assert.match(error.message,/synchronisation de Soirée en attente/);
   assert.match(error.cause?.message??'',/closure RPC interrupted/);
   return true;
  });
 }
});
