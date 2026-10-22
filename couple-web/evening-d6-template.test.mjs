import test from 'node:test';
import assert from 'node:assert/strict';
import {eveningOddsHtml} from './evening-d6-template.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';
test('Evening info uses evening defaults, custom weights, or uniform odds without weekly rules',()=>{
 const defaults=eveningOddsHtml();
 assert.match(defaults,/30 %/);assert.match(defaults,/20 %/);assert.doesNotMatch(defaults,/50 %|soirées cette semaine|1x|2x/);
 assert.match(defaults,/nombre de défis pour cette soirée/);
 assert.equal((eveningOddsHtml([0,0,0,0,0,100]).match(/100 %/g)||[]).length,1);
 assert.equal((eveningOddsHtml([0,0,0,0,0,100],false).match(/16,7 %/g)||[]).length,6);
});
test('Unrolled and pending own D6 keep decorative white pips and never invent an official count',()=>{
 for(const rolling of [false,true]){
  const html=premiumEveningHtml({session:{id:'s'},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],me:'a',status:{both_ready:false},rolling,rollingKind:'my-d6'});
  assert.match(html,/data-dice-preview="true"/);
  assert.doesNotMatch(html,/data-dice-markers="hearts"/);
  assert.match(html,/evening-face-result is-empty/);
  assert.doesNotMatch(html,/Découvrir Éclat/);
 }
});
