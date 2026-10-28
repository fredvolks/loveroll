import test from 'node:test';
import assert from 'node:assert/strict';
import {canReuseEclatV2Editor} from './eclat-v2-live-ownership.mjs';

const real={
 server:{access:true,active:true,session_id:'44444444-4444-4444-8444-444444444444'},
 player:{access:true,active:true,session_id:'44444444-4444-4444-8444-444444444444'},
 userId:'user-A',ownerId:'user-A',coupleId:'couple-1',
 lockedCoupleId:'couple-1',hasMountedHost:true
};
test('ordinary UI redraw keeps authentic V2 editor and private unsent inputs',()=>{
 assert.equal(canReuseEclatV2Editor(real),true);
 assert.equal(canReuseEclatV2Editor({...real,player:{...real.player,chapter_index:3}}),true,
  'a fresh chapter must not recreate a mounted same-session editor');
});
test('a different account, couple or session can never see a previous editor',()=>{
 for(const changed of [
  {userId:'user-B'},{ownerId:'user-B'}, {coupleId:'couple-2'},
  {lockedCoupleId:'couple-2'},{hasMountedHost:false},
  {server:{...real.server,session_id:'55555555-5555-4555-8555-555555555555'}},
  {player:{...real.player,session_id:'55555555-5555-4555-8555-555555555555'}}
 ]){
  assert.equal(canReuseEclatV2Editor({...real,...changed}),false,JSON.stringify(changed));
 }
});
test('revoked Premium or finished/stopped session tears down previous editor',()=>{
 for(const changed of [
  {server:{...real.server,access:false}},
  {player:{...real.player,access:false}},
  {server:{...real.server,active:false}},
  {player:{...real.player,active:false}},
  {server:null},{player:null},{userId:null},{coupleId:null}
 ])assert.equal(canReuseEclatV2Editor({...real,...changed}),false,JSON.stringify(changed));
});
