import test from 'node:test';
import assert from 'node:assert/strict';
import {customCardSlots,editableCardSlots,playableEveningCount} from './evening-challenges.mjs';

test('Missing, incomplete or null card collections never crash a 100-card editor',()=>{
 for(const cards of [null,undefined,{},'corrupt',[],[null,undefined,0,'junk']]){
  const custom=customCardSlots('SENSUEL',cards);
  const editable=editableCardSlots('SEXUEL',cards);
  assert.equal(custom.length,75);
  assert.equal(editable.length,100);
  assert.ok(custom.every(row=>row.filled===false));
  assert.equal(editable.filter(row=>row.filled).length,25);
  assert.deepEqual(playableEveningCount(cards),{total:50,sensual:25,sexual:25});
 }
 assert.throws(()=>customCardSlots('COQUIN',null),/Catégorie/);
 assert.throws(()=>editableCardSlots('INVALID',null),/Catégorie/);
});

test('The library retains FIRST-match behavior for duplicate cards and respects category boundaries',()=>{
 const first={category:'SENSUEL',card_id:29,title:'Premier titre',
  description:'Première description',timer_minutes:4,recipient_user_id:'alice'};
 const second={...first,title:'Doublon à ignorer',timer_minutes:8};
 const cards=[null,{category:'SEXUEL',card_id:29,title:'Sexuel',
   timer_minutes:6},first,second,
  {category:'SENSUEL',card_id:3,title:'Original adapté',description:'Desc',timer_minutes:null},
  {category:'SENSUEL',card_id:0,title:'Hors limites'},
  {category:'SENSUEL',card_id:101,title:'Hors limites'},
  {category:'SENSUEL',card_id:'30',title:'Identifiant non valide'}];
 const row=customCardSlots('SENSUEL',cards)[3];
 assert.equal(row.cardId,29);
 assert.equal(row.title,'Premier titre');
 assert.equal(row.minutes,4);
 assert.equal(row.recipientId,'alice');
 const editable=editableCardSlots('SENSUEL',cards);
 assert.equal(editable[28].title,'Premier titre');
 assert.equal(editable[28].saved,true);
 assert.equal(editable[2].title,'Original adapté');
 assert.equal(editable[2].minutes,null);
 assert.equal(editable[29].filled,false);
 const sexual=editableCardSlots('SEXUEL',cards);
 assert.equal(sexual[28].title,'Sexuel');
 assert.equal(playableEveningCount(cards).total,52);
});

test('Hundreds of saved cards map to stable 100-slot results without changing original arrays',()=>{
 const cards=Array.from({length:100},(_,i)=>({category:'SENSUEL',card_id:i+1,
  title:'Carte '+(i+1),description:'Une description valide',timer_minutes:2}));
 const snapshot=JSON.stringify(cards);
 const slots=editableCardSlots('SENSUEL',cards);
 assert.equal(slots.length,100);
 assert.equal(slots.filter(s=>s.filled).length,100);
 assert.equal(slots[99].cardId,100);
 assert.equal(slots[99].title,'Carte 100');
 assert.deepEqual(playableEveningCount(cards),{total:125,sensual:100,sexual:25});
 assert.equal(JSON.stringify(cards),snapshot,'indexing must never mutate stored cards');
});
