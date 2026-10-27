import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSoireeQaScreen,mountSoireeQaBench} from './soiree-qa-lab.mjs';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const couple='33333333-3333-4333-8333-333333333333';
const session='44444444-4444-4444-8444-444444444444';
const challenge='55555555-5555-4555-8555-555555555555';
const base={userId:a,coupleId:couple,weekly:[{face:4,key:'2026-10-26'}],
 session:{id:session},personal:[{user_id:a,face:5},{user_id:b,face:3}],
 mine:[{id:challenge,recipient:a,face:47,category:'MIXTE',status:'proposed',
  card_title:'Défi <privé>',card_description:'Juste pour toi & personne d’autre',card_id:47}]};
test('QA screens show only real saved D6/D100 values and escaped recipient-private text',()=>{
 const rendered=renderSoireeQaScreen({role:'A',snapshot:base,partnerId:b,weekKey:'2026-10-26'});
 assert.match(rendered,/Résultat officiel : 4/);
 assert.match(rendered,/Résultat officiel : 5/);
 assert.match(rendered,/Résultat officiel : 47/);
 assert.match(rendered,/Défi &lt;privé&gt;/);
 assert.match(rendered,/Juste pour toi &amp; personne/);
 assert.match(rendered,/answer:55555555-5555-4555-8555-555555555555:accepted/);
 assert.doesNotMatch(rendered,/<privé>/);
 assert.match(rendered,/data-soiree-qa-action="d100"/);
});
test('No D100 or fake challenge until both actual D6 are server confirmed',()=>{
 const rendered=renderSoireeQaScreen({role:'A',snapshot:{
  ...base,personal:[{user_id:a,face:5}],mine:[]},partnerId:b,weekKey:'2026-10-26'});
 assert.match(rendered,/data-soiree-qa-action="d100" disabled/);
 assert.match(rendered,/Pas encore lancé/);
 assert.doesNotMatch(rendered,/Résultat officiel : 47/);
});
test('an absent server session only offers the owner a real start, never a mock',()=>{
 const rendered=renderSoireeQaScreen({role:'A',snapshot:{
  ...base,session:null,mine:[],personal:[]},partnerId:b,weekKey:'2026-10-26'});
 assert.match(rendered,/data-soiree-qa-action="start"/);
 assert.doesNotMatch(rendered,/Résultat officiel : 5/);
 const other=renderSoireeQaScreen({role:'B',snapshot:{
  ...base,userId:b,session:null,mine:[],personal:[]},partnerId:a,weekKey:'2026-10-26'});
 assert.match(other,/data-soiree-qa-action="start" disabled/);
});
test('laboratory refuses duplicated accounts before it mounts any player',()=>{
 assert.throws(()=>mountSoireeQaBench({
  root:{},clientA:{},clientB:{},userA:{id:a},userB:{id:a}
 }),/indépendants/);
});

test('Soirée QA caps WebGL contexts when many D100 challenges exist',()=>{
 const many=Array.from({length:18},(_,n)=>({
  id:'55555555-5555-4555-8555-'+String(n+1).padStart(12,'0'),
  recipient:a,face:n+1,category:'MIXTE',status:n===17?'proposed':'completed',
  card_id:n+1,card_title:'Carte '+(n+1),card_description:'Une idée autorisée'
 }));
 const markup=renderSoireeQaScreen({role:'A',snapshot:{...base,mine:many},partnerId:b,weekKey:'2026-10-26'});
 const gpuContexts=(markup.match(/<canvas /g)||[]).length;
 assert.ok(gpuContexts<=2,'A player gets max one D6 and one D100 WebGL renderer');
 assert.equal((markup.match(/soiree-qa-challenge/g)||[]).length,18);
 assert.match(markup,/Résultat officiel : 18/);
});

test('Soirée QA Passer / Refuser uses the current atomic LR-015 RPC actions',()=>{
 const screen=renderSoireeQaScreen({role:'A',snapshot:base,partnerId:b});
 assert.match(screen,/redraw:55555555-5555-4555-8555-555555555555:pass:no/);
 assert.match(screen,/redraw:55555555-5555-4555-8555-555555555555:refuse:yes/);
 assert.doesNotMatch(screen,/answer:55555555-5555-4555-8555-555555555555:passed/);
});

test('a stale saved weekly D6 never masquerades as this week’s official result',()=>{
 const markup=renderSoireeQaScreen({role:'A',snapshot:base,partnerId:b,weekKey:'2026-11-02'});
 assert.match(markup,/Semaine québécoise du 2026-11-02/);
 assert.match(markup,/Résultat précédent : 4/);
 assert.doesNotMatch(markup,/Résultat officiel : 4/);
 assert.match(markup,/Brasser le vrai D6 hebdomadaire/);
});
test('Toronto week starts on Monday across DST boundary',async()=>{
 const {currentTorontoWeekKey}=await import('./soiree-qa-lab.mjs');
 assert.equal(currentTorontoWeekKey(new Date('2026-10-27T23:30:00Z')),'2026-10-26');
 assert.equal(currentTorontoWeekKey(new Date('2026-11-02T04:45:00Z')),'2026-10-26');
 assert.equal(currentTorontoWeekKey(new Date('2026-11-02T05:30:00Z')),'2026-11-02');
});
