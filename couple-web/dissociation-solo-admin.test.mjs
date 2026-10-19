import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const app=read('app.js');
const sql=read('migrations/20261018_dissociate_to_two_solo_admins.sql');

function section(start,end){
 const from=app.indexOf(start);
 const to=app.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from,'LoveRoll handler missing '+start);
 return app.slice(from,to);
}
const dissociateHandler=section(" if(verb==='end-couple'){"," if(verb==='unlock-personal'){");

async function simulate({approve=true,members=2}={}){
 const calls=[];
 const state={
  coupleId:'the-shared-duo',
  members:Array.from({length:members},(_,i)=>({user_id:'account-'+i})),
  unlockKey:'not persisted',personalPass:'not persisted',
  personalJournal:[{private:true}],inviteDraft:{id:'pending'},invitations:[{id:'invite'}],
  inviteAccepted:true
 };
 const context={
  state,
  premiumConfirm:async(text,options)=>{calls.push({kind:'confirm',text,options});return approve;},
  rpc:async(name,args)=>{
   calls.push({kind:'rpc',name,args});
   if(name!=='dissociate_love_to_solo')throw Error('Wrong dissociation RPC');
   return 'fresh-solo-owner-id';
  },
  reload:async()=>calls.push({kind:'reload'}),
  notify:text=>calls.push({kind:'notify',text}),
  Error
 };
 const fn=vm.runInNewContext('(async function(verb){'+dissociateHandler+'})',context);
 let error=null;
 try{await fn('end-couple');}catch(e){error=String(e);}
 return {calls,state,error};
}

test('Either full-duo member can confirm dissociation and become solo admin via one RPC',async()=>{
 for(const user of ['owner','invited-member']){
  const result=await simulate();
  assert.equal(result.error,null,user);
  assert.deepEqual(result.calls.map(x=>x.kind),['confirm','rpc','reload','notify']);
  assert.equal(result.calls[1].name,'dissociate_love_to_solo');
  assert.equal(result.calls[1].args.p_couple,'the-shared-duo');
  assert.equal(result.state.unlockKey,null);
  assert.equal(result.state.personalPass,null);
  assert.equal(result.state.inviteDraft,null);
  assert.equal(result.state.inviteAccepted,false);
 }
});

test('Cancelling the confirmation preserves the original duo and all local state',async()=>{
 const result=await simulate({approve:false});
 assert.equal(result.error,null);
 assert.deepEqual(result.calls.map(x=>x.kind),['confirm']);
 assert.equal(result.state.coupleId,'the-shared-duo');
 assert.equal(result.state.inviteAccepted,true);
});

test('Solo member cannot accidentally dissociate their own admin workspace',async()=>{
 const result=await simulate({members:1});
 assert.match(result.error,/dissociation est réservée/i);
 assert.deepEqual(result.calls,[]);
});

test('The same dissociation button is shown to both owner and partner',()=>{
 const body=section('function renderSettings(){','async function handle(action,element){');
 assert.match(body,/if\(hasPartner\)\{/);
 assert.match(body,/button\('end-couple',editorialIcon\('unlink'\)/);
 assert.match(body,/Dissocier notre duo/);
 assert.match(body,/isLoveAdmin\(\)\?'Administrateur':'Membre'/);
 const sharedBlock=body.slice(body.indexOf('if(hasPartner){'),body.indexOf('}else if(linked){'));
 assert.doesNotMatch(sharedBlock,/isLoveAdmin\(\)\?button\('end-couple'/);
 assert.doesNotMatch(body,/Annuler mon espace à deux/);
});

test('SQL: only linked verified members can split, both own separate new spaces',()=>{
 for(const pattern of [
  /auth\.uid\(\)/,/love_require_verified_identity\(\)/,
  /from public\.couples where id=p_couple for update/,
  /coalesce\(array_length\(v_people,1\),0\)<>2/,
  /not v_actor=any\(v_people\)/,
  /public\.end_love_match\(p_couple\)/,
  /foreach v_user in array v_people loop/,
  /insert into public\.couples\(owner_user_id\)/,
  /values \(v_user\) returning id into v_solo/,
  /insert into public\.couple_members\(couple_id,user_id\)/,
  /public\.couple_occasion_settings/,
  /grant execute on function public\.dissociate_love_to_solo\(uuid\) to authenticated/
 ])assert.match(sql,pattern);
 assert.ok(sql.indexOf('perform public.end_love_match(p_couple)')<
  sql.indexOf('foreach v_user in array v_people loop'));
 assert.doesNotMatch(sql,/delete\s+from\s+(?:auth\.users|public\.couple_challenges|public\.couple_sessions)/i);
 assert.doesNotMatch(sql,/grant execute on function .* to anon/i);
});
