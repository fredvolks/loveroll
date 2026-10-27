import test from 'node:test';
import assert from 'node:assert/strict';
import {eclatV2SceneC} from './eclat-v2-coffrets-c.mjs';
import {eclatV2Plan} from './eclat-v2-contract.mjs';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
function state(id,v,minutes,scene,more={}){
 const plan=eclatV2Plan(id,minutes,v),n=plan.findIndex(x=>x.sceneNumber===scene);
 assert.ok(n>=0);
 return {content_version:2,coffret_id:id,variant:v,chapter_number:scene,
  chapter_index:n+1,chapter_total:plan.length,budget_minutes:plan[n].budgetMinutes,
  chapter_plan:plan.map(x=>x.sceneNumber),role_a:A,role_b:B,device_mode:'two',
  skipped_scenes:[],...more};
}
const get=(id,v,min,scene,more={},user=A)=>eclatV2SceneC({
 session:state(id,v,min,scene,more),viewerId:user});
test('09–12 every real route/variant renders authored content, no fabricated story',()=>{
 for(let id=9;id<=12;id++)for(let v=0;v<=1;v++)for(let min of [30,60,90]){
  for(const stage of eclatV2Plan(id,min,v)){
   const s=get(id,v,min,stage.sceneNumber);
   assert.equal(s.coffretId,id);assert.equal(s.variant,v);
   assert.equal(s.number,stage.ordinal);assert.ok(s.instruction.length>25);
  }
 }
});
test('09 exactly twelve approved cards; never expose non-common selections',()=>{
 for(let v=0;v<=1;v++){
  const initial=get(9,v,30,1,{my_cards:[1,5],my_cards_ready:false});
  assert.equal(initial.cards.length,12);assert.equal(initial.selectionLimit,3);
  assert.deepEqual(initial.mySelection,[1,5]);
  const common=get(9,v,30,3,{common_cards:[8,2]});
  assert.deepEqual(common.commonCards.map(x=>x.number),[2,8]);
  assert.equal(common.selectedCard,null);
  const noMatch=get(9,v,30,3);
  assert.deepEqual(noMatch.emptyOptions,['Discuter cinq minutes','Continuer sans proposition']);
  const possible=get(9,v,30,6,{common_cards:[7],selected_card:7});
  assert.equal(possible.contactAgreementRequired,true);
  assert.equal(possible.approvalRequired,true);
  assert.throws(()=>get(9,v,30,3,{common_cards:[2],selected_card:5}),/intersection/);
  assert.throws(()=>get(9,v,30,1,{my_cards:[1,2,3,4]}),/Choix/);
 }
});
test('10 timer durations and no forced automatic completion',()=>{
 const expected={1:[90,90],3:[120,120],4:[90,90],6:[180,120],7:[90,90]};
 for(let n of [1,3,4,6,7])for(let v=0;v<=1;v++){
  const x=get(10,v,90,n);
  assert.equal(x.timerSeconds,expected[n][v]);assert.equal(x.neverAutoComplete,true);
  assert.equal(x.timerModePending,true);
  assert.deepEqual(x.afterExpiry,['Prolonger 1 minute','Voir la suite']);
 }
 assert.equal(get(10,1,90,4).perPerson,true);
 assert.equal(get(10,1,30,6).oralFinaleUntimed,true);
 assert.match(get(10,0,90,5,{skipped_scenes:[3]}).fallback,/phrase de départ/);
});
test('11 two turns use exactly three authored options with alternative/pass',()=>{
 for(let v=0;v<=1;v++){
  const first=get(11,v,30,3);
  const other=get(11,v,30,6,{attention_card:3});
  assert.equal(first.proposer,'A');assert.equal(first.receiver,'B');
  assert.equal(other.proposer,'B');assert.equal(other.receiver,'A');
  assert.equal(first.cards.length,3);assert.equal(other.unlimitedAlternatives,true);
  assert.deepEqual(first.allowedReplies,['Oui','Une autre proposition','Passer']);
  assert.equal(other.contactChoice,v===0);
 }
});
test('12 never generates dice locally; fixed faces, swapped roles and stable objectives',()=>{
 const noDice=get(12,0,30,1);
 assert.equal(noDice.dicePending,true);assert.equal(noDice.story,undefined);
 for(let v=0;v<=1;v++){
  const short=get(12,v,30,6,{story_dice:{decor:1,roles:2,constraint:3},constraint_rerolls:3});
  assert.equal(short.dicePending,false);
  assert.equal(short.shortRouteSwitch,true);
  assert.equal(short.reRollCount,3);
  assert.equal(short.story.draws.decor,1);assert.equal(short.story.draws.roles,2);
  assert.ok(short.story.decor.length>8);
  assert.ok(short.story.constraint.length>12);
  const long=get(12,v,90,5,{story_dice:{decor:6,roles:1,constraint:5}});
  assert.equal(long.roleSwapped,true);
  assert.equal(get(12,v,30,1).rerollConsentRequired,true);
  assert.throws(()=>get(12,v,30,1,{story_dice:{decor:7,roles:1,constraint:1}}),/tirages/i);
 }
});
test('Role isolation for two phones and shared handover',()=>{
 const s=state(9,0,30,1);
 assert.throws(()=>eclatV2SceneC({session:s,viewerId:'outsider'}),/refusé/);
 assert.throws(()=>eclatV2SceneC({session:s,viewerId:A,localDisplayRole:'B'}),/interdit/);
 const shared={...s,device_mode:'one'};
 assert.throws(()=>eclatV2SceneC({session:shared,viewerId:A}),/Passage protégé/);
 const b=eclatV2SceneC({session:shared,viewerId:A,localDisplayRole:'B'});
 assert.deepEqual(b.mySelection,[]);
});
