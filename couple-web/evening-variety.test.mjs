import test from 'node:test';
import assert from 'node:assert/strict';
import {areNearDuplicateEveningCards,filterSimilarEveningCandidates}
 from './evening-variety.mjs';
const card=(id,title,description,extra={})=>({
 card_id:id,category:'SENSUEL',title,description,...extra
});
test('LR-026: stable ID, accents and equivalent titles detect actual repeat',()=>{
 const a=card(12,'Baisers dans le cou','Propose des baisers dans le cou.');
 assert.equal(areNearDuplicateEveningCards(a,{...a,title:'Titre changé'}),true);
 assert.equal(areNearDuplicateEveningCards(a,card(31,'Baisers dans le cou !','Autre description')),true);
 assert.equal(areNearDuplicateEveningCards(a,card(31,'Baisers dans le cou','Autre')),true);
 assert.equal(areNearDuplicateEveningCards(card(1,'Épaules douces','Un geste'),
  card(2,'Epaules douces','Autre geste')),true);
});
test('LR-026: generic overlaps never remove unrelated activities',()=>{
 const a=card(1,'Danser doucement','Invite ton partenaire à danser sur une musique.');
 const b=card(2,'Chocolat et confidences','Invite ton partenaire à manger du chocolat.');
 assert.equal(areNearDuplicateEveningCards(a,b),false);
 assert.equal(areNearDuplicateEveningCards(null,b),false);
});
test('LR-026: explicit matching activity/theme plus instructions detects near duplicates',()=>{
 const a=card(1,'Un soin tendre',
  'Masser doucement le dos pendant cinq minutes sans matériel.',
  {tags:{activity:'massage',theme:'detente'}});
 const b=card(2,'Le bien-être partagé',
  'Masser le dos tendrement pendant cinq minutes avec une huile.',
  {activity_tag:'massage',theme_tag:'detente'});
 assert.equal(areNearDuplicateEveningCards(a,b),true);
 assert.equal(areNearDuplicateEveningCards(a,{
  ...b,theme_tag:'autre',description:'Proposer une longue danse',activity_tag:'danse'
 }),false);
});
test('LR-026: only candidates already eligible can survive and order never changes',()=>{
 const former=card(1,'Massage des mains','Massage doux et détente');
 const similar=card(2,'Massage des mains !','Répéter le même massage');
 const distinct=card(3,'Une danse au salon','Choisissez une chanson et dansez');
 const excluded=card(4,'Confidences','Un défi supprimé du pool par le serveur');
 const eligible=[similar,distinct];
 const old=JSON.stringify(eligible);
 const result=filterSimilarEveningCandidates({
  eligibleCards:eligible,recentInSession:[former,excluded]
 });
 assert.deepEqual(result,{
  candidates:[distinct],suppressedCount:1,fallbackUsed:false,
  reason:'similarity-filtered'
 });
 assert.equal(JSON.stringify(eligible),old);
 assert.ok(result.candidates.every(c=>eligible.includes(c)));
 assert.ok(!result.candidates.includes(excluded));
});
test('LR-026: scarce or exhausted similarity pool falls back only to eligible cards',()=>{
 const a=card(1,'Baiser doux','Approchez-vous doucement');
 const b=card(2,'Baiser doux !','Un autre geste');
 const eligible=[b];
 const result=filterSimilarEveningCandidates({
  eligibleCards:eligible,recentInSession:[a]
 });
 assert.deepEqual(result,{candidates:[b],suppressedCount:0,
  fallbackUsed:true,reason:'limited-variety-pool'});
 assert.notEqual(result.candidates,eligible);
 assert.deepEqual(filterSimilarEveningCandidates({eligibleCards:[]}),{
  candidates:[],suppressedCount:0,fallbackUsed:false,reason:'no-eligible-cards'
 });
});
test('LR-026: favorites and custom cards remain available in a NEW session',()=>{
 const replay=card('fav-8','Le chocolat préféré','Partagez un chocolat',
  {favorite:true,custom:true});
 const custom=card('custom-9','Une idée nouvelle','Prenez une marche');
 const result=filterSimilarEveningCandidates({
  eligibleCards:[replay,custom],recentInSession:[]
 });
 assert.deepEqual(result,{candidates:[replay,custom],suppressedCount:0,
  fallbackUsed:false,reason:'all-eligible'});
});
test('LR-026: MIXTE/history inputs cannot add candidates or change D100 category odds',()=>{
 const sensual=card('S-2','Le massage','Propose un massage doux');
 const sexual={...card('X-9','Une idée intime','Une autre activité'),category:'SEXUEL'};
 const eligible=[sexual,sensual];
 const result=filterSimilarEveningCandidates({
  eligibleCards:eligible,recentInSession:[sensual]
 });
 assert.deepEqual(result.candidates,[sexual]);
 assert.deepEqual(eligible,[sexual,sensual]);
});
test('LR-026: invalid history/pool is rejected instead of silently widening the draw',()=>{
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:null,recentInSession:[]
 }),TypeError);
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:[],recentInSession:null
 }),TypeError);
});
