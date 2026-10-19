// Behavioral Chromium tests against the REAL LoveRoll app.js and rendered DOM.
// Synthetic Supabase only. NEVER sends email, changes invitations or uses real accounts.
const {chromium}=require('playwright');
const site='http://127.0.0.1:8765/';
const fake=String.raw`
const id='owner-test',invite='123e4567-e89b-42d3-a456-426614174003';
export function createClient(){
 const mode=new URL(location.href).searchParams.get('testmode')||'anonymous';
 const email=mode==='wrong'?'wrong@example.test':'invited@example.test';
 const identity={id:mode==='owner'?'owner-test':'recipient-test',email:mode==='owner'?'owner@example.test':email,email_confirmed_at:'2026-10-15T00:00:00Z'};
 const authenticated=mode!=='anonymous';
 const rows={
  couple_profiles:[{id:identity.id,display_name:'Compte de test',birthday_md:'04-12'}],
  love_wellbeing:[{user_id:identity.id,relationship_state:'good',intimacy_state:'fulfilled'}],
  love_personal_intimacy:[],love_push_preferences:[],
  couple_members:mode==='owner'?[{user_id:id,couple_id:'couple-test',joined_at:'2026-10-01T00:00:00Z'}]:[],
  couples:mode==='owner'?[{id:'couple-test',owner_user_id:id}]:[],
  couple_invitations:[{id:invite,couple_id:'couple-test',invited_email:'invited@example.test',
   created_at:'2026-10-14T09:00:00Z',expires_at:'2027-10-15T09:00:00Z',accepted_at:null,cancelled_at:null}]
 };
 window.__fakeCalls={resend:[],reset:[],signin:[],signup:[],updated:[],accept:[],createInvite:[],markSent:[]};
 let authCallback=()=>{};
 return {
  auth:{
   getUser:async()=>({data:{user:authenticated?identity:null},error:null}),
   onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}}},
   signUp:async args=>{window.__fakeCalls.signup.push(args);return {data:{user:null,session:null},error:null};},
   updateUser:async args=>{window.__fakeCalls.updated.push(args);return {data:{},error:null};},
   signInWithPassword:async args=>{window.__fakeCalls.signin.push(args);
    return {data:{user:null},error:{code:'email_not_confirmed',message:'Email not confirmed'}};},
   resend:async args=>{window.__fakeCalls.resend.push(args);return {data:{},error:null};},
   resetPasswordForEmail:async(email,options)=>{window.__fakeCalls.reset.push({email,options});return {data:{},error:null};},
   signInWithOAuth:async args=>{window.__fakeCalls.oauth=args;return {data:{},error:null};}
  },
  from(table){return {select(){return this},eq(){return this},order(){return this},limit(){return this},
   then(ok,fail){return Promise.resolve({data:rows[table]||[],error:null}).then(ok,fail)}};},
  rpc:async(name,args)=>{
   if(name==='accept_love_match_by_id'){
    window.__fakeCalls.accept.push(args);
    if(mode==='wrong')return {data:null,error:{code:'P0001',message:'Invitation destinée à un autre courriel'}};
    return {data:null,error:null};
   }
   if(name==='create_pair_invite'){window.__fakeCalls.createInvite.push(args);return {data:invite,error:null}}
   if(name==='mark_pair_invite_sent'){window.__fakeCalls.markSent.push(args);return {data:null,error:null}}
   return {data:name==='get_love_guidance'?'gentle':name==='love_advent_server_date'?'2026-10-15':[],error:null};
  },
  channel(){return {on(){return this},subscribe(){return this}}},
  removeChannel:async()=>{}
 };
}
`;
async function open(browser,mode,extra=''){
 const page=await browser.newPage({viewport:{width:412,height:824},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.route('https://esm.sh/@supabase/supabase-js@2.57.0*',
  route=>route.fulfill({status:200,contentType:'application/javascript',body:fake}));
 await page.goto(site+'?testmode='+mode+extra,{waitUntil:'domcontentloaded'});
 await page.locator('#app').waitFor();
 return {page,errors};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 // Public CTAs must land in distinct modes and survive navigation.
 {
  const {page,errors}=await open(browser,'anonymous');
  await page.locator('[data-action="show-auth:signin"]').click();
  await page.locator('[data-action="auth-signin-password"]').waitFor();
  if(!(await page.locator('[data-action="auth-reset-request"]').isVisible()))throw Error('Sign-in does not expose Forgot password');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-action="auth-signin-password"]').waitFor();
  if(!page.url().includes('auth=signin'))throw Error('Reload lost sign-in mode');
  await page.locator('[data-action="show-landing"]').click();
  await page.locator('[data-action="show-auth:signup"]').click();
  await page.locator('[data-action="auth-signup-password"]').waitFor();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-action="auth-signup-password"]').waitFor();
  if(!page.url().includes('auth=signup'))throw Error('Reload lost signup mode');
  // Unconfirmed email must present a real resend control.
  await page.locator('[data-action="auth-mode:signin"]').click();
  await page.locator('#signin-email').fill('new@example.test');
  await page.locator('#signin-password').fill('Abcdefg8');
  await page.locator('[data-action="auth-signin-password"]').click();
  await page.locator('[data-action="auth-resend-confirmation"]').waitFor();
  await page.locator('[data-action="auth-resend-confirmation"]').click();
  await page.waitForFunction(()=>window.__fakeCalls.resend.length===1);
  const calls=await page.evaluate(()=>window.__fakeCalls);
  if(calls.resend[0]?.email!=='new@example.test'||calls.resend.length!==1||
      !calls.resend[0].options.emailRedirectTo)throw Error('Unconfirmed resend lost email/redirect');
  await page.locator('[data-action="auth-mode:signin"]').click();
  await page.locator('[data-action="auth-reset-request"]').click();
  await page.locator('[data-action="auth-send-reset"]').waitFor();
  await page.locator('#signin-email').fill('new@example.test');
  await page.locator('[data-action="auth-send-reset"]').click();
  await page.waitForFunction(()=>window.__fakeCalls.reset.length===1);
  if(!(await page.locator('#auth-form-feedback').innerText()).includes('Demande de récupération acceptée'))
   throw Error('Password reset claims actual email receipt or hides response');
  if(errors.length)throw Error('Auth errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK', 'landing modes, unconfirmed resend, reset request');
  await page.close();
 }
 // New signup with no Supabase session must show confirmation, never claim delivery.
 {
  const {page,errors}=await open(browser,'anonymous');
  await page.locator('[data-action="show-auth:signup"]').click();
  await page.locator('#signin-email').fill('newuser@example.test');
  await page.locator('#signin-password').fill('ValidPass9');
  await page.locator('[data-action="auth-signup-password"]').click();
  await page.locator('.email-confirm-screen').waitFor({timeout:20000});
  if(!(await page.locator('.email-confirm-screen').innerText()).includes('Confirmez'))
   throw Error('Signup did not show confirmation gate');
  await page.locator('[data-action="email-confirm-resend"]').click();
  await page.waitForFunction(()=>window.__fakeCalls.resend.length===1);
  const calls=await page.evaluate(()=>window.__fakeCalls);
  if(calls.signup.length!==1||calls.resend[0]?.email!=='newuser@example.test')
   throw Error('Signup confirmation lost email');
  await page.locator('[data-action="email-confirm-login"]').click();
  await page.locator('[data-action="auth-signin-password"]').waitFor();
  if(!page.url().includes('auth=signin'))throw Error('Email confirmation return not on signin');
  if(errors.length)throw Error('Signup confirmation JS errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK','signup confirmation gate, resend requested but receipt unproven, return signin');
  await page.close();
 }
 // Expired recovery token should not strand the user on an unusable password editor.
 {
  const {page,errors}=await open(browser,'anonymous','&auth=recover&error_code=otp_expired');
  await page.locator('[data-action="auth-signin-password"]').waitFor({timeout:20000});
  if(await page.locator('[data-action="auth-update-password"]').count())throw Error('Expired link left password update form enabled');
  if(!(await page.locator('#auth-form-feedback').innerText()).includes('expiré'))throw Error('Expired link error is not visible');
  if(errors.length)throw Error('Expired recovery errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK','expired recovery returns to sign-in without loop');
  await page.close();
 }
 // An existing valid invite must retain its UUID through reload without creating another.
 {
  const {page,errors}=await open(browser,'owner');
  await page.locator('.partner-waiting-page [data-action="tab:invitation"]').click();
  await page.locator('[data-action="copy-invite"]').waitFor({timeout:20000});
  const link='https://fredvolks.github.io/mon-wallet-android/?invite_id=123e4567-e89b-42d3-a456-426614174003';
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Clipboard disabled for test')}}});
  });
  await page.locator('[data-action="copy-invite"]').click();
  await page.locator('#invite-manual-link').waitFor();
  const first=await page.locator('#invite-manual-link').inputValue();
  if(!first.includes('123e4567-e89b-42d3-a456-426614174003'))throw Error('Missing persisted invite ID');
  const calls=await page.evaluate(()=>window.__fakeCalls);
  if(calls.createInvite.length||calls.markSent.length)throw Error('Copy mutated invite/delivery state');
  await page.reload({waitUntil:'domcontentloaded'});
  // Reload restores the native clipboard; keep the same simulated refusal.
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Clipboard disabled for test')}}});
  });
  await page.locator('.partner-waiting-page [data-action="tab:invitation"]').click();
  await page.locator('[data-action="copy-invite"]').waitFor();
  await page.locator('[data-action="copy-invite"]').click();
  await page.locator('#invite-manual-link').waitFor();
  const second=await page.locator('#invite-manual-link').inputValue();
  if(second!==first)throw Error('Reload changed invitation link');
  const latest=await page.evaluate(()=>window.__fakeCalls);
  if(latest.createInvite.length||latest.markSent.length)throw Error('Reload/copy reissued invitation');
  if(errors.length)throw Error('Invite JS errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK','same invitation ID, copy failed -> selectable URL, reload retains link');
  await page.close();
 }
 // Server-side destination protection: wrong verified email rejected.
 {
  const {page,errors}=await open(browser,'wrong','&invite_id=123e4567-e89b-42d3-a456-426614174003');
  await page.locator('[data-action="invite-start"]').waitFor();
  await page.locator('[data-action="invite-start"]').click();
  const refusal=page.locator('.invitation-notice-card [role="alert"]');
  await refusal.waitFor({timeout:20000});
  if(!(await refusal.innerText()).includes('une autre adresse')||
      !(await page.locator('.invitation-notice-card [data-action="switch-account-invite"]').isVisible()))
   throw Error('Wrong recipient must see the refusal and account-switch action');
  const calls=await page.evaluate(()=>window.__fakeCalls);
  if(calls.accept.length!==1)throw Error('Wrong recipient did not reach server guard');
  if(errors.length)throw Error('Wrong recipient JS errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK','wrong recipient refused without changing DB');
  await page.close();
 }
 // Correct invited email is accepted by the mock identity guard and drops the pending reference.
 {
  const {page,errors}=await open(browser,'right','&invite_id=123e4567-e89b-42d3-a456-426614174003');
  await page.locator('[data-action="invite-start"]').waitFor();
  await page.locator('[data-action="invite-start"]').click();
  const welcome=page.locator('.invitation-notice-card[role="status"]');
  await welcome.waitFor({timeout:20000});
  if(await welcome.locator('h1').innerText()!=='Bienvenue dans LoveRoll')
   throw Error('Accepted invitation did not show the welcome status');
  const calls=await page.evaluate(()=>window.__fakeCalls);
  if(calls.accept.length!==1)throw Error('Correct recipient not passed to server exactly once');
  if(errors.length)throw Error('Right recipient errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK','right recipient accepted once by mocked RPC');
  await page.close();
 }
 // A password recovery callback with an authenticated recovery identity updates Supabase,
 // without clearing the existing invitation or silently signing into another Google account.
 {
  const {page,errors}=await open(browser,'right','&auth=recover&invite_id=123e4567-e89b-42d3-a456-426614174003');
  await page.locator('[data-action="auth-update-password"]').waitFor({timeout:20000});
  await page.locator('#signin-password').fill('Abcdefg8');
  await page.locator('[data-action="auth-update-password"]').click();
  await page.waitForFunction(()=>window.__fakeCalls.updated.length===1);
  const call=await page.evaluate(()=>window.__fakeCalls.updated[0]);
  if(call.password!=='Abcdefg8')throw Error('Wrong password update method');
  if(errors.length)throw Error('Recovery errors '+JSON.stringify(errors));
  console.log('BEHAVIOR_OK','recovery callback saves password with authenticated Supabase session');
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error('AUTH_BEHAVIOR_FAILURE',e);process.exitCode=1});
