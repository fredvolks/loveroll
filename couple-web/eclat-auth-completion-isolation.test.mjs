import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the actual account transition; Éclat's completion notice must
// never be inherited from a different logged-in identity/couple.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf('function adoptAuthenticatedIdentity(nextUser){');
const end=app.indexOf('async function refreshVerifiedIdentity(){',start);
assert.ok(start>0&&end>start,'production account transition is available');
const source=app.slice(start,end)+
 ';({adoptAuthenticatedIdentity,generation:()=>authFeedbackGeneration})';

function harness(previousId='alice'){
 const state={
  user:previousId?{id:previousId}:null,
  coupleId:'former-couple',tab:'eclat',members:[{id:'alice'},{id:'partner'}],
  eclat:{active:true,session_id:'former-session'},
  eclatFinished:'Former couple completion',
  eclatHistoryError:true,eclatHistory:[{id:'former-private-history'}],
  eclatHistoryCouple:'former-couple',eclatHistoryUserId:previousId,
  eclatMusic:true
 };
 let audioStops=0,timerSaves=0;
 const fn=runInNewContext(source,{
  state,authFeedbackGeneration:1,realtimeReconnectTimer:null,
  eclatNoteDrafts:new Map([['former',{note:'private'}]]),
  eclatAudio:{stop:()=>{audioStops++;}},
  client:{removeChannel:async()=>{}},
  challengeTimer:{running:false,ownerUserId:previousId},
  saveChallengeTimer:()=>{timerSaves++;},
  clearTimeout:()=>{}
 });
 return {state,...fn,audioStops:()=>audioStops,timerSaves:()=>timerSaves};
}

test('LR-026: different account cannot inherit an Éclat completed banner or history error',()=>{
 const h=harness();
 assert.equal(h.adoptAuthenticatedIdentity({id:'bob'}),true);
 assert.equal(h.state.user.id,'bob');
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclatHistoryError,false);
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.equal(h.generation(),2);
 assert.equal(h.state.tab,'home');
});

test('LR-026: sign-out also clears Éclat completion state before another login',()=>{
 const h=harness();
 assert.equal(h.adoptAuthenticatedIdentity(null),true);
 assert.equal(h.state.user,null);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclatHistoryError,false);
 assert.equal(h.state.coupleId,null);
 assert.equal(h.timerSaves(),1);
});

test('LR-026: unchanged identity retains current completion notice',()=>{
 const h=harness();
 assert.equal(h.adoptAuthenticatedIdentity({id:'alice'}),false);
 assert.equal(h.state.eclatFinished,'Former couple completion');
 assert.equal(h.state.eclatHistoryError,true);
 assert.equal(h.state.eclatHistory.length,1);
 assert.equal(h.audioStops(),0);
 assert.equal(h.generation(),1);
});
