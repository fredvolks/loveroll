import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {areNearDuplicateEveningCards,filterSimilarEveningCandidates}
 from './evening-variety.mjs';
test('LR-026: advisory JS source keeps official SQL stopwords and accent map',()=>{
 const js=readFileSync(new URL('./evening-variety.mjs',import.meta.url),'utf8');
 const sql=readFileSync(new URL('./lr026-server-variety.sql',import.meta.url),'utf8');
 const tokens=section=>[...section.matchAll(/'([a-z]+)'/g)].map(m=>m[1]).sort();
 const fromSql=sql.match(/t\.word NOT IN \(\s*([\s\S]*?)\s*\)/);
 const fromJs=js.match(/const SQL_STOPWORDS=new Set\(\[\s*([\s\S]*?)\s*\]\)/);
 assert.ok(fromSql&&fromJs,'both implementations must declare their stopword set');
 assert.deepEqual(tokens(fromJs[1]),tokens(fromSql[1]),
  'JS and SQL meaningful description words must use identical exclusions');
 const sqlMap=sql.match(/'([àáâäãåçèéêëìíîïñòóôöõùúûüýÿ]+)',\s*'([a-z]+)'/);
 const jsMap=js.match(/const SQL_DIACRITICS='([^']+)';\s*const SQL_ASCII='([^']+)'/);
 assert.ok(sqlMap&&jsMap,'accent mappings must be declared in both sources');
 assert.deepEqual(jsMap.slice(1),sqlMap.slice(1));
 assert.match(sql,/RETURN shared>=5 AND shared\*100 >= 68\*\(/);
 assert.match(js,/return shared>=5&&shared\*100>=68\*/);
});

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
test('LR-026: French œ/æ ligatures normalize exactly like the SQL helper',()=>{
 const heart=card(11,'Un cœur léger','Une soirée paisible au salon');
 const coeur=card(12,'Un coeur leger','Une activité totalement différente');
 assert.equal(areNearDuplicateEveningCards(heart,coeur),true,
  'JavaScript NFKD alone cannot replace œ with oe');
 assert.equal(areNearDuplicateEveningCards(coeur,heart),true);
 const book=card(13,'L’encyclopædie de nos idées','Une activité calme');
 const plain=card(14,'L encyclopaedie de nos idees','Un autre exercice');
 assert.equal(areNearDuplicateEveningCards(book,plain),true);
 const upper=card(15,'CŒUR et ÆTHER','Instructions du défi');
 const lower=card(16,'Coeur et aether','Autre activité');
 assert.equal(areNearDuplicateEveningCards(upper,lower),true);
 const distinct=card(17,'Danse au jardin','Choisissez une chanson');
 const selected=filterSimilarEveningCandidates({
  eligibleCards:[plain,distinct],
  recentInSession:[book],
  selectedCategory:'SENSUEL'
 });
 assert.deepEqual(selected.candidates,[distinct]);
 assert.equal(selected.suppressedCount,1);
 const sexual={...plain,category:'SEXUEL'};
 assert.equal(areNearDuplicateEveningCards(book,sexual),false,
  'Ligature normalization must never cross the official D100 category');
});

test('LR-026: cross-category matching titles, card ids and instructions are NOT duplicates',()=>{
 const sensual=card(12,'Danse lente et douceur',
  'Proposez une danse lente ensemble autour du salon.');
 const sexual={...card(12,'Danse lente et douceur',
  'Proposez une danse lente ensemble autour du salon.'),category:'SEXUEL'};
 // The server's SQL helper only compares seen.category=p_category.
 assert.equal(areNearDuplicateEveningCards(sensual,sexual),false);
 assert.equal(areNearDuplicateEveningCards(sexual,sensual),false);
 const sameCategory={...sensual,card_id:19};
 assert.equal(areNearDuplicateEveningCards(sensual,sameCategory),true);
 const candidate=card(12,'Danse lente et douceur',
  'Proposez une danse lente ensemble autour du salon.');
 const result=filterSimilarEveningCandidates({
  eligibleCards:[candidate],recentInSession:[sexual],selectedCategory:'SENSUEL'
 });
 assert.deepEqual(result,{
  candidates:[candidate],suppressedCount:0,fallbackUsed:false,
  reason:'all-eligible'
 });
});
test('LR-026: incomplete history never silently changes selected-category candidates',()=>{
 const candidate=card(25,'Le cœur des envies','Approche douce');
 const distinct=card(26,'Une danse paisible','Musique tranquille');
 const missingCategory={...candidate,card_id:9,category:undefined};
 const wrongCategory={...candidate,card_id:10,category:'SEXUEL'};
 const malformedHistory=[null,42,'not a card',missingCategory,wrongCategory];
 const result=filterSimilarEveningCandidates({
  eligibleCards:[candidate,distinct],recentInSession:malformedHistory,
  selectedCategory:'SENSUEL'
 });
 assert.deepEqual(result.candidates,[candidate,distinct]);
 assert.equal(result.suppressedCount,0);
 assert.equal(result.reason,'all-eligible');
 const officialHistory=card(11,'Le coeur des envies','Autre activité');
 const filtered=filterSimilarEveningCandidates({
  eligibleCards:[candidate,distinct],
  recentInSession:[...malformedHistory,officialHistory],
  selectedCategory:'SENSUEL'
 });
 assert.deepEqual(filtered.candidates,[distinct]);
 assert.equal(filtered.suppressedCount,1);
});

test('LR-026: a second category in session history cannot erase a valid card',()=>{
 const sensual=card(3,'Moment complice','Partagez un souvenir romantique.');
 const sexual={...sensual,category:'SEXUEL',card_id:4};
 const other=card(5,'Un autre moment','Profitez d’un moment détendu.');
 const result=filterSimilarEveningCandidates({
  eligibleCards:[sensual,other],recentInSession:[sexual],
  selectedCategory:'SENSUEL'
 });
 assert.deepEqual(result.candidates,[sensual,other]);
 assert.equal(result.reason,'all-eligible');
});
test('LR-026: generic overlaps never remove unrelated activities',()=>{
 const a=card(1,'Danser doucement','Invite ton partenaire à danser sur une musique.');
 const b=card(2,'Chocolat et confidences','Invite ton partenaire à manger du chocolat.');
 assert.equal(areNearDuplicateEveningCards(a,b),false);
 assert.equal(areNearDuplicateEveningCards(null,b),false);
});
test('LR-026: tags cannot overrule the official SQL similarity decision',()=>{
 const a=card(1,'Un soin tendre',
  'Masser doucement le dos pendant cinq minutes sans matériel.',
  {tags:{activity:'massage',theme:'detente'}});
 const b=card(2,'Le bien-être partagé',
  'Masser le dos tendrement pendant cinq minutes avec une huile.',
  {activity_tag:'massage',theme_tag:'detente'});
 assert.equal(areNearDuplicateEveningCards(a,b),false,
  'matching client-only tags cannot suppress server-admissible cards');
 const shared=card(3,'L’expérience de demain',
  'Masser lentement les epaules poignets doigts avec douceur',
  {activity_tag:'danse',theme_tag:'autre'});
 const related=card(4,'Notre rituel paisible',
  'Masser lentement les epaules poignets doigts avec huile',
  {activity_tag:'massage',theme_tag:'detente'});
 assert.equal(areNearDuplicateEveningCards(shared,related),true,
  'five significant description tokens at >=68% Jaccard must match');
});

test('LR-026: title word overlap is not a SQL duplicate without exact title',()=>{
 const a=card(1,'Danse lente au salon','Une consigne trop courte');
 const b=card(2,'Danse lente dans la cuisine','Une deuxième consigne courte');
 assert.equal(areNearDuplicateEveningCards(a,b),false,
  'SQL matches normalized complete title, not partial title word sets');
 const result=filterSimilarEveningCandidates({
  eligibleCards:[b],recentInSession:[a],selectedCategory:'SENSUEL'
 });
 assert.equal(result.reason,'all-eligible');
 assert.deepEqual(result.candidates,[b]);
});

test('LR-026: description overlap respects SQL five-token and 68% thresholds',()=>{
 const old=card(1,'Premier titre',
  'masser lentement les epaules poignets doigts chaleur');
 const near=card(2,'Autre titre',
  'masser lentement les epaules poignets doigts huile');
 assert.equal(areNearDuplicateEveningCards(near,old),true,
  '5 shared of 7 distinct meaningful words is above 68%');
 const tooBroad=card(3,'Troisième titre',
  'masser lentement les epaules poignets doigts huile musique');
 assert.equal(areNearDuplicateEveningCards(tooBroad,old),false,
  '5 shared of 8 distinct meaningful words is below 68%');
 const fourShared=card(4,'Quatrième titre',
  'masser lentement les epaules poignets musique bruits');
 assert.equal(areNearDuplicateEveningCards(fourShared,old),false,
  'four shared words never meet the minimum even if Jaccard is high');
 const shortA=card(5,'Court A','masser lentement les epaules poignets');
 const shortB=card(6,'Court B','masser lentement les epaules poignets');
 assert.equal(areNearDuplicateEveningCards(shortA,shortB),false,
  '4 meaningful words are not enough for the server');
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

test('LR-026: a challenge row UUID is never an exact library-card ID',()=>{
 const first={id:'same-persisted-row',category:'SENSUEL',
  title:'Raconter un souvenir',description:'Un court souvenir au jardin'};
 const second={id:'same-persisted-row',category:'SENSUEL',
  title:'Préparer un dessert',description:'Une autre activité en cuisine'};
 assert.equal(areNearDuplicateEveningCards(first,second),false,
  'SQL compares library card_id, not a challenge row id');
 const pool=filterSimilarEveningCandidates({
  eligibleCards:[second],recentInSession:[first],selectedCategory:'SENSUEL'
 });
 assert.deepEqual(pool.candidates,[second]);
 assert.equal(pool.reason,'all-eligible');
 // A real library card ID is still an exact match even after title edits.
 assert.equal(areNearDuplicateEveningCards(
  {...first,card_id:24},{...second,card_id:24}),true);
});

test('LR-026: unknown official category fails closed even on an empty pool',()=>{
 for(const unknown of ['MOYEN','INTENSE','',0,'SEXUELL']) {
  assert.throws(()=>filterSimilarEveningCandidates({
   eligibleCards:[],recentInSession:[],selectedCategory:unknown
  }),/one official D100 category/);
  assert.throws(()=>filterSimilarEveningCandidates({
   eligibleCards:[{category:unknown,card_id:1,title:'Une carte'}],
   recentInSession:[]
  }),/one official D100 category/);
 }
 const validEmpty=filterSimilarEveningCandidates({
  eligibleCards:[],selectedCategory:'SEXUEL'
 });
 assert.deepEqual(validEmpty,{candidates:[],suppressedCount:0,
  fallbackUsed:false,reason:'no-eligible-cards'});
 const valid=filterSimilarEveningCandidates({
  eligibleCards:[card(3,'Une carte','Un petit jeu')],
  recentInSession:[],selectedCategory:'SENSUEL'
 });
 assert.equal(valid.reason,'all-eligible');
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
