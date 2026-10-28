import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECLAT_V2_EDITORIAL,ECLAT_V2_SOURCE_SHA} from './eclat-v2-editorial.mjs';
import {ECLAT_V2_DURATIONS,eclatV2Coffret,eclatV2Route,eclatV2Plan,
 eclatV2VariantForSessionNumber,eclatV2VersionFromHistory,eclatV2CreateDraft,
 eclatV2CurrentScene,eclatV2Transition,eclatV2MayReveal} from './eclat-v2-contract.mjs';
const manuscript=readFileSync(new URL('../docs/LOVEROLL_ECLAT_12_COFFRETS_SPEC.md',import.meta.url),'utf8');
const types=new Set(['Commun','Secret','Choix','Énigme','Minuteur','Finale']);

test('Editorial: all 12 approved coffrets, 96 actual scenes, 2 V0/V1 alternatives',()=>{
 assert.match(ECLAT_V2_SOURCE_SHA,/^[0-9a-f]{40}$/);
 assert.equal(ECLAT_V2_EDITORIAL.length,12);
 for(const [i,coffret] of ECLAT_V2_EDITORIAL.entries()){
  assert.equal(coffret.id,i+1);
  assert.ok(coffret.title.length>5);
  assert.ok(manuscript.includes(coffret.source),'Exact specification text must not be rewritten');
  assert.equal(coffret.scenes.length,8);
  assert.ok(coffret.tables.length>=1);
  for(const [j,scene] of coffret.scenes.entries()){
   assert.equal(scene.number,j+1);
   assert.ok(types.has(scene.type));
   assert.equal(scene.instructions.length,2);
   for(const text of scene.instructions){
    assert.ok(text.length>=12);
    assert.ok(coffret.source.includes(text),'Stage words must be from approved spec');
   }
  }
 }
 assert.equal(eclatV2Coffret(4).title,'Les portes de minuit');
 assert.throws(()=>eclatV2Coffret(13),RangeError);
});
test('Fixed approved 30 / 60 / 90 minute trajectories and indicative budgets',()=>{
 assert.deepEqual(ECLAT_V2_DURATIONS,[30,60,90]);
 const cases=[
  [30,[1,3,6,8],[5,8,12,5]],
  [60,[1,2,3,5,6,8],[5,8,12,12,15,8]],
  [90,[1,2,3,4,5,6,7,8],[5,10,15,10,15,15,10,10]]
 ];
 for(const [minutes,ids,budgets] of cases){
  const path=eclatV2Route(minutes);
  assert.deepEqual(path.map(x=>x.number),ids);
  assert.deepEqual(path.map(x=>x.budgetMinutes),budgets);
  assert.equal(budgets.reduce((a,b)=>a+b,0),minutes);
  for(let id=1;id<=12;id++)for(let version=0;version<2;version++){
   const plan=eclatV2Plan(id,minutes,version);
   assert.deepEqual(plan.map(x=>x.sceneNumber),ids);
   assert.ok(plan.every(x=>x.variant===version&&x.total===ids.length));
  }
 }
 assert.throws(()=>eclatV2Route(45),RangeError);
 assert.throws(()=>eclatV2Plan(2,30,2),RangeError);
});
test('V0 then V1 independent of old sessions, counting interrupted v2 starts',()=>{
 assert.deepEqual([0,1,2,3,4].map(eclatV2VariantForSessionNumber),[0,1,0,1,0]);
 const legacy={coffret_id:1,started_at:'2026-10-01',content_version:1};
 const newer={coffret_id:1,started_at:'2026-10-27',content_version:2,ended_at:null,cancelled:true};
 assert.equal(eclatV2VersionFromHistory(1,[legacy]),0);
 assert.equal(eclatV2VersionFromHistory(1,[legacy,newer]),1);
 assert.equal(eclatV2VersionFromHistory(2,[legacy,newer]),0);
 assert.equal(eclatV2VersionFromHistory(1,[legacy,newer],0),0);
 assert.throws(()=>eclatV2VersionFromHistory(1,null),TypeError);
 assert.throws(()=>eclatV2VariantForSessionNumber(-1),RangeError);
});
test('Creator owns role A for one and two phones; draft carries no private answers',()=>{
 for(const mode of ['one','two']){
  const session=eclatV2CreateDraft({coffretId:7,minutes:60,variant:1,
   creatorUserId:'b-user',partnerUserId:'a-user',deviceMode:mode});
  assert.equal(session.roleA,'b-user');
  assert.equal(session.roleB,'a-user');
  assert.equal(session.state,'active');
  assert.equal(session.plan.length,6);
  assert.equal(eclatV2CurrentScene(session).sceneNumber,1);
  assert.doesNotMatch(JSON.stringify(session),/private_vote|private_note|secret_answer/);
 }
 assert.throws(()=>eclatV2CreateDraft({coffretId:1,minutes:30,variant:0,creatorUserId:'a',partnerUserId:'a',deviceMode:'two'}),TypeError);
});
test('Pause resumes exactly, pass marks a scene without penalties, stop never claims completed',()=>{
 let s=eclatV2CreateDraft({coffretId:1,minutes:30,variant:0,creatorUserId:'A',partnerUserId:'B',deviceMode:'two'});
 s=eclatV2Transition(s,'pause');
 assert.equal(s.state,'paused');assert.equal(s.ordinal,1);
 assert.throws(()=>eclatV2Transition(s,'continue'),/Reprendre/);
 s=eclatV2Transition(s,'resume');
 s=eclatV2Transition(s,'pass');
 assert.deepEqual(s.skipped,[1]);
 assert.equal(eclatV2CurrentScene(s).sceneNumber,3);
 s=eclatV2Transition(s,'continue');
 s=eclatV2Transition(s,'continue');
 assert.equal(eclatV2CurrentScene(s).sceneNumber,8);
 s=eclatV2Transition(s,'continue');
 assert.equal(s.state,'finished');
 assert.equal(eclatV2CurrentScene(s),null);
 assert.throws(()=>eclatV2Transition(s,'continue'),/terminée/);
 const one=eclatV2CreateDraft({coffretId:2,minutes:30,variant:0,creatorUserId:'A',partnerUserId:'B',deviceMode:'one'});
 assert.equal(eclatV2Transition(one,'stop').state,'interrupted');
});
test('Private reveal requires BOTH on two phones, and explicit joint agreement on one',()=>{
 assert.equal(eclatV2MayReveal({deviceMode:'two',readyA:true,readyB:false}),false);
 assert.equal(eclatV2MayReveal({deviceMode:'two',readyA:true,readyB:true}),true);
 assert.equal(eclatV2MayReveal({deviceMode:'one'}),false);
 assert.equal(eclatV2MayReveal({deviceMode:'one',sharedOralAgreement:true}),true);
});
