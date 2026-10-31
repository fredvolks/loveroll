import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFutureNightPlan,FUTURE_NIGHT_LENGTHS}
 from './future-night-plan.mjs';
const members=[{user_id:'one',gender:'her'},{user_id:'two',gender:'him'}];
const card=(level,index,minutes=3,target='both')=>({
 id:level+'-'+index,levels:[level],target,minutes
});
const many=(count=10,minutes=3)=>[
 ...Array.from({length:count},(_,i)=>card('medium',i,minutes)),
 ...Array.from({length:count},(_,i)=>card('intense',i,minutes)),
 ...Array.from({length:count},(_,i)=>card('soft',i,minutes))
];

test('Future planner fills 15 minutes, alternating medium/intense without any Soft',()=>{
 const all=many();
 const plan=buildFutureNightPlan({
  members,cards:all,styleA:'medium',styleB:'intense',minutes:15,
  cardTickets:Array(5).fill(0)
 });
 assert.equal(plan.requestedMinutes,15);
 assert.equal(plan.spentMinutes,15);
 assert.equal(plan.remainingMinutes,0);
 assert.equal(plan.reason,'duration');
 assert.deepEqual(plan.items.map(item=>item.level),[
  'medium','intense','medium','intense','medium'
 ]);
 assert.deepEqual(plan.items.map(item=>item.fromMinute),[0,3,6,9,12]);
 assert.deepEqual(plan.items.map(item=>item.toMinute),[3,6,9,12,15]);
 assert.equal(new Set(plan.items.map(item=>item.cardId)).size,5);
 assert.ok(plan.items.every(item=>item.recipientIds.length===2));
});
test('Five-minute night uses whole 2-3 minute cards, never cuts a timer',()=>{
 const cards=[card('medium',1,2),card('intense',1,3),card('soft',1,2)];
 const plan=buildFutureNightPlan({members,cards,styleA:'medium',
  styleB:'intense',minutes:5,cardTickets:[0,0]});
 assert.deepEqual(plan.items.map(item=>item.minutes),[2,3]);
 assert.equal(plan.spentMinutes,5);
 assert.equal(plan.remainingMinutes,0);
 assert.ok(!plan.items.some(item=>item.level==='soft'));
});
test('No eligible card never backfills from a third style or reuses a previous card',()=>{
 const cards=[card('medium',1,4),card('intense',2,6),card('soft',3,2)];
 const plan=buildFutureNightPlan({members,cards,
  styleA:'medium',styleB:'intense',minutes:10,cardTickets:[0,0]});
 assert.equal(plan.spentMinutes,10);
 assert.equal(plan.items.length,2);
 const missing=buildFutureNightPlan({members,cards,
  styleA:'medium',styleB:'intense',minutes:10,
  excludedIds:['intense-2'],cardTickets:[0,0]});
 assert.equal(missing.items.length,1);
 assert.equal(missing.reason,'no-eligible-card');
 assert.equal(missing.remainingMinutes,6);
 assert.equal(missing.items[0].level,'medium');
 const tooShort=buildFutureNightPlan({members,cards,
  styleA:'medium',styleB:'intense',minutes:5,cardTickets:[0,0]});
 assert.equal(tooShort.spentMinutes,4);
 assert.equal(tooShort.remainingMinutes,1);
 assert.equal(tooShort.reason,'duration');
 const excluded=buildFutureNightPlan({members,cards,
  styleA:'medium',styleB:'intense',minutes:10,excludedIds:['medium-1'],
  cardTickets:[0]});
 assert.deepEqual(excluded.items,[]);
 assert.equal(excluded.reason,'no-eligible-card');
});
test('User-selected 10/30 minute and free plans are bounded and keep both recipients',()=>{
 assert.deepEqual(FUTURE_NIGHT_LENGTHS,[5,10,15,30,'libre']);
 for(const minutes of [10,30]){
  const plan=buildFutureNightPlan({
   members,cards:many(20,2),styleA:'medium',styleB:'medium',
   minutes,maxCards:20
  });
  assert.equal(plan.spentMinutes,minutes);
  assert.equal(plan.items.length,minutes/2);
  assert.ok(plan.items.every(x=>x.level==='medium'));
 }
 const free=buildFutureNightPlan({members,cards:many(12,2),
  styleA:'medium',styleB:'intense',minutes:'libre',maxCards:4});
 assert.equal(free.items.length,4);
 assert.equal(free.spentMinutes,8);
 assert.equal(free.remainingMinutes,null);
 assert.equal(free.reason,'limit');
 assert.equal(free.requestedMinutes,'libre');
 const oldAlias=buildFutureNightPlan({members,cards:many(4,2),
  styleA:'medium',styleB:'medium',minutes:'free',maxCards:2});
 assert.equal(oldAlias.requestedMinutes,'libre');
 assert.equal(oldAlias.items.length,2);
});
test('Existing dropdown values use strings but only four approved numeric lengths',()=>{
 const plan=buildFutureNightPlan({members,cards:many(10,3),
  styleA:'medium',styleB:'medium',minutes:'15'});
 assert.equal(plan.requestedMinutes,15);
 assert.equal(plan.spentMinutes,15);
 for(const invalid of ['0','8','five','15.0',' 15 ',{}])
  assert.throws(()=>buildFutureNightPlan({minutes:invalid}),/Durée/);
});
test('Future planner rejects bad client input and missing partner without assigning cards',()=>{
 for(const minutes of [0,-5,8,Infinity,NaN,null]){
  assert.throws(()=>buildFutureNightPlan({minutes}),/Durée/);
 }
 for(const maxCards of [0,-1,101,1.5,Infinity]){
  assert.throws(()=>buildFutureNightPlan({maxCards}),/Nombre/);
 }
 assert.throws(()=>buildFutureNightPlan({cards:null}),/Liste/);
 assert.throws(()=>buildFutureNightPlan({excludedIds:null}),/Liste/);
 assert.throws(()=>buildFutureNightPlan({cardTickets:'not-array'}),/Liste/);
 assert.throws(()=>buildFutureNightPlan({members,cards:many(),cardTickets:[1]}),/Tirage/);
 assert.throws(()=>buildFutureNightPlan({members,cards:many(),cardTickets:[]}),/Tirage/);
 const unknown=buildFutureNightPlan({members:[],cards:many(),minutes:15});
 assert.deepEqual(unknown.items,[]);
 assert.equal(unknown.reason,'no-eligible-card');
});
