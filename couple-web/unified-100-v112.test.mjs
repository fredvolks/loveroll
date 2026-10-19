import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENING_CATEGORIES,editableCardSlots,customCardSlots,availableEveningCategories,playableEveningCount} from './evening-challenges.mjs';
import {buildEveningLibrary,normalizeLibraryData,validateEveningLibrary} from './json-libraries.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const people=[{user_id:'one',name:'Fred'},{user_id:'two',name:'Fred'}];
const ready={session:{id:'s',self_draws:true,paired_turns:true},members:people,me:'one',
 rolls:[{user_id:'one',face:2},{user_id:'two',face:3}],
 status:{my_rolled:true,partner_rolled:true,both_ready:true},
 turn:{ready:true,drawsFinished:false,finished:false,next:'one',
 remaining:{one:2,two:3},targets:{one:2,two:3},completed:{one:0,two:0}}};
const actions=html=>[...html.matchAll(/data-action="category:(SENSUEL|HASARD|SEXUEL)"/g)].map(m=>m[1]);
test('100 Sensuel and 100 Sexuel card slots, without an editor split',()=>{
 assert.deepEqual(EVENING_CATEGORIES,['SENSUEL','SEXUEL']);
 for(const cat of EVENING_CATEGORIES){
  const a=editableCardSlots(cat);
  assert.equal(a.length,100);
  assert.equal(a.filter(x=>x.isOriginal).length,25);
  assert.equal(customCardSlots(cat).length,75);
  assert.equal(a[99].cardId,100);
 }
 const app=read('app.js');
 const editor=read('editorial-editors.mjs');assert.ok(editor.includes('editableCardSlots(category,state.customCards)'));assert.ok(editor.includes('slots.map(slot=>'));assert.ok(editor.includes('100 emplacements par catégorie'));
 assert.ok(!app.includes('25 cartes prêtes'));
 assert.ok(!app.includes('75 emplacements personnalisables'));
 assert.deepEqual(playableEveningCount(),{sensual:25,sexual:25,total:50});
});
test('Sensuel / Aléatoire / Sexuel render and preserve 88/12 and 50/50',()=>{
 assert.deepEqual(availableEveningCategories('SENSUEL'),[
  {category:'SENSUEL',weight:88},{category:'SEXUEL',weight:12}]);
 assert.deepEqual(availableEveningCategories('SEXUEL'),[
  {category:'SENSUEL',weight:12},{category:'SEXUEL',weight:88}]);
 assert.deepEqual(availableEveningCategories('HASARD'),[
  {category:'SENSUEL',weight:50},{category:'SEXUEL',weight:50}]);
 const html=premiumEveningHtml({...ready,category:'SENSUEL'});
 assert.deepEqual(actions(html),['SENSUEL','HASARD','SEXUEL']);
 assert.match(html,/class="evening-choice-odds">88 % de chances/);
 assert.equal((html.match(/data-dice-sides="100"/g)||[]).length,1);
});
test('Settings hide either or both optional choices, never Aléatoire',()=>{
 assert.deepEqual(actions(premiumEveningHtml({...ready,showSensuel:false,showSexuel:false,category:'HASARD'})),['HASARD']);
 assert.deepEqual(actions(premiumEveningHtml({...ready,showSensuel:true,showSexuel:false})),['SENSUEL','HASARD']);
 assert.deepEqual(actions(premiumEveningHtml({...ready,showSensuel:false,showSexuel:true})),['HASARD','SEXUEL']);
 const app=read('app.js');
 for(const x of ['show-sensuel-button','show-sexuel-button','save-evening-buttons','save_love_evening_buttons','show_sensuel_button','show_sexuel_button'])
  assert.ok(app.includes(x),'missing '+x);
 const css=read('restore-categories-v113.css');
 assert.ok(css.includes('evening-choice-option:only-child'));
 assert.ok(css.includes('nth-child(2):last-child'));
});
test('Both categories independently export all 100 cards and import version 2 with him/her',()=>{
 for(const cat of EVENING_CATEGORIES){
  const backup=buildEveningLibrary(cat);
  assert.equal(backup.version,2);
  assert.equal(backup.category,cat);
  assert.equal(backup.cards.length,100);
  assert.equal(normalizeLibraryData(backup,'evening').category,cat);
 }
 const sexual=buildEveningLibrary('SEXUEL');
 sexual.cards[39]={card_id:40,title:'Les secrets de la barbe',
  description:'Une idée à deux avec des restrictions de rôles.',
  timer_minutes:null,drawer_role:'her',recipient_role:'him'};
 assert.equal(validateEveningLibrary(sexual).cards[39].drawer_role,'her');
 assert.equal(normalizeLibraryData(sexual,'evening').cards[39].recipient_role,'him');
 const legacy={...sexual,version:1,cards:sexual.cards.slice(0,35)};
 assert.equal(normalizeLibraryData(legacy,'evening').cards.length,35);
});
test('Existing server drawers use category weighting, durable history and gender restrictions',()=>{
 const sql=read('migrations/20261016_restore_categories_113.sql');
 for(const term of ["p_preference not in ('SENSUEL','SEXUEL')",
  'when p_random then 50','when v_cat=p_preference then 88 else 12',
  'generate_series(1,100)','love_card_draw_history',
  'couple_private.love_role_allows',"v_category not in ('SENSUEL','SEXUEL')",
  'save_love_evening_buttons','show_sensuel_button','show_sexuel_button'])
  assert.ok(sql.includes(term),'missing '+term);
 assert.ok(!sql.includes('DELETE FROM public.couple_challenges'));
 assert.ok(read('app.js').includes("selectedCategory==='HASARD'"));
});
