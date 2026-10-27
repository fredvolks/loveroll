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

test('Door selection is an explicit dedicated RPC and cannot impersonate B',async()=>{
 const calls=[];const api=createEclatV2SessionApi({async rpc(name,args){calls.push({name,args});return {data:status};}});
 await api.door({sessionId:sid,expectedStep:1,door:'Jeu'});
 await api.door({sessionId:sid,expectedStep:5,door:'Mystère',jointOral:true});
 assert.deepEqual(calls.map(x=>x.name),['love_eclat_v2_choose_door','love_eclat_v2_choose_door']);
 assert.equal(calls[0].args.p_joint_oral,false);
 assert.equal(calls[1].args.p_joint_oral,true);
 assert.ok(calls.every(x=>!JSON.stringify(x.args).includes('user_id')));
 assert.throws(()=>api.door({sessionId:sid,expectedStep:1,door:'Hasard'}),RangeError);
});

test('Prediction RPC authenticates the writer without accepting an author ID',async()=>{
 const calls=[];const api=createEclatV2SessionApi({async rpc(name,args){
  calls.push([name,args]);return {data:status};}});
 await api.predict({sessionId:sid,expectedStep:1,answer:0,prediction:2});
 assert.deepEqual(calls[0],['love_eclat_v2_predict',{
  p_session:sid,p_expected_step:1,p_answer:0,p_prediction:2}]);
 assert.throws(()=>api.predict({sessionId:sid,expectedStep:1,answer:5,prediction:0}),RangeError);
});

test('Attention actions are role-less requests and reject unapproved responses',async()=>{
 const calls=[],api=createEclatV2SessionApi({async rpc(name,args){
  calls.push([name,args]);return {data:status};}});
 await api.attentionPropose({sessionId:sid,expectedStep:3,attention:1});
 await api.attentionReply({sessionId:sid,expectedStep:3,answer:'pass',jointOral:true});
 assert.deepEqual(calls.map(x=>x[0]),[
  'love_eclat_v2_attention_propose','love_eclat_v2_attention_reply']);
 assert.equal(calls[0][1].p_joint_oral,false);
 assert.equal(calls[1][1].p_joint_oral,true);
 assert.ok(calls.every(x=>!JSON.stringify(x[1]).includes('user_id')));
 assert.throws(()=>api.attentionReply({sessionId:sid,expectedStep:3,answer:'force'}),RangeError);
 assert.throws(()=>api.attentionPropose({sessionId:sid,expectedStep:3,attention:3}),RangeError);
});

test('08 music note and reveal use authenticated RPC without choosing author',async()=>{
 const calls=[];const api=createEclatV2SessionApi({async rpc(name,args){calls.push([name,args]);return {data:status};}});
 await api.musicNote({sessionId:sid,expectedStep:1,title:'Titre imaginaire',artist:'Artiste'});
 await api.musicReveal({sessionId:sid,expectedStep:1});
 assert.deepEqual(calls.map(x=>x[0]),['love_eclat_v2_music_note','love_eclat_v2_music_reveal']);
 assert.equal(calls[0][1].p_title,'Titre imaginaire');
 assert.ok(calls.every(x=>!JSON.stringify(x[1]).includes('user_id')));
 assert.throws(()=>api.musicNote({sessionId:sid,expectedStep:1,title:' '}),RangeError);
});

test('12 story vote sends stage and counter, never writes dice faces locally',async()=>{
 const calls=[];const api=createEclatV2SessionApi({async rpc(name,args){
  calls.push([name,args]);return {data:status};}});
 await api.storyVote({sessionId:sid,expectedStep:1,expectedRerolls:0,action:'reroll'});
 await api.storyVote({sessionId:sid,expectedStep:3,expectedRerolls:2,action:'off',jointOral:true});
 assert.deepEqual(calls.map(c=>c[0]),['love_eclat_v2_story_vote','love_eclat_v2_story_vote']);
 assert.equal(calls[0][1].p_expected_rerolls,0);
 assert.equal(calls[1][1].p_joint_oral,true);
 assert.ok(calls.every(c=>!JSON.stringify(c[1]).includes('story_constraint')));
 assert.throws(()=>api.storyVote({sessionId:sid,expectedStep:1,expectedRerolls:-1,action:'reroll'}),RangeError);
});

test('09 card gateway carries only own picks or explicit common intersection',async()=>{
 const calls=[],api=createEclatV2SessionApi({async rpc(name,args){
  calls.push([name,args]);return {data:status};}});
 await api.cardsSubmit({sessionId:sid,expectedStep:1,cards:[1,7]});
 await api.cardsShared({sessionId:sid,expectedStep:1,common:[7],jointOral:true});
 await api.cardVote({sessionId:sid,expectedStep:2,card:7});
 assert.deepEqual(calls.map(x=>x[0]),[
  'love_eclat_v2_cards_submit','love_eclat_v2_cards_shared','love_eclat_v2_card_vote']);
 assert.equal(calls[1][1].p_joint_oral,true);
 assert.ok(calls.every(x=>!JSON.stringify(x[1]).includes('user_id')));
 assert.throws(()=>api.cardsSubmit({sessionId:sid,expectedStep:1,cards:[1,1]}),RangeError);
});

test('10 timer gateway authorizes only mode choice and four actions',async()=>{
 const calls=[],api=createEclatV2SessionApi({async rpc(name,args){calls.push([name,args]);return {data:status};}});
 await api.timerMode({sessionId:sid,expectedStep:1,mode:'with'});
 await api.timerAction({sessionId:sid,expectedStep:1,action:'pause'});
 assert.deepEqual(calls.map(x=>x[0]),['love_eclat_v2_timer_mode','love_eclat_v2_timer_action']);
 assert.equal(calls[0][1].p_joint_oral,false);
 assert.throws(()=>api.timerMode({sessionId:sid,expectedStep:1,mode:'superfast'}),RangeError);
 assert.throws(()=>api.timerAction({sessionId:sid,expectedStep:1,action:'autofinish'}),RangeError);
});
