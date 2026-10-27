import test from 'node:test';
import assert from 'node:assert/strict';
import {createEclatV2SessionApi} from './eclat-v2-session.mjs';
const sid='11111111-1111-4111-8111-111111111111';
const status={access:true,active:true,content_version:2,session_id:sid};
test('V2 uses dedicated RPCs only and never sends a partner user ID',async()=>{
 const calls=[];const api=createEclatV2SessionApi({async rpc(name,args){calls.push([name,args]);return {data:status};}});
 await api.start({coffretId:1,minutes:30,deviceMode:'two'});
 await api.status(sid);
 await api.ready({sessionId:sid,expectedStep:1,ready:true});
 await api.reveal({sessionId:sid,expectedStep:1});
 await api.act({sessionId:sid,expectedStep:1,action:'continue'});
 assert.deepEqual(calls.map(x=>x[0]),[
  'love_eclat_v2_start','love_eclat_v2_status','love_eclat_v2_mark_ready',
  'love_eclat_v2_reveal','love_eclat_v2_act']);
 assert.ok(calls.every(x=>!JSON.stringify(x[1]).includes('user_id')));
 assert.deepEqual(calls[0][1],{p_coffret:1,p_minutes:30,p_device_mode:'two',p_replay_variant:null});
 assert.equal(calls[3][1].p_joint_oral,false);
});
test('Oral agreement never inferred and explicit errors are retained',async()=>{
 const calls=[];const api=createEclatV2SessionApi({async rpc(_,args){calls.push(args);return {data:status};}});
 await api.reveal({sessionId:sid,expectedStep:1,jointOral:true});
 assert.equal(calls[0].p_joint_oral,true);
 assert.throws(()=>api.ready({sessionId:sid,expectedStep:1,ready:'true'}),TypeError);
 assert.throws(()=>api.act({sessionId:sid,expectedStep:9,action:'continue'}),RangeError);
 assert.throws(()=>api.start({coffretId:1,minutes:45,deviceMode:'two'}),RangeError);
 const denied=createEclatV2SessionApi({async rpc(){return {error:new Error('RLS denied')};}});
 await assert.rejects(denied.status(),/RLS denied/);
 const invalid=createEclatV2SessionApi({async rpc(){return {data:{access:true,active:true}};}});
 await assert.rejects(invalid.status(),/incohérente/);
});
