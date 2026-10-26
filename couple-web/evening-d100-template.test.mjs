import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {eveningPlayInfoHtml} from './evening-d100-template.mjs';
const ready={session:{id:'s',paired_turns:true,self_draws:true},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],me:'a',status:{both_ready:true},turn:{ready:true,next:'a',remaining:{a:2,b:3}}};
test('No category is preselected; an eligible player can press roll to receive guidance',()=>{
 const html=premiumEveningHtml(ready);
 assert.equal((html.match(/aria-pressed="false"/g)||[]).length,3);
 assert.doesNotMatch(html,/aria-pressed="true"/);
 assert.doesNotMatch(html,/data-action="new-challenge"[^>]*disabled/);
 for(const blocked of [{...ready,turn:{...ready.turn,next:'b'}},{...ready,rolling:true},{...ready,status:{both_ready:false}}]){
  assert.match(premiumEveningHtml(blocked),/data-action="new-challenge"[^>]*disabled/);
 }
});
test('Information uses the actual configured preference and preserves calendar and closure',()=>{
 const info=eveningPlayInfoHtml(74);
 assert.match(info,/74 % pour la catégorie choisie et 26 % pour l’autre/);
 assert.match(info,/à parts égales/);assert.match(info,/3 dons par personne et par mois/);
 assert.match(info,/data-action="evening-calendar"/);assert.match(info,/data-action="evening-close-request"/);
 assert.doesNotMatch(info,/88 %/);
});

test('LR-013: eligible player sees category guidance associated with selector, without a preselection',()=>{
 const html=premiumEveningHtml(ready);
 assert.match(html,/aria-describedby="lr-evening-category-hint"/);
 assert.match(html,/<p id="lr-evening-category-hint" class="lr-category-hint" aria-live="polite">/);
 assert.doesNotMatch(premiumEveningHtml({...ready,category:'HASARD'}),/lr-evening-category-hint/);
 assert.doesNotMatch(premiumEveningHtml({...ready,turn:{...ready.turn,next:'b'}}),/lr-evening-category-hint/);
 const css=readFileSync(new URL('./evening-d100-template.css',import.meta.url),'utf8');
 assert.match(css,/\.evening-choice\.lr-choose-category \.lr-category-hint\{/);
 assert.match(css,/grid-row:2!important;grid-column:1\/-1!important/);
 assert.match(css,/\.evening-choice\.lr-choose-category>\.evening-choice-option/);
});
test('LR-020: short mobile calendar can scroll without changing normal-height layout',()=>{
 const css=readFileSync(new URL('./calendar-ruby-template.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:767px\) and \(max-height:650px\)/);
 assert.match(css,/main#app\.has-ruby-calendar\{\s*overflow-x:hidden!important;overflow-y:auto!important/);
 assert.match(css,/\.has-ruby-calendar \.evening-cal-history\{\s*min-height:145px!important;max-height:35dvh!important;\s*overflow-y:auto!important/);
});
