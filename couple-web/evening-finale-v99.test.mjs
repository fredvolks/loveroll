import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const base={session:null,lastEvening:{id:'s1',completed:0,responses:1,myResponse:true,partnerResponse:false}};
test('Finished evening has exactly two real buttons, dark start when weekly quota full',()=>{
 const html=premiumEveningHtml({...base,canStartEvening:false});
 assert.match(html,/evening-premium-view is-inactive is-finale/);
 assert.equal((html.match(/<button /g)||[]).length,2);
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
 assert.match(read('index.html'),/evening-editorial\.css\?v=20261017-ritual130/);
 assert.match(read('service-worker.js'),/evening-editorial\.css/);
});
