import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const members=[{user_id:'mine',name:'Marie'}, {user_id:'friend',name:'Fred'}];
const render=rolls=>premiumEveningHtml({
 session:{id:'test',paired_turns:true,self_draws:true},
 me:'mine',members,rolls,status:{my_rolled:false,partner_rolled:false,both_ready:false},
 playable:{sensual:35,sexual:35,total:70}
});
test('Partner status is explicit while official D6 is pending',()=>{
 const html=render([]);
 assert.match(html,/En attente du lancer de Fred/);
 assert.doesNotMatch(html,/Fred a obtenu/);
});
test('Partner status uses only confirmed personal D6 result',()=>{
 const html=render([{user_id:'friend',face:4}]);
 assert.match(html,/Fred a obtenu 4 défis/);
 assert.doesNotMatch(html,/En attente du lancer de Fred/);
});
test('Single result uses correct singular',()=>{
 assert.match(render([{user_id:'friend',face:1}]),/Fred a obtenu 1 défi/);
});
test('Editorial personal die and partner status use one mobile column',()=>{
 const css=read('evening-editorial.css');
 assert.match(css,/grid-template-rows:minmax\(0,1fr\) auto/);
 assert.match(css,/\.evening-partner-mobile-status/);
 assert.match(css,/64vw,260px,33dvh/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(read('index.html'),/evening-editorial\.css/);
 assert.match(read('service-worker.js'),/evening-editorial\.css/);
});
