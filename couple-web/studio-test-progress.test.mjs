import test from 'node:test';
import assert from 'node:assert/strict';
import {studioTestProgress,studioEclatOverview} from './studio-test-progress.mjs';

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


const coffrets=Array.from({length:12},(_,i)=>({id:i+1,title:'Coffret '+(i+1)}));

test('Éclat QA shows actual active chapter, duration and previously completed coffrets',()=>{
 const state={ready:true,game:{
  eclat_completed_coffrets:[2,7,2,9],
  eclat_active:{coffret_id:7,chapter_index:3,chapter_total:6,minutes:60}
 }};
 const result=studioEclatOverview(state,coffrets);
 assert.equal(result.verified,3,'a replayed coffret remains in completed history');
 assert.equal(result.activeId,7);
 assert.equal(result.rows.length,12);
 assert.deepEqual(result.rows[6],{
  id:7,title:'Coffret 7',state:'active',chapter:3,chapterTotal:6,minutes:60
 });
 assert.equal(result.rows[1].state,'verified');
 assert.equal(result.rows[8].state,'verified');
 assert.equal(result.rows[0].state,'pending');
});

test('Éclat QA refuses to invent progress from stale, invalid or failed server reads',()=>{
 const denied=[
  {ready:false,game:{eclat_completed_coffrets:[1],
   eclat_active:{coffret_id:2,chapter_index:1,chapter_total:4,minutes:30}}},
  {ready:true,game:{error:'database unavailable',
   eclat_completed_coffrets:[1],eclat_active:{coffret_id:2}}},
  {ready:true,game:{eclat_completed_coffrets:[0,13,3.5,'1'],
   eclat_active:{coffret_id:19,chapter_index:1}}}
 ];
 for(const state of denied){
  const result=studioEclatOverview(state,coffrets);
  assert.equal(result.verified,0);
  assert.equal(result.activeId,null);
  assert.ok(result.rows.every(x=>x.state==='pending'));
 }
 const impossible=studioEclatOverview({ready:true,game:{
  eclat_active:{coffret_id:2,chapter_index:99,chapter_total:4,minutes:999}
 }},coffrets);
 assert.equal(impossible.activeId,2);
 assert.equal(impossible.rows[1].state,'active');
 assert.equal(impossible.rows[1].chapter,null);
 assert.equal(impossible.rows[1].minutes,null);
});
