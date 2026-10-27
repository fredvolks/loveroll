import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSoireeQaScreen,mountSoireeQaBench} from './soiree-qa-lab.mjs';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const couple='33333333-3333-4333-8333-333333333333';
const session='44444444-4444-4444-8444-444444444444';
const challenge='55555555-5555-4555-8555-555555555555';
const base={userId:a,coupleId:couple,
 passQuota:{can_pass:true,remaining:2,used:1,limit:3},
 weekly:[{face:4,key:'2026-10-26'}],
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

test('QA Passer disabled at actual monthly quota; Refuser remains accessible',()=>{
 const screen=renderSoireeQaScreen({role:'A',snapshot:{
  ...base,passQuota:{can_pass:false,remaining:0,used:3,limit:3}
 },partnerId:b});
 assert.match(screen,/data-soiree-qa-action="redraw:55555555-5555-4555-8555-555555555555:pass:no" disabled/);
 assert.match(screen,/data-soiree-qa-action="redraw:55555555-5555-4555-8555-555555555555:refuse:no"/);
 assert.doesNotMatch(screen,/data-soiree-qa-action="redraw:55555555-5555-4555-8555-555555555555:refuse:no" disabled/);
 const unavailable=renderSoireeQaScreen({role:'A',snapshot:{...base,passQuota:null},partnerId:b});
 assert.match(unavailable,/Passer — quota indisponible/);
});

test('actual Soirée QA click router respects independent A/B JWT gateways across branches',async()=>{
 const screens={A:{innerHTML:'',replaceChildren(){}},B:{innerHTML:'',replaceChildren(){}}};
 const events={},trace=[],errors=[],message={textContent:''};
 let approveCategory=true,approveExclude=true;
 const confirmations=[];
 const root={
  addEventListener(kind,fn){events[kind]=fn;},
  removeEventListener(kind){delete events[kind];},
  contains(){return true;},
  querySelector(sel){
   if(sel==='[data-soiree-qa-message]')return message;
   if(sel.includes('data-soiree-qa-screen="A"'))return screens.A;
   if(sel.includes('data-soiree-qa-screen="B"'))return screens.B;
   if(sel.startsWith('[data-soiree-qa-category='))return {value:'SENSUEL'};
   return null;
  },
  querySelectorAll(sel){
   if(sel==='[data-soiree-qa-screen]')return Object.values(screens);
   return [];
  }
 };
 const sharedChallenge={id:challenge,recipient:b,category:'MIXTE',
  face:28,card_title:'Invitation B',card_description:'Privée',status:'proposed'};
 const fakeGateway=({expectedUserId})=>{
  const role=expectedUserId===a?'A':'B';
  const call=(action,payload)=>{trace.push({role,action,payload});return true;};
  return {
   async snapshot(){return {userId:expectedUserId,coupleId:couple,
    session:{id:session},weekly:[],personal:[],passQuota:{can_pass:true,remaining:1},
    mine:role==='B'?[sharedChallenge]:[],board:null};},
   async weekly(){return call('weekly');},
   async start(){return call('start');},
   async d6(id){return call('d6',id);},
   async d100(id,cat){return call('d100',[id,cat]);},
   async answer(id,action){return call('answer',[id,action]);},
   async redraw(id,action,options){return call('redraw',[id,action,options]);},
   async stop(id){return call('stop',id);}
  };
 };
 const bench=mountSoireeQaBench({root,clientA:{},clientB:{},
  userA:{id:a},userB:{id:b},gatewayFactory:fakeGateway,
  loadDice:async()=>({dieOn:()=>()=>{}}),
  confirmCategory:async({category,percentage})=>{
   confirmations.push([category,percentage]);
   return {confirmed:approveCategory,neverShow:false};
  },
  confirmExclude:async()=>approveExclude,
  refreshMs:600000,onError:e=>errors.push(e.message)});
 const settle=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
 const click=async(role,action)=>{
  const button={dataset:{soireeQaRole:role,soireeQaAction:action},disabled:false};
  events.click({target:{closest:()=>button}});
  await settle();
 };
 await settle();
 assert.match(screens.A.innerHTML,/Joueur A/);
 assert.match(screens.B.innerHTML,/Joueur B/);
 await click('A','weekly');
 await click('B','personal-d6');
 await click('A','d100');
 await click('B','answer:'+challenge+':accepted');
 await click('B','redraw:'+challenge+':refuse:yes');
 assert.deepEqual(trace.map(x=>x.role+':'+x.action),
  ['A:weekly','B:d6','A:d100','B:answer','B:redraw']);
 assert.deepEqual(trace.at(-1).payload,[challenge,'refuse',{exclude:true}]);
 approveExclude=false;
 await click('B','redraw:'+challenge+':refuse:yes');
 assert.equal(trace.length,5,'annuler une exclusion ne doit jamais changer les RPC QA');
 approveExclude=true;
 assert.deepEqual(confirmations,[['SENSUEL',88]]);
 approveCategory=false;
 await click('B','d100');
 assert.equal(trace.length,5,'cancelled confirmation cannot call a real D100');
 assert.deepEqual(confirmations,[['SENSUEL',88],['SENSUEL',88]]);
 // Deliberately try the other partner's challenge: it must not dispatch.
 await click('A','answer:'+challenge+':accepted');
 assert.equal(trace.length,5);
 assert.match(message.textContent,/Défi non destiné/);
 assert.ok(errors.some(e=>e.includes('Défi non destiné')));
 bench.destroy();
 assert.equal(events.click,undefined);
});

test('QA Soirée follows official Sensuel/Sexuel/Hasard selection, not internal Mixte',()=>{
 const markup=renderSoireeQaScreen({role:'A',snapshot:base,partnerId:b});
 assert.match(markup,/<option value="SENSUEL">Sensuel/);
 assert.match(markup,/<option value="SEXUEL">Sexuel/);
 assert.match(markup,/<option value="HASARD">Hasard/);
 assert.doesNotMatch(markup,/<option value="MIXTE">/);
});
