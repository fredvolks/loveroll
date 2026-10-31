import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFutureCardDrafts} from './future-card-compare.mjs';
const card=(id,fields={})=>({
 id,title:'Défi unique '+id,
 description:'Une consigne complète pour ce défi original à deux.',
 minutes:3,levels:['soft'],target:'both',...fields
});
test('comparison reports added, removed, modified and unchanged cards',()=>{
 const old=[card('same'),card('update'),card('removed')];
 const now=[card('same'),card('update',{minutes:5,target:'woman'}),card('added')];
 const r=compareFutureCardDrafts(old,now);
 assert.deepEqual([r.added,r.removed,r.modified,r.unchanged],[1,1,1,1]);
 assert.equal(r.totalChanges,3);
 assert.equal(r.totalSaved,3);assert.equal(r.totalCurrent,3);
 assert.deepEqual(r.details.map(x=>x.type),['modified','removed','added']);
 assert.deepEqual(r.details[0].fields,['target','minutes']);
});
test('level membership order does not count as a changed card',()=>{
 const before=[card('same',{levels:['soft','medium']})];
 const after=[card('same',{levels:['medium','soft']})];
 const r=compareFutureCardDrafts(before,after);
 assert.equal(r.unchanged,1);assert.equal(r.totalChanges,0);
});
test('text edits and changed level memberships are reported without content mutation',()=>{
 const before=[card('a',{title:'Version initiale'})],copy=JSON.stringify(before);
 const after=[card('a',{title:'Titre différent',levels:['intense']})];
 const result=compareFutureCardDrafts(before,after);
 assert.deepEqual(result.details[0].fields,['title','levels']);
 assert.equal(JSON.stringify(before),copy);
 assert.ok(Object.isFrozen(result.details[0].fields));
});
test('bad or duplicated identities are refused, and display list is bounded',()=>{
 assert.throws(()=>compareFutureCardDrafts([card('a'),card('a')],[]),/identifiants/);
 assert.throws(()=>compareFutureCardDrafts([],[{id:'<img>'}]),/identifiants/);
 assert.throws(()=>compareFutureCardDrafts([],[card('a')],{maxDetails:101}),/Limite/);
 const data=Array.from({length:40},(_,i)=>card('added-'+i));
 const result=compareFutureCardDrafts([],data,{maxDetails:3});
 assert.equal(result.added,40);assert.equal(result.details.length,3);
});
