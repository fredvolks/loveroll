import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const users=[{user_id:'p1',name:'Fred'},{user_id:'p2',name:'Partenaire'}];
const ready={
 session:{id:'sess1',self_draws:true,paired_turns:true},members:users,me:'p1',
 rolls:[{user_id:'p1',face:3},{user_id:'p2',face:2}],
 status:{my_rolled:true,partner_rolled:true,both_ready:true},
 turn:{ready:true,drawsFinished:false,finished:false,next:'p1',
  remaining:{p1:3,p2:2},targets:{p1:3,p2:2},completed:{p1:0,p2:0}}
};
const extractButtonOrder=html=>[...html.matchAll(/data-action="category:([^"]+)"/g)].map(x=>x[1]);
test('The weekly wording is replaced only for Soirée and all 3 category choices are in order',()=>{
 const html=premiumEveningHtml({...ready,category:null});
 assert.match(html,/ÉTAPE 2 · DÉFI DU SOIR/);
 assert.deepEqual(extractButtonOrder(html),['SENSUEL','HASARD','SEXUEL']);
 assert.match(html,/Au hasard/);
 assert.doesNotMatch(html,/NOTRE RITUEL À DEUX/);
 assert.equal((html.match(/data-dice-sides="100"/g)||[]).length,1);
 assert.match(html,/data-action="new-challenge"[^>]*disabled/);
 assert.doesNotMatch(html,/88 %|evening-probability/);
});
test('Only a selected Sensuel or Sexuel button displays 88%, never in random mode',()=>{
 for(const category of ['SENSUEL','SEXUEL']){
  const html=premiumEveningHtml({...ready,category});
  assert.match(html,new RegExp('data-action="category:'+category+'" aria-pressed="true"'));
  assert.equal((html.match(/class="evening-choice-odds"/g)||[]).length,1);
  assert.match(html,/class="evening-choice-odds">88 % de chances<span>d’avoir cette catégorie<\/span><\/small>/);
  assert.equal((html.match(/d’avoir cette catégorie/g)||[]).length,1);
  assert.doesNotMatch(html,/class="evening-probability"/);
 }
 const random=premiumEveningHtml({...ready,category:'HASARD'});
 assert.match(random,/data-action="category:HASARD" aria-pressed="true"/);
 assert.match(random,/data-action="new-challenge"/);
 assert.doesNotMatch(random,/class="evening-choice-odds"|88 %|evening-probability/);
});
test('Existing 3D engine and the server-confirmed result remain unchanged',()=>{
 const html=premiumEveningHtml({...ready,category:'HASARD',
  rolling:true,rollingKind:'new-challenge',rollFace:13});
 assert.match(html,/data-dice-sides="100" data-face="13" data-dice-zoom="1.07" data-dice-markers="numbers" data-spinning="true"/);
 assert.match(html,/class="evening-d100-result" role="status" aria-live="polite" hidden/);
 const die=read('dice3d.js');
 assert.match(die,/manySidedGeometry/);
});
test('D100 official number stays readable below the stationary 3D face on reload',()=>{
 const html=premiumEveningHtml({...ready,category:'HASARD',lastD35Face:100});
 assert.match(html,/data-dice-sides="100" data-face="100"/);
 assert.match(html,/class="evening-d100-result" role="status" aria-live="polite">Résultat : 100<\/div>/);
 const app=read('app.js');
 assert.match(app,/liveDie\.loveRollDie\?\.rollTo\(confirmedFace\)/);
 assert.match(app,/if\(savedStage\)savedStage\.remove\(\)/);
});
test('Random draw is performed on Supabase, with 50-50 preference and untouched security rules',()=>{
 const app=read('app.js'),sql=read('migrations/20261016_evening_category_random.sql');
 assert.match(app,/selectedCategory==='HASARD'\s*\?\s*rpc\('draw_for_partner_random'/);
 assert.match(app,/rpc\('draw_for_partner',\{p_session:sessionId,/);
 assert.match(app,/p_preference:selectedCategory,p_random:false/);
 assert.match(app,/EVENING_CATEGORIES\.includes\(saved\)\|\|saved==='HASARD'/);
 assert.match(app,/state\.randomMode=parts\[0\]==='HASARD'/);
 assert.match(sql,/CASE WHEN random\(\) < 0\.5 THEN 'SENSUEL'/);
 assert.match(sql,/ELSE 'SEXUEL'/);
 assert.match(sql,/public\.draw_for_partner\(/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.draw_for_partner_random\(uuid\) TO authenticated/);
 assert.doesNotMatch(sql,/UPDATE public\.couple_challenges|DELETE FROM public\.couple_challenges|ALTER TABLE/i);
});
test('Three equally sized buttons and a horizontally centered D100 at every breakpoint',()=>{
 const css=read('evening-category-v93.css');
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.evening-choice-odds span\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/align-items:center!important;justify-items:center!important/);
 assert.match(css,/margin-inline:auto!important/);
 assert.match(css,/@media \(max-width:767px\)/);
 assert.match(css,/@media \(min-width:768px\)/);
});

test('Switching categories must leave mounted WebGL canvases in place',()=>{
 const app=read('app.js'),module=read('premium-evening.mjs');
 assert.match(app,/import \{premiumEveningHtml,updateEveningCategoryUi\}/);
 const start=app.indexOf("if(verb==='category')");
 const end=app.indexOf("if(verb==='timer-mode')",start);
 const handler=app.slice(start,end);
 assert.match(handler,/if\(!updateEveningCategoryUi\(root,parts\[0\],/);
 assert.doesNotMatch(handler,/\n  render\(\);return;/);
 assert.match(module,/export function updateEveningCategoryUi\(root,category,percent=88\)/);
 const updater=module.slice(module.indexOf('export function updateEveningCategoryUi('),module.indexOf('const d6='));
 assert.match(updater,/querySelector\('\.evening-step\.two \.evening-choice'\)/);
 assert.doesNotMatch(updater,/innerHTML|outerHTML|replaceChildren|diceCleanup|clearDice|dieOn|render\(/);
 assert.match(updater,/roll\.disabled=false/);
});
