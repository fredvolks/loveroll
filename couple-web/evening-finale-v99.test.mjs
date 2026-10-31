import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml,completedEveningLibraryCount} from './premium-evening.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const base={session:null,lastEvening:{id:'s1',completed:0,responses:1,myResponse:true,partnerResponse:false}};
test('Finished evening has exactly two real buttons, dark start when weekly quota full',()=>{
 const html=premiumEveningHtml({...base,canStartEvening:false});
 assert.match(html,/evening-premium-view is-inactive is-finale/);
 const finaleActions=html.match(/<div class="evening-finale-actions">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(finaleActions,'Le panneau de fin de soirée doit être présent');
 assert.equal((finaleActions.match(/<button\b/g)||[]).length,2,
  'La fin de soirée doit conserver exactement deux actions principales');
 assert.doesNotMatch(html,/data-lr-privacy-hide/, 'Aucun bouton Masquer flottant sur la première page Soirée');
 assert.match(html,/Notre soirée est terminée/);
 assert.match(html,/1 \/ 2 bilans déposés/);
 assert.match(html,/class="evening-finale-start" data-action="new-session" disabled/);
 assert.match(html,/data-action="evening-calendar"/);
 assert.doesNotMatch(html,/Modifier mon bilan|Donner mon bilan|review-open:/);
});
test('If more counted soirées permitted by weekly D6, start button stays live',()=>{
 const html=premiumEveningHtml({...base,canStartEvening:true});
 assert.match(html,/class="evening-finale-start" data-action="new-session">/);
 assert.doesNotMatch(html,/data-action="new-session" disabled/);
});
test('Premium finale uses one decorative 3D D100; mobile and desktop CSS is isolated',()=>{
 const html=premiumEveningHtml({...base,canStartEvening:false});
 assert.deepEqual([...html.matchAll(/data-dice-sides="(\d+)"/g)].map(match=>Number(match[1])),[100]);
 assert.match(html,/data-dice-preview="true"/);
 assert.match(html,/evening-finale-velvet/);
 assert.match(read('evening-editorial.css'),/\.evening-finale-start:disabled/);
 assert.match(read('index.html'),/evening-editorial\.css\?v=20261028-lr027/);
 assert.match(read('service-worker.js'),/evening-editorial\.css/);
});


test('200-card progress uses stable card IDs, not the D100 roll face',()=>{
 const completed=(category,card_id,face)=>({category,card_id,face,status:'completed'});
 const history=[
  completed('SENSUEL',12,48),completed('SENSUEL',12,65),
  completed('SENSUEL',13,48),completed('SEXUEL',12,48),
  {...completed('SEXUEL',12,99),status:'passed'},
  {...completed('SEXUEL',14,99),status:'refused'}
 ];
 assert.equal(completedEveningLibraryCount(history),3);
 const markup=premiumEveningHtml({
  session:null,lastEvening:null,challengeHistory:history
 });
 assert.match(markup,/>3 \/ 200</);
});
test('200-card progress preserves legacy face-only records and rejects corrupt modern card IDs',()=>{
 const history=[
  {category:'SENSUEL',face:9,status:'completed'},
  {category:'COQUIN',face:3,status:'completed'},
  {category:'SEXUEL',card_id:4,face:3,status:'completed'},
  {category:'SENSUEL',card_id:101,face:7,status:'completed'},
  {category:'SENSUEL',card_id:'invalid',face:8,status:'completed'},
  {category:'MIXTE',card_id:6,face:6,status:'completed'},
  {category:'SENSUEL',card_id:4.5,face:4,status:'completed'}
 ];
 assert.equal(completedEveningLibraryCount(history),3);
 for(const malformed of [null,{},'invalid',false]){
  assert.equal(completedEveningLibraryCount(malformed),0);
 }
 assert.equal(history[0].face,9,'the original history must never change');
});
