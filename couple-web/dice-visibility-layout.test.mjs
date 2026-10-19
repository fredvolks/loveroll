import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {premiumHomeHtml} from './premium-home.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const homeCss=read('premium-home.css'),eveningCss=read('premium-couple-pages.css'),app=read('app.js'),engine=read('dice3d.js');
const engraving=read('dice-engraving.mjs');
test('Home D6 stays centered inside the satin theater, clear of the roll button',()=>{
 const css=homeCss;
 // home-podium-browser-check measures the real mesh against the marble.
 assert.doesNotMatch(css,/transform:translateY\(-8%\)/);
 assert.ok(engine.includes("podiumSelector='.home-die-theater,"));
 assert.match(engine,/const current=canvas\.closest\(podiumSelector\)/);
 const page=premiumHomeHtml({weekly:{face:1},members:[{name:'Moi'},{name:'Partenaire'}]});
 const theater=page.indexOf('class="home-die-theater"'),canvas=page.indexOf('canvas class="dice-canvas"',theater);
 const control=page.indexOf('class="home-roll-area"',theater);
 assert.ok(theater>=0&&canvas>theater&&control>canvas);
 assert.match(page,/data-dice-sides="6"/);
 assert.match(page,/data-face="1"/);
});
test('Before any evening D6 roll only our die is rendered; partner has a status badge',()=>{
 const people=[{user_id:'a',name:'Camille'},{user_id:'b',name:'Noémie'}];
 const html=premiumEveningHtml({session:{id:'session'},members:people,me:'a',rolls:[],status:{},turn:{}});
 const start=html.indexOf('class="evening-d6-grid"'),end=html.indexOf('class="evening-ready ',start);
 assert.ok(start>=0&&end>start);
 const step=html.slice(start,end);
 assert.equal((step.match(/data-dice-unrolled="true"/g)||[]).length,1);
 assert.equal((step.match(/data-dice-markers="hearts"/g)||[]).length,1);
 assert.match(step,/evening-partner-card is-pending/);
 assert.ok(step.indexOf('canvas class="dice-canvas"')<step.indexOf('data-action="my-d6"'));
 assert.match(step,/data-action="my-d6"/);
 assert.doesNotMatch(step,/aria-label="Total actuel \d+ défis/);
 assert.match(eveningCss,/\.love3d-stage\.is-unrolled \.dice-canvas\{[\s\S]*?visibility:visible!important/);
 assert.doesNotMatch(app,/canvas\.dataset\.diceUnrolled!=='true'/);
});
test('Decorative 3D D6 has identical heart on every face, not fake official pips',()=>{
 assert.match(engine,/const neutral=canvas\.dataset\.diceUnrolled==='true'&&sides===6/);
 assert.match(engraving,/if\(neutral\)return \[heartShape\(0,0,\.78\)\]/);
 assert.match(engine,/faceMarks\(sides,value,pips,neutral\)/);
 const people=[{user_id:'a',name:'Camille'},{user_id:'b',name:'Noémie'}];
 const page=premiumEveningHtml({session:{id:'session'},members:people,me:'a',
  rolls:[{user_id:'a',face:4}],status:{my_rolled:true},turn:{ready:false}});
 assert.match(page,/data-face="4"/);
 assert.equal((page.match(/data-dice-unrolled="true"/g)||[]).length,0);
 assert.match(page,/evening-partner-card is-pending/);
 assert.match(page,/aria-label="Total actuel 4 défis; dé initial 4"/);
});

test('Surprise D20 and D6 stay inside the scene, not over their buttons',()=>{
 const css=read('dice-no-overlay.css');
 const fixture=read('__premium-couple-pages-test.html');
 const visual=read('premium-couple-visual-check.cjs');
 assert.match(css,/\.love3d-stage \.dice-canvas\{[\s\S]*?position:absolute!important/);
 assert.match(css,/\.surprise-d20-scene,\.surprise-host-die\{[\s\S]*?overflow:hidden/);
 assert.match(css,/\.surprise-d20-scene \.dice-canvas,\.surprise-host-die \.dice-canvas\{[\s\S]*?position:absolute!important/);
 assert.match(fixture,/dice-no-overlay\.css/);
 assert.match(fixture,/evening-editorial\.css/);
 assert.match(visual,/surpriseDice/);
 assert.match(visual,/noButtonOverlap/);
});
