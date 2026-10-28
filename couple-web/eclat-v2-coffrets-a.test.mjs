import test from 'node:test';
import assert from 'node:assert/strict';
import {eclatV2SceneA,eclatV2SceneNeedsAgreement} from './eclat-v2-coffrets-a.mjs';
import {eclatV2Plan} from './eclat-v2-contract.mjs';
const aid='11111111-1111-4111-8111-111111111111';
const bid='22222222-2222-4222-8222-222222222222';
const base=(coffret_id,variant,minutes,sceneNumber,device_mode='two')=>{
 const plan=eclatV2Plan(coffret_id,minutes,variant);
 const index=plan.findIndex(x=>x.sceneNumber===sceneNumber);
 if(index===-1)throw Error('not in plan');
 return {access:true,active:true,content_version:2,coffret_id,variant,minutes,
  chapter_number:sceneNumber,chapter_index:index+1,chapter_total:plan.length,
  budget_minutes:plan[index].budgetMinutes,role_a:aid,role_b:bid,device_mode,skipped_scenes:[]};
};
test('4 coffrets x 2 variants x 3 durations: every displayed scene exists in approved routes',()=>{
 for(let id=1;id<=4;id++)for(let v=0;v<=1;v++)for(const minutes of [30,60,90]){
  const plan=eclatV2Plan(id,minutes,v);
  for(const scene of plan){
   const m=eclatV2SceneA({session:base(id,v,minutes,scene.sceneNumber),viewerId:aid});
   assert.equal(m.coffretId,id);
   assert.equal(m.number,scene.ordinal);
   assert.equal(m.budgetMinutes,scene.budgetMinutes);
   assert.ok(m.instruction.length>20,m.title);
  }
 }
});
test('01 — five envelopes never omit 3/4 on short journey; odd/even roles fixed',()=>{
 for(let v=0;v<=1;v++){
  const at1=eclatV2SceneA({session:base(1,v,30,1),viewerId:aid});
  const at3=eclatV2SceneA({session:base(1,v,30,3),viewerId:aid});
  const at6=eclatV2SceneA({session:{...base(1,v,30,6),substep_index:1},viewerId:aid});
  const at6second=eclatV2SceneA({session:{...base(1,v,30,6),substep_index:2},viewerId:aid});
  const at8=eclatV2SceneA({session:base(1,v,30,8),viewerId:aid});
  assert.deepEqual([at1,at3,at6,at6second,at8].flatMap(x=>x.envelopes.map(e=>e.number)),[1,2,3,4,5]);
  assert.deepEqual([at1,at3,at6,at6second,at8].flatMap(x=>x.envelopes.map(e=>e.first)),['A','B','A','B','A']);
  assert.ok(at8.finales.length===2);
  assert.ok([...at6.envelopes,...at6second.envelopes].every(e=>e.clueLimit===3&&e.guessLimit===2));
  assert.equal(at6second.substepIndex,2);
 }
});
test('02 — reversed word targets, role-specific private missions and real V0/V1 values',()=>{
 const a=eclatV2SceneA({session:base(2,0,30,1),viewerId:aid});
 const b=eclatV2SceneA({session:base(2,0,30,1),viewerId:bid});
 assert.match(a.privateMission,/soleil/);
 assert.match(b.privateMission,/lune/);
 assert.doesNotMatch(a.privateMission,/lune/);
 const swap=eclatV2SceneA({session:base(2,0,30,3),viewerId:aid});
 assert.match(swap.privateMission,/lune/);
 const v1=eclatV2SceneA({session:base(2,1,30,1),viewerId:aid});
 assert.match(v1.privateMission,/cinéma/);
 const object=eclatV2SceneA({session:base(2,1,30,6),viewerId:bid});
 assert.match(object.privateMission,/côté de la feuille/);
 assert.doesNotMatch(object.privateMission,/^A fait/);
});
test('03 — consent for contact is separate; nothing forces a massage or object',()=>{
 const scene=eclatV2SceneA({session:base(3,0,30,6),viewerId:aid});
 assert.deepEqual(scene.choices.map(x=>x.id),['textures','mains','silence']);
 assert.equal(scene.choices.filter(x=>x.requiresContact).length,1);
 assert.equal(eclatV2SceneNeedsAgreement({coffretId:3,sceneNumber:6,choice:'mains'}),true);
 assert.equal(eclatV2SceneNeedsAgreement({coffretId:3,sceneNumber:6,choice:'silence'}),false);
 const first=eclatV2SceneA({session:base(3,1,30,1),viewerId:aid});
 assert.ok(first.optionalObjects.includes('coussin'));
});
test('04 — choices change A/B/finale; first skipped door deterministically falls back to Jeu',()=>{
 for(let v=0;v<=1;v++){
  for(let door of ['Tendresse','Jeu','Mystère']){
   const activityA=eclatV2SceneA({session:{...base(4,v,30,3),branch:door},viewerId:aid});
   const activityB=eclatV2SceneA({session:{...base(4,v,30,6),branch:door},viewerId:aid});
   const finale=eclatV2SceneA({session:{...base(4,v,30,8),branch:door},viewerId:aid});
   assert.ok(activityA.branchActivity.length>15);
   assert.ok(activityB.branchActivity.length>15);
   assert.ok(finale.finale.length>15);
   assert.notEqual(activityA.branchActivity,activityB.branchActivity);
  }
  const skipped=eclatV2SceneA({session:{...base(4,v,30,3),skipped_scenes:[1]},viewerId:aid});
  assert.equal(skipped.branch,'Jeu');
  const unknown=eclatV2SceneA({session:base(4,v,30,3),viewerId:aid});
  assert.equal(unknown.awaitBranch,true);
 }
 const scene5=eclatV2SceneA({session:{...base(4,0,90,5),branch:'Jeu'},viewerId:aid});
 assert.equal(scene5.choices.length,3);
 assert.ok(scene5.choices.some(x=>x.id==='Tendresse'));
});
test('Private role cannot be switched or leaked on two telephones; shared phone gated by handover',()=>{
 const s=base(2,0,30,1);
 assert.throws(()=>eclatV2SceneA({session:s,viewerId:'outsider'}),/Accès/);
 assert.throws(()=>eclatV2SceneA({session:s,viewerId:aid,localDisplayRole:'B'}),/interdit/);
 const shared={...s,device_mode:'one'};
 assert.throws(()=>eclatV2SceneA({session:shared,viewerId:aid}),/masqué/);
 assert.throws(()=>eclatV2SceneA({session:shared,viewerId:bid,localDisplayRole:'B'}),/créateur/);
 const b=eclatV2SceneA({session:shared,viewerId:aid,localDisplayRole:'B'});
 assert.equal(b.role,'B');
 assert.match(b.privateMission,/lune/);
});
