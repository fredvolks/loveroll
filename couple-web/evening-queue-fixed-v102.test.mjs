import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const app=read('app.js'),css=read('evening-queue-fixed-v102.css');
test('D35 official result is shown for one second after completing the roll animation',()=>{
 const start=app.indexOf('async function animateRoll('),end=app.indexOf('async function hashToken(',start);
 const flow=app.slice(start,end);
 assert.match(flow,/if\(kind==='new-challenge'\)/);
 assert.match(flow,/state\.diceStatus='settled'/);
 assert.match(flow,/await refreshShared\(\)/);
 assert.match(flow,/setTimeout\(resolve,1000\)/);
 assert.ok(flow.indexOf("state.diceStatus='settled'")<flow.indexOf('setTimeout(resolve,1000)'));
 assert.match(app,/state\.selectedEveningChallengeId=drawn\.id/);
});
test('Private queue and full official card remain accessible in an independent detailed workspace',()=>{
 assert.ok(app.includes("evening-queue-modal'+(view?' is-detail':'')"));
 const editorial=read('evening-editorial.css');
 assert.match(editorial,/\.evening-queue-modal\{position:fixed;inset:0/);
 assert.match(editorial,/\.evening-queue-content\{[^}]*overflow:auto/);
 assert.match(read('index.html'),/evening-editorial\.css/);
 assert.match(read('service-worker.js'),/evening-editorial\.css/);
});
