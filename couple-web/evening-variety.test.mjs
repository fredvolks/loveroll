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
test('LR-026: mixed categories fail closed to preserve official D100 odds',()=>{
 const sensual=card('S-2','Le massage','Propose un massage doux');
 const sexual={...card('X-9','Une idée intime','Une autre activité'),category:'SEXUEL'};
 const eligible=[sexual,sensual];
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:eligible,recentInSession:[sensual]
 }),/one official D100 category/);
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:[sexual],recentInSession:[],selectedCategory:'SENSUEL'
 }),/one official D100 category/);
 const result=filterSimilarEveningCandidates({
  eligibleCards:[sexual],recentInSession:[sensual],selectedCategory:'SEXUEL'
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

test('LR-026: all eligible custom cards remain available when history has no similar card',()=>{
 const custom=card('my-custom','Une longue promenade','Choisissez un endroit calme et marchez');
 const old=card('historical','Le spa','Masser le dos doucement');
 const result=filterSimilarEveningCandidates({
  eligibleCards:[custom],recentInSession:[old],selectedCategory:'SENSUEL'
 });
 assert.equal(result.reason,'all-eligible');
 assert.deepEqual(result.candidates,[custom]);
});

test('LR-026: malformed eligible items never become drawable cards',()=>{
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:[null],recentInSession:[]
 }),TypeError);
});

test('LR-026: card_id identifies cards, never the die result face or draw row ID',()=>{
 const fromDraw={
  id:'challenge-row-19',category:'SENSUEL',face:7,card_id:19,
  card_title:'Un moment en douceur',
  card_description:'Propose un massage et une détente.'
 };
 const sameCard={category:'SENSUEL',face:99,card_id:19,
  title:'Titre édité',description:'Consigne remplacée'};
 const differentCard={category:'SENSUEL',face:7,card_id:8,
  title:'Une danse dans la cuisine',
  description:'Écoutez un morceau puis dansez'};
 assert.equal(areNearDuplicateEveningCards(fromDraw,sameCard),true);
 assert.equal(areNearDuplicateEveningCards(fromDraw,differentCard),false);
 assert.equal(areNearDuplicateEveningCards(
  {category:'SENSUEL',face:19,title:'Lire un livre',description:'Lecture au calme'},
  sameCard),false);
 assert.equal(areNearDuplicateEveningCards(
  {category:'SENSUEL',id:'19',title:'Pique-nique',description:'Prépare une collation'},
  sameCard),false);
 const chosen=filterSimilarEveningCandidates({
  eligibleCards:[differentCard,sameCard],
  recentInSession:[fromDraw],selectedCategory:'SENSUEL'
 });
 assert.deepEqual(chosen.candidates,[differentCard]);
 assert.equal(chosen.suppressedCount,1);
});

test('LR-026: legacy RPC card text fields support title similarity',()=>{
 const descriptive={category:'SENSUEL',card_title:'La danse lente',
  card_description:'Proposez une danse lente ensemble'};
 const alternate={category:'SENSUEL',title:'La danse lente',
  instructions:'Un autre texte'};
 assert.equal(areNearDuplicateEveningCards(descriptive,alternate),true);
});

test('LR-026: a pool missing the official category must never enter the draw',()=>{
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:[{card_id:1,title:'Sans catégorie'}],recentInSession:[]
 }),/one official D100 category/);
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:[card(1,'Présent','Une activité'),{card_id:2}],recentInSession:[]
 }),/one official D100 category/);
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:[[]],recentInSession:[]
 }),TypeError);
 assert.throws(()=>filterSimilarEveningCandidates({
  eligibleCards:['invalid'],recentInSession:[]
 }),TypeError);
});
