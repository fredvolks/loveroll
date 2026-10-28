import test from 'node:test';
import assert from 'node:assert/strict';
import {studioTestProgress,studioEclatOverview,studioTestReport} from './studio-test-progress.mjs';

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


test('shareable QA report uses nine official milestones and twelve real coffret states only',()=>{
 const status={ready:true,
  seats:[{seat:'A',user_id:'private-user-id-do-not-leak'}],
  audit:[{synthetic_email:'never-print@example.invalid'}],
  game:{weekly_face:2,monthly_face:76,personal_faces:{A:4,B:5},
   session:'open',challenges_total:1,eclat_enabled:true,
   eclat_completed_coffrets:[5],
   eclat_active:{coffret_id:2,minutes:60,chapter_index:3,chapter_total:8},
   challenge_preview:[{description:'PRIVATE CARD MUST NOT LEAK',title:'PRIVATE TITLE'}],
   access_token:'never_print_this_token'}
 };
 const report=studioTestReport(status,new Set(['A','B']),coffrets);
 assert.match(report,/Jalons officiels : 9\/9/);
 assert.match(report,/Éclat · 1\/12 coffrets terminés/);
 assert.match(report,/02 · Coffret 2 : En cours · étape 3\/8 · 60 min/);
 assert.match(report,/05 · Coffret 5 : Terminé/);
 assert.match(report,/03 · Coffret 3 : Non vérifié/);
 assert.match(report,/Tests Auth sur préproduction et essais physiques : À CONFIRMER/);
 for(const privateText of ['private-user-id','never-print@example.invalid',
  'PRIVATE CARD','PRIVATE TITLE','never_print_this_token'])
  assert.ok(!report.includes(privateText),'no private value is copied: '+privateText);
 assert.equal(report.split('\n').filter(x=>/^\d{2} · /.test(x)).length,12);
});

test('reports never falsely claim completion when diagnostics are missing',()=>{
 const report=studioTestReport({ready:false,game:{
  weekly_face:1,eclat_completed_coffrets:[1,2],
  eclat_active:{coffret_id:3,minutes:90,chapter_index:6,chapter_total:8}
 }},new Set(['A','B']),coffrets);
 assert.match(report,/Jalons officiels : 0\/9/);
 assert.match(report,/Éclat · 0\/12 coffrets terminés/);
 assert.doesNotMatch(report,/ : Terminé| : En cours/);
});
