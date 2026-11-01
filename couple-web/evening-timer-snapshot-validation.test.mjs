import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownedSavedEveningTimerSnapshot} from './evening-private-queue.mjs';

const id='card-123',user='alice',session='evening-123';
const valid={
 cardId:id,ownerUserId:user,ownerSessionId:session,
 durationMs:240000,remainingMs:90000,deadline:1790000000000,
 running:true,notified:false,autoCompletePending:false
};

test('LR-026 restores valid owned timer, including legacy untagged timer',()=>{
 assert.equal(ownedSavedEveningTimerSnapshot(valid,id,user,session),valid);
 const {cardId,ownerUserId,ownerSessionId,...legacy}=valid;
 assert.equal(ownedSavedEveningTimerSnapshot(legacy,id,user,session),legacy);
 assert.equal(ownedSavedEveningTimerSnapshot({durationMs:240000},id,user,session)?.durationMs,240000,
  'legacy optional clock fields can be absent');
 assert.equal(ownedSavedEveningTimerSnapshot({...valid,remainingMs:0,deadline:0,
  running:false,autoCompletePending:true},id,user,session)?.autoCompletePending,true,
  'a genuine pending server acknowledgement must survive a reload');
 assert.equal(ownedSavedEveningTimerSnapshot(valid,id,'bob',session),null);
 assert.equal(ownedSavedEveningTimerSnapshot(valid,id,user,'other-evening'),null);
});

test('LR-026 never converts malformed persisted flags into server actions',()=>{
 for(const key of ['running','notified','autoCompletePending']){
  for(const value of ['true','false',1,0,null,{},[]]){
   const corrupt={...valid,[key]:value};
   assert.equal(ownedSavedEveningTimerSnapshot(corrupt,id,user,session),null,
    key+' must be a real boolean, not '+JSON.stringify(value));
  }
 }
});

test('LR-026 ignores malformed countdowns rather than treating them as expired',()=>{
 for(const key of ['remainingMs','deadline']){
  for(const value of [-1,NaN,Infinity,-Infinity,null,'0',{},[]]){
   const corrupt={...valid,[key]:value};
   assert.equal(ownedSavedEveningTimerSnapshot(corrupt,id,user,session),null,
    key+' rejected: '+String(value));
  }
 }
 assert.equal(ownedSavedEveningTimerSnapshot({...valid,remainingMs:240001},id,user,session),null,
  'remaining time cannot exceed the configured duration');
 assert.equal(ownedSavedEveningTimerSnapshot({...valid,remainingMs:240000},id,user,session)?.remainingMs,240000);
});

test('LR-026 both UI restoration and background expiry scanner validate snapshot before use',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const restoration=app.slice(app.indexOf('function activeTimer(challenge,minutes){'),
  app.indexOf('function ownsVisibleEveningTimer('));
 const background=app.slice(app.indexOf('async function reconcileSavedEveningTimers(){'),
  app.indexOf('function endSignal(){'));
 assert.match(restoration,/ownedSavedEveningTimerSnapshot\(/);
 assert.match(background,/ownedSavedEveningTimerSnapshot\(/);
 assert.match(background,/if\(!saved\)continue;/);
});
