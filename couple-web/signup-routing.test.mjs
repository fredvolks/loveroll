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
const profileSave=extract('let currentProfileSave=null;','// Logout can await');
// The live application declares the generation at module scope; fixtures must too.
const profileSaveFixture='let authFeedbackGeneration=0;'+profileSave;

test('same user ID with a new authentication generation cannot inherit a stale profile save',async()=>{
 const calls=[],state={user:{id:'account-A'}},ctx={state,authFeedbackGeneration:0};
 let release;
 const stalled=new Promise(resolve=>{release=resolve;});
 ctx.rpc=name=>{
  calls.push(name);
  return calls.length===1?stalled:Promise.resolve();
 };
 const save=vm.runInNewContext(profileSave+';saveProfileForCurrentAccount',ctx);
 const oldRequest=save('Ancien profil','10-18','her','soft');
 assert.deepEqual(calls,['complete_love_registration']);
 // The previous session signs out and the *same* UUID signs in again.
 // An account ID comparison alone cannot distinguish the two sessions.
 ctx.authFeedbackGeneration++;
 release();
 assert.equal(await oldRequest,false);
 assert.deepEqual(calls,['complete_love_registration'],
  'the old session must never write gender or play style under the new login');
 assert.equal(await save('Nouveau profil','10-19','him','intense'),true);
 assert.deepEqual(calls,[
  'complete_love_registration','complete_love_registration',
  'save_my_gender','save_my_play_style'
 ]);
});

test('a fresh login can save its profile while the same UID has an obsolete pending RPC',async()=>{
 const calls=[],state={user:{id:'account-A'}};
 let releaseOld,releaseNew;
 const oldPending=new Promise(resolve=>{releaseOld=resolve;});
 const newPending=new Promise(resolve=>{releaseNew=resolve;});
 const ctx={state,rpc:name=>{
  calls.push(name);
  if(calls.length===1)return oldPending;
  if(calls.length===2)return newPending;
  return Promise.resolve();
 }};
 const f=vm.runInNewContext(profileSaveFixture+
  ';({saveProfileForCurrentAccount,bump:()=>authFeedbackGeneration++})',ctx);
 const old=f.saveProfileForCurrentAccount('Old','10-18','her','soft');
 f.bump(); // same UID, different authenticated session
 const newer=f.saveProfileForCurrentAccount('Current','10-19','her','medium');
 assert.equal(calls.length,2,'new session can start without waiting for old network');
 releaseOld();
 assert.equal(await old,false);
 await assert.rejects(f.saveProfileForCurrentAccount('Duplicate','10-19','her','medium'),
  /déjà en cours/,'old completion must not clear the newer request');
 releaseNew();
 assert.equal(await newer,true);
 assert.deepEqual(calls,[
  'complete_love_registration','complete_love_registration',
  'save_my_gender','save_my_play_style'
 ]);
});

test('in-flight profile save cannot continue under a different account',async()=>{
 const calls=[],state={user:{id:'account-A'}};
 let finishFirstRpc;
 const firstRpc=new Promise(resolve=>{finishFirstRpc=resolve;});
 const save=vm.runInNewContext(profileSaveFixture+';saveProfileForCurrentAccount',{
  state,rpc:(name,args)=>{
   calls.push({user:state.user.id,name,args});
   return calls.length===1?firstRpc:Promise.resolve();
  }
 });
 const pending=save('Profil A','10-18','her','soft');
 assert.deepEqual(calls.map(c=>c.name),['complete_love_registration']);
 state.user={id:'account-B'};
 finishFirstRpc();
 assert.equal(await pending,false,'A must stop when a different account owns the view');
 assert.deepEqual(calls.map(c=>c.name),['complete_love_registration'],
  'A must never write its gender/style with account B credentials');
 assert.equal(await save('Profil B','10-19','him','medium'),true);
 assert.deepEqual(calls.map(c=>c.user),['account-A','account-B','account-B','account-B']);
});

