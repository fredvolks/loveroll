import test from 'node:test';
import assert from 'node:assert/strict';
import {eclatV2SceneB} from './eclat-v2-coffrets-b.mjs';
import {eclatV2Plan} from './eclat-v2-contract.mjs';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const status=(id,version,minutes,scene,overrides={})=>{
 const plan=eclatV2Plan(id,minutes,version),ix=plan.findIndex(x=>x.sceneNumber===scene);
 assert.ok(ix>=0);
 return {content_version:2,coffret_id:id,variant:version,chapter_number:scene,
  chapter_index:ix+1,chapter_total:plan.length,budget_minutes:plan[ix].budgetMinutes,
  role_a:a,role_b:b,device_mode:'two',substep_index:1,skipped_scenes:[],...overrides};
};
const view=(id,v,d,n,user=a,opts={})=>eclatV2SceneB({session:status(id,v,d,n,opts),viewerId:user});
test('05–08: exact approved routes / variants all render without synthetic scenes',()=>{
 for(let id=5;id<=8;id++)for(let v=0;v<=1;v++)for(const d of [30,60,90]){
  for(const step of eclatV2Plan(id,d,v)){
   const s=view(id,v,d,step.sceneNumber);
   assert.equal(s.coffretId,id);assert.equal(s.variant,v);assert.equal(s.number,step.ordinal);
   assert.ok(s.instruction.length>20);
  }
 }
});
test('05 questions A/B/C and 3 approved attentions; no purchase or booking',()=>{
 for(let v=0;v<=1;v++){
  assert.equal(view(5,v,30,3).questions.length,2);
  const q=view(5,v,60,5).questions;assert.equal(q.length,1);
  const first=view(5,v,30,6),second=view(5,v,30,6,a,{substep_index:2});
  assert.equal(first.turn,'A');assert.equal(second.turn,'B');
  assert.equal(first.attentions.length,3);
  assert.deepEqual(first.responseChoices,['Oui','Une autre proposition','Passer']);
  assert.equal(first.noPurchase,true);
  assert.equal(view(5,v,30,8).endingOptions.length,3);
 }
});
test('06 fixed complementary dossier A/B, correct place/time/code and optional help',()=>{
 const s0=view(6,0,30,1);
 assert.match(s0.privateMission,/fontaine/);
 assert.doesNotMatch(s0.privateMission,/avec une horloge/);
 const b0=view(6,0,30,1,b);assert.match(b0.privateMission,/horloge/);
 assert.doesNotMatch(b0.privateMission,/contient le chiffre 4/);
 assert.equal(s0.places.length,4);
 assert.deepEqual(view(6,0,30,3).puzzle.solution,{place:'Verrière',time:'21 h 30'});
 assert.equal(view(6,0,30,6).puzzle.solution.code,'247');
 assert.deepEqual(view(6,1,30,3).puzzle.solution,{place:'Pavillon',time:'20 h 45'});
 assert.equal(view(6,1,30,6).puzzle.solution.code,'562');
 assert.equal(view(6,0,90,2).bonus.solution,'NOUS');
 assert.equal(view(6,1,90,5).bonus.solution,'DANS LE JARDIN');
 assert.equal(view(6,1,30,8,a,{skipped_scenes:[3]}).investigationFinal.assistance,true);
});
test('07 Q1..Q5 sequential; always 3 options; never reveal before both ready',()=>{
 for(let v=0;v<=1;v++){
  const seen=[];
  for(const [scene,ids] of [[1,[1]],[3,[2,3]],[6,[4,5]]]){
   for(let i=0;i<ids.length;i++){
    const s=view(7,v,90,scene,a,{substep_index:i+1});
    assert.equal(s.questions[0].number,ids[i]);
    assert.equal(s.questions[0].options.length,3);
    assert.equal(s.noScores,true);
    assert.equal(s.revealAnswers,undefined);
    seen.push(s.questions[0].number);
   }
  }
  assert.deepEqual(seen,[1,2,3,4,5]);
 }
 const notReady=view(7,0,30,1);
 assert.equal(notReady.revealAnswers,undefined);
 const approved=view(7,0,90,3,a,{substep_index:2,reveal_answers:{
   question:2,players:{A:{answer:0,prediction:1},B:{answer:1,prediction:0}}}});
 assert.equal(approved.revealAnswers.question,2);
});
test('08 T1..T5 sequential, no automated streaming or lyrics',()=>{
 for(let v=0;v<=1;v++){
  const numbers=[];
  for(let [scene,ids] of [[1,[1]],[3,[2,3]],[6,[4,5]]]){
   for(let i=0;i<ids.length;i++){
    const s=view(8,v,90,scene,a,{substep_index:i+1});
    assert.equal(s.themes[0].number,ids[i]);assert.equal(s.maxClues,3);
    assert.equal(s.maxGuesses,2);assert.equal(s.noMusicPlayback,true);
    numbers.push(s.themes[0].number);
   }
  }
  assert.deepEqual(numbers,[1,2,3,4,5]);
  assert.equal(view(8,v,30,8).playlistLimit,5);
  assert.equal(view(8,v,60,5).listeningChoices.length,2);
 }
});
test('Viewer permissions and phone handover never allow switching other account',()=>{
 const s=status(6,0,30,1);
 assert.throws(()=>eclatV2SceneB({session:s,viewerId:'outsider'}),/refusé/);
 assert.throws(()=>eclatV2SceneB({session:s,viewerId:a,localDisplayRole:'B'}),/interdit/);
 const shared={...s,device_mode:'one'};
 assert.throws(()=>eclatV2SceneB({session:shared,viewerId:a}),/Remise/);
 const bview=eclatV2SceneB({session:shared,viewerId:a,localDisplayRole:'B'});
 assert.match(bview.privateMission,/horloge/);
});
