import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewFutureNight,initFutureNightPreview} from './future-night-studio.mjs';
const card=(level,n,target='both',minutes=3)=>({
 id:level+'-'+n,levels:[level],target,minutes,
 title:'Défi du soir '+level+' '+n,
 description:'Un défi complet à réaliser ensemble pour la soirée.'
});
test('5-minute demo uses the existing planner and never inserts Soft for Medium/Intense',()=>{
 const cards=[card('medium',1,'woman',2),card('intense',1,'man',3),
  card('soft',1,'both',2)];
 const result=previewFutureNight(cards,{styleA:'medium',styleB:'intense',minutes:'5'});
 assert.deepEqual(result.items.map(c=>c.level),['medium','intense']);
 assert.deepEqual(result.items.map(c=>c.recipientLabel),['Partenaire A','Partenaire B']);
 assert.equal(result.spentMinutes,5);
 assert.equal(result.simulated,true);
 assert.equal(result.remainingMinutes,0);
});
test('preview cannot start payments, sessions or alter its source cards',()=>{
 const cards=[card('medium',1),card('medium',2),card('medium',3)];
 const snapshot=JSON.stringify(cards);
 const result=previewFutureNight(cards,{styleA:'medium',styleB:'medium',minutes:10});
 assert.equal(result.spentMinutes,9);
 assert.equal(result.remainingMinutes,1);
 assert.equal(result.items.length,3);
 assert.equal(JSON.stringify(cards),snapshot);
 assert.ok(Object.isFrozen(result.items));
});
test('invalid level, duration and duplicate card IDs refuse to simulate',()=>{
 const cards=[card('medium',1)];
 for(const minutes of ['5.0','60','-5',null,0])
  assert.throws(()=>previewFutureNight(cards,{minutes}),/Durée/);
 assert.throws(()=>previewFutureNight(cards,{styleA:'rogue'}),/Intensité/);
 assert.throws(()=>previewFutureNight([cards[0],cards[0]]),/Brouillon/);
});
test('simulation works without real couple identity and without server access',()=>{
 const script=readFileSync(new URL('./future-night-studio.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('./future-card-studio.css',import.meta.url),'utf8');
 assert.doesNotMatch(script,/\bfetch\s*\(|supabase\.|localStorage|sessionStorage/);
 assert.match(script,/demo-partner-a/);
 assert.match(html,/id="future-night-preview-run"/);
 assert.match(html,/id="future-night-duration"/);
 assert.match(html,/aria-live="polite" id="future-night-preview-result"/);
 assert.match(css,/@media\(max-width:720px\)/);
});
test('preview controls render card text as textContent instead of HTML',()=>{
 class El{
  constructor(){this.listeners={};this.children=[];this.textContent='';this.value='';}
  addEventListener(name,handler){this.listeners[name]=handler;}
  appendChild(child){this.children.push(child);}
  replaceChildren(...items){this.children=items;}
  fire(name){return this.listeners[name]?.();}
 }
 const controls=Object.fromEntries(['run','result','a','b','duration'].map(x=>[x,new El()]));
 controls.a.value='medium';controls.b.value='medium';controls.duration.value='5';
 const doc={getElementById(id){return ({
  'future-night-preview-run':controls.run,'future-night-preview-result':controls.result,
  'future-night-style-a':controls.a,'future-night-style-b':controls.b,
  'future-night-duration':controls.duration
 })[id]},createElement:()=>new El()};
 const cards=[card('medium',1)];
 cards[0].title='<img src=x onerror=alert(1)>';
 const preview=initFutureNightPreview(doc,()=>cards);
 assert.ok(preview);
 controls.run.fire('click');
 assert.equal(controls.result.children.length,3);
 const rows=controls.result.children[1].children;
 assert.equal(rows[0].children[0].textContent,'<img src=x onerror=alert(1)>');
 controls.a.fire('change');assert.equal(controls.result.children.length,0);
});