test('double submission cannot issue duplicate RPCs or unlock another account save',async()=>{
 const calls=[],state={user:{id:'account-A'}};
 const pendingRpcs={};
 const pause=key=>new Promise(resolve=>{pendingRpcs[key]=resolve;});
 const firstA=pause('account-A'),firstB=pause('account-B');
 const save=vm.runInNewContext(profileSaveFixture+';saveProfileForCurrentAccount',{
  state,rpc:(name)=>{
   const owner=state.user.id;
   calls.push(owner+':'+name);
   if(name==='complete_love_registration'&&owner==='account-A')return firstA;
   if(name==='complete_love_registration'&&owner==='account-B')return firstB;
   return Promise.resolve();
  }
 });
 const oldSave=save('A','10-18','her','soft');
 await assert.rejects(save('Dupliqué','10-18','her','soft'),/déjà en cours/,
  'a second tap cannot produce duplicate profile writes');
 state.user={id:'account-B'};
 const newSave=save('B','10-19','him','intense');
 pendingRpcs['account-A']();
 assert.equal(await oldSave,false);
 await assert.rejects(save('Doublon B','10-19','him','intense'),/déjà en cours/,
  'an old account completion must never unlock a newer account save');
 assert.deepEqual(calls,[
  'account-A:complete_love_registration',
  'account-B:complete_love_registration'
 ]);
 pendingRpcs['account-B']();
 assert.equal(await newSave,true);
 assert.deepEqual(calls.slice(2),['account-B:save_my_gender','account-B:save_my_play_style']);
});

test('profile saving reopens safely after a same-account RPC failure',async()=>{
 const calls=[],state={user:{id:'account-A'}};
 let failOnce=true;
 const save=vm.runInNewContext(profileSaveFixture+';saveProfileForCurrentAccount',{
  state,rpc:async name=>{
   calls.push(name);
   if(name==='save_my_gender'&&failOnce){failOnce=false;throw Error('RPC temporarily offline');}
  }
 });
 await assert.rejects(save('A','10-18','her','soft'),/temporarily offline/);
 assert.equal(await save('A','10-18','her','soft'),true);
 assert.deepEqual(calls,[
  'complete_love_registration','save_my_gender',
  'complete_love_registration','save_my_gender','save_my_play_style'
 ]);
});

test('new account with invitation completes profile but never creates own admin duo',async()=>{
 const calls=[],state={user:{id:'invited-account'},installAfterSignup:false};
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
 const handler=vm.runInNewContext(profileSaveFixture+';(async function(verb){'+complete+'})',ctx);
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
  state:{user:{id:'new-owner'},installAfterSignup:false},
  pendingInviteReference:()=>null,sessionStorage:{},
  resolveVerifiedSignup:async flag=>{
   calls.push({name:'resolveVerifiedSignup',flag});return {status:'owner'};
  },
  reload:async()=>{calls.push({name:'reload'});}
 };
 const handler=vm.runInNewContext(profileSaveFixture+';(async function(verb){'+complete+'})',ctx);
 await handler('complete-registration');
 assert.deepEqual(calls.map(x=>x.name),[
  'complete_love_registration','save_my_gender','save_my_play_style','resolveVerifiedSignup','reload']);
 assert.equal(calls[3].flag,true);
});

