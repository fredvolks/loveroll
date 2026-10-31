import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFutureCardFile,initFutureCardStudio} from './future-card-studio.mjs';

const sample=()=>['soft','medium','intense'].flatMap(level=>
 Array.from({length:100},(_,i)=>({id:level+'-'+i,levels:[level],
  target:['woman','man','both'][i%3],minutes:2+i%5,
  title:'Défi original '+level+' '+i,
  description:'Un défi unique complet '+level+' numéro '+i+
   ' à jouer seulement si les deux partenaires sont d’accord.'})));

test('admin import validates 100/100/100 playable cards with balanced audiences',()=>{
 const report=inspectFutureCardFile(sample());
 assert.equal(report.valid,true,report.errors.join('\n'));
 assert.equal(report.total,300);
 assert.deepEqual(Object.values(report.counts).map(c=>c.total),[100,100,100]);
});
test('admin preview accepts reused card across two levels without duplicating id',()=>{
 const cards=sample(), reusable=cards[0];
 reusable.levels=['soft','medium'];
 cards.splice(cards.findIndex(c=>c.id==='medium-0'),1);
 // Shift one Medium target from woman to both to stay within 1 count.
 const middle=cards.filter(c=>c.levels.includes('medium'));
 // Source memberships now have soft-0(woman), plus medium-1(man) onward:
 // totals: woman 34, man 33, both 33 = balanced.
 const report=inspectFutureCardFile(cards);
 assert.equal(report.valid,true,report.errors.join('\n'));
 assert.equal(report.total,299);
 assert.equal(report.counts.medium.total,100);
});
test('drafts, malicious markup and oversized input are rejected',()=>{
 assert.equal(inspectFutureCardFile({cards:sample()}).valid,false);
 assert.equal(inspectFutureCardFile(null).valid,false);
 assert.equal(inspectFutureCardFile(Array(1001).fill(null)).valid,false);
 const broken=sample();
 broken[1].description='<script>alert(1)</script>';
 broken[2].minutes=7;
 assert.equal(inspectFutureCardFile(broken).valid,false);
 assert.ok(inspectFutureCardFile(broken).errors.length>0);
});
test('Studio view remains inside authenticated admin, read-only and mobile friendly',()=>{
 const html=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('./future-card-studio.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('./future-card-studio.mjs',import.meta.url),'utf8');
 assert.match(html,/<section data-panel="catalogue" hidden>/);
 assert.match(html,/id="future-catalog-check"/);
 assert.match(html,/type="button" class="secondary" id="future-catalog-check"/);
 assert.match(html,/future-card-studio.mjs/);
 assert.match(html,/future-card-studio.css/);
 assert.match(html,/role="status"/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(js,/\bfetch\s*\(|localStorage|sessionStorage|supabase\.(?:from|rpc)/);
});
test('cancel an old local file read when another file is selected',async()=>{
 class Element{
  constructor(){this.listeners={};this.children=[];this.textContent='';this.files=[];this.disabled=false}
  addEventListener(type,callback){this.listeners[type]=callback}
  replaceChildren(...v){this.children=v}
  appendChild(node){this.children.push(node)}
  fire(type){return this.listeners[type]?.()}
 }
 const ids=Object.fromEntries(['future-catalog-file','future-catalog-check',
  'future-catalog-feedback','future-catalog-result'].map(id=>[id,new Element()]));
 const doc={getElementById:id=>ids[id],createElement:()=>new Element()};
 assert.equal(initFutureCardStudio(doc),true);
 let resolveFirst;
 const first={name:'first.json',size:100,text:()=>new Promise(r=>resolveFirst=r)};
 ids['future-catalog-file'].files=[first];
 const pending=ids['future-catalog-check'].fire('click');
 ids['future-catalog-file'].files=[{name:'second.json',size:100,text:async()=>JSON.stringify(sample())}];
 ids['future-catalog-file'].fire('change');
 await ids['future-catalog-check'].fire('click');
 resolveFirst(JSON.stringify([]));await pending;
 assert.match(ids['future-catalog-feedback'].textContent,/vérifié localement/);
 assert.equal(ids['future-catalog-result'].children[0].textContent,
  'Catalogue conforme sur le contenu. Publication non disponible.');
});
