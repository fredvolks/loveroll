import test from 'node:test';
import assert from 'node:assert/strict';
import {ownEveningChallenges} from './evening-private-queue.mjs';

const own={id:'mine',recipient:'alice',session_id:'evening-1',created_at:'2026-10-30T18:00:00Z'};
const partner={id:'partner',recipient:'bob',session_id:'evening-1',created_at:'2026-10-30T18:01:00Z'};
const malformed={id:'missing-identity',created_at:'2026-10-30T18:02:00Z'};

test('missing Auth identity never selects an unowned or malformed private card',()=>{
 const rows=[malformed,own,partner];
 for(const userId of [undefined,null,'']){
  assert.deepEqual(ownEveningChallenges(rows,userId,'evening-1'),[]);
 }
 for(const sessionId of [undefined,null,'']){
  assert.deepEqual(ownEveningChallenges(rows,'alice',sessionId),[]);
 }
 assert.deepEqual(ownEveningChallenges([malformed],undefined,undefined),[]);
 assert.deepEqual(ownEveningChallenges([{...malformed,recipient:'alice'}],'alice',undefined),[]);
});

test('malformed response types cannot crash or populate a private challenge list',()=>{
 for(const rows of [null,undefined,{},'invalid',{0:own,length:1}]){
  assert.deepEqual(ownEveningChallenges(rows,'alice','evening-1'),[]);
 }
});

test('valid recipient and evening still isolate cards and preserve chronological order',()=>{
 const older={...own,id:'earlier',created_at:'2026-10-30T17:00:00Z'};
 assert.deepEqual(
  ownEveningChallenges([partner,own,malformed,older],'alice','evening-1').map(row=>row.id),
  ['earlier','mine']);
 assert.deepEqual(ownEveningChallenges([own,partner],'bob','evening-1').map(row=>row.id),
  ['partner']);
 assert.deepEqual(ownEveningChallenges([own],'alice','evening-2'),[]);
});