test('server invitation decision is retrieved before creating the admin duo',async()=>{
 const calls=[];
 const ctx={
  authFeedbackGeneration:0,
  state:{user:{id:'signup-owner'}},
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

test('same-account reauthentication cannot restore a stale signup invitation',async()=>{
 let resolveRpc;
 const pending=new Promise(resolve=>{resolveRpc=resolve;});
 const calls=[],state={user:{id:'signup-owner'}};
 const ctx={
  state,authFeedbackGeneration:0,
  rpc:async(name,args)=>{calls.push({name,args});return pending;},
  rememberVerifiedInvitation:id=>calls.push({name:'remember',id})
 };
 const fn=vm.runInNewContext(resolution+';resolveVerifiedSignup',ctx);
 const lookup=fn(true);
 ctx.authFeedbackGeneration++;
 resolveRpc({status:'invitation',invitation_id:'stale-after-relogin'});
 assert.equal((await lookup).status,'account_changed');
 assert.deepEqual(calls.map(x=>x.name),['resolve_love_signup'],
  'do not restore the previous session invitation');
});

test('stale signup RPC failure does not surface in a replacement account',async()=>{
 let rejectRpc;
 const pending=new Promise((_,reject)=>{rejectRpc=reject;});
 const state={user:{id:'account-A'}},calls=[];
 const ctx={
  state,authFeedbackGeneration:0,
  rpc:()=>pending,
  rememberVerifiedInvitation:id=>calls.push(id)
 };
 const fn=vm.runInNewContext(resolution+';resolveVerifiedSignup',ctx);
 const lookup=fn(true);
 state.user={id:'account-B'};
 rejectRpc(Error('Old account network failure'));
 assert.equal((await lookup).status,'account_changed');
 assert.deepEqual(calls,[]);
});

test('same-account relogin suppresses obsolete signup RPC errors',async()=>{
 let rejectRpc;
 const pending=new Promise((_,reject)=>{rejectRpc=reject;});
 const state={user:{id:'account-A'}};
 const ctx={state,authFeedbackGeneration:0,rpc:()=>pending,
  rememberVerifiedInvitation:()=>{throw Error('Must not cache stale invitation');}};
 const fn=vm.runInNewContext(resolution+';resolveVerifiedSignup',ctx);
 const lookup=fn(false);
 ctx.authFeedbackGeneration++;
 rejectRpc(Error('Previous login lost its network'));
 assert.equal((await lookup).status,'account_changed');
});

test('current signup RPC failure still reaches the signed-in user',async()=>{
 const error=Error('Current session RPC failed');
 const ctx={state:{user:{id:'account-A'}},authFeedbackGeneration:0,
  rpc:async()=>{throw error;},rememberVerifiedInvitation:()=>{}};
 const fn=vm.runInNewContext(resolution+';resolveVerifiedSignup',ctx);
 await assert.rejects(fn(true),/Current session RPC failed/);
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
  state,sessionStorage:{},inviteAcceptanceBusy:false,authFeedbackGeneration:0,
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

test('same-account relogin cannot finalize stale acceptance after RPC response',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'verified-recipient'},profile:{birthday_md:'10-18'},
  inviteAccepted:true,inviteAttemptKey:null,passwordRecovery:false,tab:'settings'};
 let clears=0;
 const ctx={
  state,authFeedbackGeneration:0,sessionStorage:{},inviteAcceptanceBusy:false,
  pendingInviteReference:()=>({kind:'id',value:'72aa640b-2644-4d0d-bcf7-575587d27f31'}),
  verifiedLoveEmail:()=>true,rpc:()=>pending,
  hashToken:async()=>{throw Error('UUID must not be hashed');},
  finishInviteReference:()=>{clears++;},
  invitationAuthMessage:()=> 'Invitation rejected'
 };
 const fn=vm.runInNewContext(autoJoin+';autoAcceptPendingInvite',ctx);
 const accepting=fn();
 ctx.authFeedbackGeneration++;
 release('old-session-result');
 await accepting;
 assert.equal(clears,0);
 assert.equal(state.tab,'settings');
 assert.notEqual(state.inviteWelcome,true);
 assert.equal(state.inviteError,null);
 assert.equal(state.inviteAttemptKey,null,'same invitation can be retried after the old request ends');
 await fn();
 assert.equal(clears,1,'current session may finish pairing on its own request');
 assert.equal(state.tab,'home');
});

test('invitation cannot pair before birth date or email verification',async()=>{
 const calls=[];
 const state={
  user:{id:'new-user'},profile:null,inviteAccepted:true,
  inviteAttemptKey:null,passwordRecovery:false
 };
 const ctx={
  state,sessionStorage:{},inviteAcceptanceBusy:false,authFeedbackGeneration:0,
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
