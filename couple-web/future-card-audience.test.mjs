import test from 'node:test';
import assert from 'node:assert/strict';
import {futureCardRecipients,selectFutureAssignedCard}
 from './future-card-audience.mjs';
const pair=[{user_id:'alice',gender:'her'},{user_id:'bob',gender:'him'}];
const card=(id,target,levels=['medium'])=>({id,target,levels,minutes:3});
const cards=[
 card('one','woman'),card('two','man'),card('three','both'),
 card('four','woman',['intense']),card('five','man',['intense']),
 card('six','both',['soft'])
];
test('Future gender-specific cards identify only the intended recipient',()=>{
 assert.deepEqual(futureCardRecipients(cards[0],pair),['alice']);
 assert.deepEqual(futureCardRecipients(cards[1],pair),['bob']);
 assert.deepEqual(futureCardRecipients(cards[2],pair),['alice','bob']);
 assert.deepEqual(futureCardRecipients(cards[0],[...pair].reverse()),['alice']);
 assert.deepEqual(futureCardRecipients(cards[2],[...pair].reverse()),['bob','alice']);
});
test('Missing, duplicate or ambiguous member genders never target arbitrary accounts',()=>{
 for(const invalid of [[],null,[pair[0]],[
  {user_id:'alice',gender:'her'},{user_id:'alice',gender:'him'}
 ],[{user_id:'alice',gender:'her'}, {user_id:'bob'}]]){
  assert.deepEqual(futureCardRecipients(cards[0],invalid),[]);
 }
 const women=[{user_id:'a',gender:'her'},{user_id:'b',gender:'her'}];
 const men=[{user_id:'a',gender:'him'},{user_id:'b',gender:'him'}];
 assert.deepEqual(futureCardRecipients(cards[0],women),[]);
 assert.deepEqual(futureCardRecipients(cards[1],men),[]);
 assert.deepEqual(futureCardRecipients(cards[2],women),['a','b']);
 assert.deepEqual(futureCardRecipients(cards[2],men),['a','b']);
 assert.deepEqual(futureCardRecipients(cards[2],[{user_id:'a'}, {user_id:'b'}]),['a','b']);
 assert.deepEqual(futureCardRecipients({...cards[0],target:'invalid'},pair),[]);
});
test('Future selected card filters unassignable targets without changing 50/50 style mix',()=>{
 const medium=selectFutureAssignedCard({members:pair,cards,
  styleA:'medium',styleB:'intense',styleTicket:0,cardTicket:0});
 assert.equal(medium.level,'medium');
 assert.equal(medium.candidateCount,3);
 assert.equal(medium.card.id,'one');
 assert.deepEqual(medium.recipientIds,['alice']);
 const intense=selectFutureAssignedCard({members:pair,cards,
  styleA:'medium',styleB:'intense',styleTicket:0.5,cardTicket:0.9});
 assert.equal(intense.level,'intense');
 assert.equal(intense.card.id,'five');
 assert.deepEqual(intense.recipientIds,['bob']);
 const ambiguous=selectFutureAssignedCard({
  members:[{user_id:'a',gender:'her'},{user_id:'b',gender:'her'}],
  cards,styleA:'medium',styleB:'medium',cardTicket:0
 });
 assert.equal(ambiguous.candidateCount,1);
 assert.equal(ambiguous.card.id,'three');
 assert.deepEqual(ambiguous.recipientIds,['a','b']);
});
test('Ineligible bucket is unavailable rather than reusing another category or partner',()=>{
 const onlySoft=[card('a','both',['soft'])];
 const result=selectFutureAssignedCard({
  members:pair,cards:onlySoft,styleA:'medium',styleB:'intense',styleTicket:0,
  cardTicket:0
 });
 assert.equal(result.level,'medium');
 assert.equal(result.card,null);
 assert.deepEqual(result.recipientIds,[]);
});
