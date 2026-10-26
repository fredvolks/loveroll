import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAcceptedTimedEveningChallenge,completeTimedEveningChallenge} from './timed-evening-completion.mjs';
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
 const check=async name=>name==='couple_challenges'?[{status:'completed'}]:[];
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
 assert.match(source,/const autoComplete=isAcceptedTimedEveningChallenge\(item,state\.user\?\.id,state\.session\?\.id\)/);
 assert.match(source,/Validation automatique du défi en cours/);
 assert.doesNotMatch(source,/À vous de décider si le défi continue/);
});

