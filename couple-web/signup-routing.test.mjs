import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const app=read('app.js');
const sql=read('migrations/20261018_invitation_first_signup.sql');
function extract(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Expected live LoveRoll code section '+start);
 return app.slice(a,b);
}
const complete=extract(" if(verb==='complete-registration'){"," if(verb==='profile'){");
const resolution=extract('async function resolveVerifiedSignup(', 'async function autoAcceptPendingInvite(){');
const autoJoin=extract('async function autoAcceptPendingInvite(){','function verificationPendingHtml(');

test('new account with invitation completes profile but never creates own admin duo',async()=>{
 const calls=[],state={installAfterSignup:false};
 const ctx={
  id:k=>({
   'profile-name':{value:'Nouvelle partenaire'},
   'profile-gender':{value:'her'},
   'age-confirm':{checked:true}
  }[k]),
  parseMonthDay:()=> '10-18',
  rpc:async(name,args)=>{calls.push({name,args});},
  state,pendingInviteReference:()=>({kind:'id',value:'invite'}),
  sessionStorage:{},
  resolveVerifiedSignup:async()=>{throw Error('Invited signup must not create a duo');},
  reload:async()=>{calls.push({name:'reload'});}
 };
 const handler=vm.runInNewContext('(async function(verb){'+complete+'})',ctx);
 await handler('complete-registration');
 assert.deepEqual(calls.map(x=>x.name),[
  'complete_love_registration','save_my_gender','save_my_play_style','reload']);
 assert.equal(state.installAfterSignup,true);
});

test('new account without invitation resolves owner creation server-side exactly once',async()=>{
 const calls=[];
 const ctx={
  id:k=>({
   'profile-name':{value:'Nouveau propriétaire'},
   'profile-gender':{value:'him'},
   'age-confirm':{checked:true}
  }[k]),
  parseMonthDay:()=> '10-18',
  rpc:async(name,args)=>{calls.push({name,args});},
  state:{installAfterSignup:false},
  pendingInviteReference:()=>null,sessionStorage:{},
  resolveVerifiedSignup:async flag=>{
   calls.push({name:'resolveVerifiedSignup',flag});return {status:'owner'};
  },
  reload:async()=>{calls.push({name:'reload'});}
 };
 const handler=vm.runInNewContext('(async function(verb){'+complete+'})',ctx);
 await handler('complete-registration');
 assert.deepEqual(calls.map(x=>x.name),[
  'complete_love_registration','save_my_gender','save_my_play_style','resolveVerifiedSignup','reload']);
 assert.equal(calls[3].flag,true);
});

test('server invitation decision is retrieved before creating the admin duo',async()=>{
 const calls=[];
 const ctx={
  rpc:async(name,args)=>{
   calls.push({name,args});
   return {status:'invitation',invitation_id:'72aa640b-2644-4d0d-bcf7-575587d27f31'};
  },
  rememberVerifiedInvitation:id=>calls.push({name:'remember',id})
 };
 const fn=vm.runInNewContext(resolution+';resolveVerifiedSignup',ctx);
 const response=await fn(true);
 assert.equal(response.status,'invitation');
 assert.deepEqual(calls.map(x=>x.name),['resolve_love_signup','remember']);
 assert.equal(calls[0].args.p_create_owner,true);
 assert.equal(calls[1].id,response.invitation_id);
});

test('server security and transaction contract: verified email, member uniqueness, invitation priority',()=>{
 for(const pattern of [
  /auth\.uid\(\)/,/love_require_verified_identity\(\)/,
  /email_confirmed_at is not null/,
  /for update/i,
  /from public\.couple_members m where m\.user_id=v_user/,
  /i\.invited_email=v_email/,
  /i\.cancelled_at is null/,
  /i\.accepted_at is null/,
  /i\.expires_at>now\(\)/,
  /c\.owner_user_id=i\.created_by/,
  /if v_invitation is not null then/,
  /return jsonb_build_object\('status','invitation'/,
  /if not coalesce\(p_create_owner,false\) then/,
  /public\.create_love_match\(null\)/,
  /grant execute on function public\.resolve_love_signup\(boolean\) to authenticated/
 ])assert.match(sql,pattern);
 assert.ok(sql.indexOf('if v_invitation is not null then')<
   sql.indexOf('public.create_love_match(null)'),'Invitation must win before owner creation');
 assert.doesNotMatch(sql,/delete from (?:auth|public)\./i);
 assert.doesNotMatch(sql,/grant execute on function .* to anon/i);
});

test('even legacy manual creation paths must consult verified server invitation first',()=>{
 const first=extract(" if(verb==='prepare-cards'){"," if(verb==='create-couple'){");
 const second=extract(" if(verb==='create-couple'){"," if(verb==='invite'){");
 for(const block of [first,second]){
  assert.match(block,/resolveVerifiedSignup\(false\)/);
  assert.match(block,/decision\?\.status==='invitation'/);
  assert.ok(block.indexOf('resolveVerifiedSignup(false)')<
   block.indexOf("rpc('create_love_match'"),'Old button must not bypass invite');
 }
 assert.match(app,/if\(!state\.coupleId&&!pendingInviteReference\(sessionStorage\)\)/);
 assert.match(app,/await resolveVerifiedSignup\(false\)/);
});

test('accepted invitation automatically joins the existing duo after profile completion',async()=>{
 const calls=[];
 const state={
  user:{id:'verified-recipient'},profile:{birthday_md:'10-18'},
  inviteAccepted:true,inviteAttemptKey:null,passwordRecovery:false,
  tab:'invitation',showAuth:true
 };
 const ctx={
  state,sessionStorage:{},inviteAcceptanceBusy:false,
  pendingInviteReference:()=>({kind:'id',value:'72aa640b-2644-4d0d-bcf7-575587d27f31'}),
  verifiedLoveEmail:()=>true,
  rpc:async(name,args)=>{calls.push({name,args});return 'existing-duo';},
  hashToken:async()=>{throw Error('UUID invitation must not use secret token');},
  finishInviteReference:()=>{calls.push({name:'finished'});state.inviteAttemptKey=null;},
  invitationAuthMessage:()=> 'Unexpected pairing rejection'
 };
 const fn=vm.runInNewContext(autoJoin+';autoAcceptPendingInvite',ctx);
 await fn();
 assert.deepEqual(calls.map(x=>x.name),['accept_love_match_by_id','finished']);
 assert.equal(calls[0].args.p_invitation,'72aa640b-2644-4d0d-bcf7-575587d27f31');
 assert.equal(state.inviteWelcome,true);
 assert.equal(state.showAuth,false);
 assert.equal(state.inviteError,null);
});

test('invitation cannot pair before birth date or email verification',async()=>{
 const calls=[];
 const state={
  user:{id:'new-user'},profile:null,inviteAccepted:true,
  inviteAttemptKey:null,passwordRecovery:false
 };
 const ctx={
  state,sessionStorage:{},inviteAcceptanceBusy:false,
  pendingInviteReference:()=>({kind:'id',value:'72aa640b-2644-4d0d-bcf7-575587d27f31'}),
  verifiedLoveEmail:()=>false,
  rpc:async name=>calls.push(name),
  finishInviteReference:()=>calls.push('finished')
 };
 const fn=vm.runInNewContext(autoJoin+';autoAcceptPendingInvite',ctx);
 await fn();
 assert.deepEqual(calls,[]);
 assert.equal(state.inviteAttemptKey,null);
});
