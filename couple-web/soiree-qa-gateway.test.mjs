import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoireeQaGateway,validateSoireeQaPair} from './soiree-qa-gateway.mjs';
const idA='11111111-1111-4111-8111-111111111111';
const idB='22222222-2222-4222-8222-222222222222';
const couple='33333333-3333-4333-8333-333333333333';
const session='44444444-4444-4444-8444-444444444444';
const challenge='55555555-5555-4555-8555-555555555555';
function clientFor(userId=idA,override={}){
 const calls=[];
 const db={
  couple_members:[{couple_id:couple,user_id:userId}],
  couple_rolls:[{id:challenge,couple_id:couple,kind:'weekly',face:3,key:'2026-10-26'}],
  couple_sessions:[{id:session,couple_id:couple,started_at:'2026-10-27',finished_at:null}],
  couple_personal_rolls:[{session_id:session,user_id:userId,face:4}],
  couple_challenges:[{id:challenge,session_id:session,recipient:userId,status:'proposed',face:83}]
 };
 const returns={roll_couple_once:{face:3},
  ensure_couple_session:session,roll_my_evening_d6:{face:4},
  draw_for_partner:{id:challenge,face:83},
  draw_for_partner_random:{id:challenge,face:42},
  answer_challenge:null,love_respond_and_redraw:{replacement_id:challenge},finish_couple_session:null,
  my_love_evening_board:{ready:true}};
 const client={
  auth:{async getUser(){return {data:{user:{id:override.actualUser||userId}}}}},
  async rpc(name,args){calls.push({name,args});
   return {data:override[name]??returns[name],error:null};},
  from(table){
   const filters=[];let limit=Infinity,isNull=null;
   const q={
    select(){return q;},
    eq(k,v){filters.push([k,v]);return q;},
    is(k,v){isNull=[k,v];return q;},
    limit(n){limit=n;return q;},
    then(done){let rows=db[table].filter(r=>filters.every(([k,v])=>r[k]===v));
     if(isNull)rows=rows.filter(r=>r[isNull[0]]===null);
     return Promise.resolve(done({data:rows.slice(0,limit),error:null}));}
   };return q;
  }
 };
 return {api:createSoireeQaGateway({client,expectedUserId:userId}),calls};
}
test('Soirée QA uses the exact production weekly D6, own D6 and D100 RPCs',async()=>{
 const {api,calls}=clientFor();
 assert.equal((await api.weekly()).face,3);
 assert.equal(await api.start(),session);
 assert.equal((await api.d6(session)).face,4);
 assert.equal((await api.d100(session,'MIXTE')).face,83);
 assert.equal((await api.d100(session,'HASARD')).face,42);
 await api.answer(challenge,'accepted');
 await api.redraw(challenge,'pass');
 await api.redraw(challenge,'refuse',{exclude:true});
 await api.stop(session);
 assert.deepEqual(calls.map(c=>c.name),['roll_couple_once','ensure_couple_session',
   'roll_my_evening_d6','draw_for_partner','draw_for_partner_random',
   'answer_challenge','love_respond_and_redraw','love_respond_and_redraw','finish_couple_session']);
 assert.deepEqual(calls[0].args,{p_couple:couple,p_kind:'weekly'});
 assert.deepEqual(calls[3].args,{p_session:session,p_preference:'MIXTE',p_random:false});
 assert.deepEqual(calls[5].args,{p_id:challenge,p_status:'accepted'});
 assert.deepEqual(calls[6].args,{p_challenge:challenge,p_action:'pass',p_exclude:false});
 assert.deepEqual(calls[7].args,{p_challenge:challenge,p_action:'refuse',p_exclude:true});
 assert.deepEqual(calls[8].args,{p_session:session,p_count:false});
 assert.ok(calls.every(c=>!JSON.stringify(c.args).includes('user_id')));
});
test('reads only its own challenge cards, never a partner private challenge',async()=>{
 const {api,calls}=clientFor();
 const snap=await api.snapshot();
 assert.equal(snap.session.id,session);
 assert.equal(snap.mine.length,1);
 assert.equal(snap.mine[0].recipient,idA);
 assert.ok(calls.some(x=>x.name==='my_love_evening_board'));
});
test('identity refresh rejects reused sessions or wrong account',async()=>{
 const {api}=clientFor(idA,{actualUser:idB});
 await assert.rejects(()=>api.snapshot(),/compte QA a changé/);
 await assert.rejects(()=>api.d6(session),/compte QA a changé/);
});
test('invalid actions and server-made faces never become a fake dice result',async()=>{
 const {api}=clientFor(idA,{draw_for_partner:{face:105,id:challenge}});
 await assert.rejects(()=>api.d100(session,'MIXTE'),/non confirmée/);
 await assert.rejects(()=>api.d100(session,'FORCE'),RangeError);
 await assert.rejects(()=>api.answer(challenge,'admin-bypass'),RangeError);
 await assert.rejects(()=>api.answer(challenge,'passed'),RangeError);
 await assert.rejects(()=>api.redraw(challenge,'pass',{exclude:true}),RangeError);
 await assert.rejects(()=>api.redraw(challenge,'force'),RangeError);
 await assert.rejects(()=>api.d6('not-uuid'),RangeError);
});
test('A and B must be two distinct verified IDs in exactly the same QA duo',()=>{
 assert.equal(validateSoireeQaPair({userId:idA,coupleId:couple},
  {userId:idB,coupleId:couple}).coupleId,couple);
 assert.throws(()=>validateSoireeQaPair({userId:idA,coupleId:couple},
  {userId:idA,coupleId:couple}),/distincts/);
 assert.throws(()=>validateSoireeQaPair({userId:idA,coupleId:couple},
  {userId:idB,coupleId:session}),/même duo/);
});
