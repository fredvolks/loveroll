import test from 'node:test';
import assert from 'node:assert/strict';
import {studioTestProgress} from './studio-test-progress.mjs';

test('real server roll data completes every supported milestone',()=>{
 const state={ready:true,game:{
  weekly_face:4,monthly_face:72,personal_faces:{A:2,B:6},
  session:'open',challenges_total:1,eclat_enabled:true
 }};
 const progress=studioTestProgress(state,new Set(['A','B']));
 assert.equal(progress.total,9);
 assert.equal(progress.completed,9);
 assert.ok(progress.steps.every(s=>s.done));
});

test('only live Auth events can mark independent accounts connected',()=>{
 const state={ready:true,game:{}};
 const one=studioTestProgress(state,new Set(['A']));
 assert.equal(one.steps.find(s=>s.key==='auth').done,false);
 const both=studioTestProgress(state,new Set(['A','B']));
 assert.equal(both.steps.find(s=>s.key==='auth').done,true);
});

test('missing backend diagnostics and invented values never pass',()=>{
 assert.equal(studioTestProgress({ready:true,game:{error:'database unavailable',
  challenges_total:3,weekly_face:1,monthly_face:100,eclat_enabled:true}},new Set()).completed,1,
  'failed server read must never mark game milestones as complete');
 for(const game of [null,{error:'read failure'},{weekly_face:7,
  monthly_face:101,personal_faces:{A:0,B:-1},
  session:'not_started',challenges_total:0,eclat_enabled:false}]){
  const data=studioTestProgress({ready:true,game},new Set());
  assert.equal(data.completed,1,'only registered pair can pass without real game state');
 }
 assert.equal(studioTestProgress({ready:false},new Set(['A','B'])).completed,0,
  'stale A/B connection evidence cannot validate a deleted test pair');
});
