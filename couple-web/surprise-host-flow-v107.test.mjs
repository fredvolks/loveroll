import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';

const members=[{user_id:'fred',name:'Fred Messely'},{user_id:'emilie',name:'Émilie'}];
const activity={title:'Coucher de soleil sur l’eau',description:'Un beau moment ensemble.'};
const make=(host,options={})=>premiumSurpriseHtml({
 members,activity,now:new Date('2026-10-16T12:00:00-04:00'),
 monthly:{monthly_activity:{face:14},...(host?{monthly_host:{face:host}}:{})},
 ...options
});
const count=(html,needle)=>html.split(needle).length-1;

test('Before D100 roll: one main D100 fills the activity scene, no host stage',()=>{
 const html=premiumSurpriseHtml({members,now:new Date('2026-10-16T12:00:00-04:00')});
 assert.match(html,/waiting-activity/);
 assert.match(html,/data-dice-sides="100"/);
 assert.match(html,/data-action="roll:monthly_activity"/);
 assert.doesNotMatch(html,/surprise-host-legend|surprise-host-winner/);
});
test('D100 confirmed: activity opens; closing it reveals one full-stage host D6',()=>{
 const modal=make(null,{showActivity:true,timerHtml:'<div class="timer">10:00</div>'});
 assert.match(modal,/role="dialog" aria-modal="true" aria-label="Notre activité du mois"/);
 assert.match(modal,/Coucher de soleil sur l’eau/);
 assert.match(modal,/data-action="surprise-activity"/);
 const closed=make(null,{showActivity:false});
 assert.doesNotMatch(closed,/aria-label="Notre activité du mois"/);
 assert.match(closed,/surprise-month has-activity host-pending/);
 assert.match(closed,/surprise-d20-scene surprise-d100-scene surprise-main-die-scene/);
 assert.equal(count(closed,'data-dice-sides="6"'),1);
 assert.match(closed,/data-dice-preview="true"/);
 assert.match(closed,/data-dice-markers="pips"/);
 assert.doesNotMatch(closed,/data-dice-unrolled="true"/);
 assert.equal(count(closed,'data-dice-sides="100"'),0);
 assert.match(closed,/PAIR/);
 assert.match(closed,/IMPAIR/);
 assert.match(closed,/Fred/);
 assert.match(closed,/Émilie/);
 assert.doesNotMatch(closed,/2 · 4 · 6/);
 assert.doesNotMatch(closed,/1 · 3 · 5/);
 assert.equal(count(closed,'data-action="roll:monthly_host"'),1);
 assert.doesNotMatch(closed,/surprise-invite-inside/);
});
test('During D6 roll: only server-confirmed face animates in main scene, button locks',()=>{
 const html=make(null,{rolling:true,rollingKind:'monthly_host',rollFace:5});
 assert.match(html,/data-dice-sides="6"/);
 assert.match(html,/data-face="5"/);
 assert.match(html,/data-spinning="true"/);
 assert.match(html,/data-action="roll:monthly_host" disabled/);
});
test('When the official D6 stops, the same face stays visible for the result pause',()=>{
 const html=make(null,{rolling:true,settlingHost:true,rollingKind:'monthly_host',rollFace:4});
 assert.match(html,/surprise-month has-activity host-pending/);
 assert.match(html,/data-dice-sides="6"/);
 assert.match(html,/data-face="4"/);
 assert.doesNotMatch(html,/data-dice-preview=/);
 assert.match(html,/data-spinning="false"/);
 assert.doesNotMatch(html,/data-dice-unrolled="true"/);
 assert.equal(count(html,'data-dice-sides="100"'),0);
 assert.match(html,/data-action="roll:monthly_host" disabled/);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf("if(kind==='monthly_host'||kind==='monthly_activity'){",app.indexOf('async function animateRoll'));
 const end=app.indexOf("if(kind==='new-challenge')",start);
 assert.ok(start>0&&end>start);
 const hostPause=app.slice(start,end);
 assert.ok(hostPause.includes("state.diceStatus='settled'"));
 assert.ok(hostPause.includes("setTimeout(resolve,1000)"));
 assert.ok(hostPause.includes("await refreshShared()"));
 assert.ok(app.includes("settlingHost:state.diceStatus==='settled'"));
});
test('Duplicate partner display names are allowed; parity follows partner order, not name',()=>{
 const same=[{user_id:'account-f',name:'Fred'},{user_id:'account-g',name:'Fred'}];
 const pending=make(null,{members:same});
 assert.equal(count(pending,'<strong>Fred</strong>'),2);
 for(const face of [1,2,3,4,5,6]){
  const done=make(face,{members:same});
  assert.match(done,/Fred invite cette fois-ci !/);
  assert.equal(count(done,'class="surprise-host-winner"'),1);
 }
});
test('Each official D6 face uses parity; the large D100 comes back with only winner text',()=>{
 for(let face=1;face<=6;face++){
  const html=make(face);
  const name=face%2===0?'Fred':'Émilie';
  assert.match(html,/surprise-month has-activity host-complete/);
  assert.equal(count(html,'data-dice-sides="100"'),1);
  assert.equal(count(html,'data-dice-sides="6"'),0);
  assert.match(html,/data-action="surprise-activity"/);
  assert.doesNotMatch(html,/data-action="roll:monthly_host"|surprise-host-legend|surprise-invite-inside/);
  assert.match(html,new RegExp(name+' invite cette fois-ci !'));
  assert.equal(count(html,'class="surprise-host-winner"'),1);
 }
});
test('Surprise one-screen CSS keeps the same generous stage on phone and desktop',()=>{
 const css=readFileSync(new URL('./surprise-refined-v104.css',import.meta.url),'utf8');
 assert.match(css,/\.surprise-main-die-scene/);
 assert.match(css,/\.surprise-host-winner/);
 assert.match(css,/\.surprise-host-legend/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/@media\(min-width:768px\)/);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/premium-surprise\.mjs\?v=20261018-d100151/);
 assert.match(app,/if\(kind==='monthly_activity'\)state\.showSurpriseActivity=!!state\.monthly\?\.monthly_activity/);
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.match(html,/surprise-refined-v104\.css\?v=20261017-ritual130/);
 assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
});

test('Partners sharing a first name keep their distinct saved names in parity and winner',()=>{
 const html=make(1,{members:[{user_id:'a',name:'Camille'},{user_id:'b',name:'Camille André'}]});
 assert.match(html,/Camille André invite cette fois-ci/);
 const waiting=make(null,{members:[{user_id:'a',name:'Camille'},{user_id:'b',name:'Camille André'}]});
 assert.match(waiting,/<strong>Camille André<\/strong>/);
});
test('Month remains in the photo and uses Toronto month at the UTC boundary',()=>{
 const html=premiumSurpriseHtml({members,now:new Date('2026-11-01T02:00:00Z')});
 assert.match(html,/surprise-month-label"><span>octobre<\/span>/);
 assert.ok(html.indexOf('surprise-main-die-scene')<html.indexOf('surprise-month-label'));
 assert.doesNotMatch(html,/surprise-month-title|surprise-ecrin-note|Appuie pour modifier/);
 assert.doesNotMatch(html,/host-winner|host-legend/);
});
