const {revealSetting}=require('./settings-test-navigation.cjs');
const {mkdirSync}=require('node:fs');
// The real app.js as an ESM module, real HTML/CSS/JS assets, Chromium parser
// and safe synthetic Supabase responses. No live users, quotas or DB writes.
const {chromium}=require('playwright');
const site=process.env.LOVEROLL_TEST_URL||'http://127.0.0.1:8765/';
// Live refresh can replace the navigation between pointer-down and pointer-up.
// Verify the tap selected its tab before waiting for that tab's content. Retry
// only a missed selection; a disabled tab, dialog or missing view still fails.
async function selectTab(page,tab){
 const target=page.locator('.nav [data-action="tab:'+tab+'"]');
 const selected=page.locator('.nav [data-action="tab:'+tab+'"].active');
 await target.click();
 try{await selected.waitFor({timeout:1500});}
 catch(error){
  if(await target.isDisabled()||await page.locator('[role="alertdialog"]:visible,[role="dialog"]:visible').count())throw error;
  const previous=await page.locator('.nav .active').getAttribute('data-action');
  console.log('NAV_TAP_REPLACED_RETRY',JSON.stringify({from:previous,to:tab}));
  await target.click();
  await selected.waitFor({timeout:10000});
 }
 // Full-couple refresh can replace a selected tab's view after the navigation
 // button itself turned active. Retry the real click once, never skip assertions.
 const view={session:'.evening-premium-view',special:'.surprise-premium-view'}[tab];
 if(view){
  try{await page.locator(view).waitFor({timeout:4000});}
  catch(error){
   const current=await page.locator('.nav .active').getAttribute('data-action').catch(()=>null);
   console.log('NAV_VIEW_REPLACED_RETRY',JSON.stringify({tab,current}));
   if(!await target.isEnabled()||await page.locator('[role="alertdialog"]:visible,[role="dialog"]:visible').count())throw error;
   await target.click();
   try{await page.locator(view).waitFor({timeout:12000});}
   catch(second){
    const snapshot=await page.evaluate(()=>({active:document.querySelector('.nav .active')?.dataset.action,
      mainClass:document.querySelector('#app')?.className,
      text:document.querySelector('#app')?.innerText.slice(0,450)}));
    throw Error('Navigation failed after a real retry: '+JSON.stringify(snapshot)+'; '+second.message);
   }
  }
 }
}
const fakeSupabase=`
const user={id:'test-user-1',email:'example1@test.invalid',email_confirmed_at:'2026-10-12T14:00:00Z'};
const second={id:'test-user-2',email:'example2@test.invalid',email_confirmed_at:'2026-10-12T14:00:00Z'};
export function createClient(){
 const mode=new URL(location.href).searchParams.get('boot_case')||'anonymous';
 window.__loveOauthArgs=null;window.__redrawCalls=[];window.__fakeExclusions=[];window.__restoreCalls=[];
 const authenticated=mode!=='anonymous';
 const redrawMode=['paired-redraw','paired-redraw-exclude','paired-redraw-pass'].includes(mode);
 const paired=['paired','paired-active','paired-pending','paired-partner-result'].includes(mode)||redrawMode;
 const active=['paired-active','paired-pending','paired-partner-result'].includes(mode)||redrawMode;
 const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const monday=new Date(localDay+'T12:00:00Z');
 monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const weeklyKey=monday.toISOString().slice(0,10);
 const now=new Date();
 const earlier=new Date(now.getTime()-2*60000).toISOString();
 const later=new Date(now.getTime()-60000).toISOString();
 const rows={
  couple_profiles:paired?
   [{id:user.id,display_name:'Test 1',birthday_md:'04-12'},{id:second.id,display_name:'Test 2',birthday_md:'04-13'}]:
   mode==='existing'?[{id:user.id,display_name:'Test 1',birthday_md:'04-12'}]:[],
  love_wellbeing:paired||mode==='existing'?[{user_id:user.id,relationship:'well',intimacy:'well'}]:[],
  couple_members:paired?[{couple_id:'couple-test',user_id:user.id,joined_at:'2026-10-01T00:00:00Z'},
    {couple_id:'couple-test',user_id:second.id,joined_at:'2026-10-02T00:00:00Z'}]:[],
  couples:paired?[{id:'couple-test',owner_user_id:user.id,journal_salt:'test-journal-salt'}]:[],
  couple_rolls:active?[{id:'weekly-synthetic',couple_id:'couple-test',kind:'weekly',key:weeklyKey,face:2,created_at:earlier}]:[],
  couple_sessions:active?[{id:'active-session-synthetic',couple_id:'couple-test',started_at:later,finished_at:null,paired_turns:true,self_draws:true}]:[],
  couple_personal_rolls:mode==='paired-pending'?[]:
   mode==='paired-partner-result'?
    [{id:'d6-partner',session_id:'active-session-synthetic',user_id:second.id,face:4}]:
   active?[{id:'d6-user',session_id:'active-session-synthetic',user_id:user.id,face:2},
    {id:'d6-second',session_id:'active-session-synthetic',user_id:second.id,face:3}]:[],
  couple_challenges:redrawMode?[{
   id:'redraw-original',couple_id:'couple-test',session_id:'active-session-synthetic',
   recipient:user.id,offered_by:second.id,category:'SENSUEL',card_id:1,face:12,
   status:'accepted',card_title:'Défi original',card_description:'Activité synthétique',
   card_timer_minutes:0,created_at:earlier
  }]:[]
 };
 return {
  auth:{
   getUser:async()=>({data:{user:authenticated?user:null},error:null}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
   signInWithOAuth:async args=>{window.__loveOauthArgs=args;return {data:{url:'https://accounts.google.com/o/oauth2/auth'},error:null};}
  },
  from(table){
   const query={select(){return this},eq(){return this},order(){return this},limit(){return this},
    then(ok,fail){return Promise.resolve({data:rows[table]||[],error:null}).then(ok,fail)}};
   return query;
  },
  rpc:async(name,args)=>{
   if(redrawMode&&name==='love_redraw_capabilities')return {data:true,error:null};
   if(redrawMode&&name==='my_love_cycle_exclusions')return {data:[...window.__fakeExclusions],error:null};
   if(redrawMode&&name==='restore_love_cycle_exclusion'){
    window.__restoreCalls.push(args);
    window.__fakeExclusions=window.__fakeExclusions.filter(card=>
     card.category!==args.p_category||card.card_id!==args.p_card_id);
    return {data:true,error:null};
   }
   if(redrawMode&&name==='my_love_monthly_pass_quota')
    return {data:{used:window.__redrawCalls.filter(call=>call.args.p_action==='pass').length,
     limit:3,remaining:3-window.__redrawCalls.filter(call=>call.args.p_action==='pass').length,
     can_pass:true},error:null};
   if(redrawMode&&name==='love_respond_and_redraw'){
    window.__redrawCalls.push({name,args});
    if(args.p_exclude)window.__fakeExclusions.push({category:'SENSUEL',card_id:1,excluded_at:new Date().toISOString()});
    const original=rows.couple_challenges[0];
    original.status=args.p_action==='refuse'?'refused':'passed';
    if(!rows.couple_challenges.some(c=>c.id==='redraw-replacement'))
     rows.couple_challenges.push({...original,id:'redraw-replacement',status:'proposed',
      card_id:2,face:13,replaces_challenge_id:original.id,card_title:'Remplacement du défi',created_at:new Date().toISOString()});
    return {data:{original_id:original.id,replacement_id:'redraw-replacement',
      excluded:args.p_exclude,already_processed:false},error:null};
   }
   return {data:name==='get_love_guidance'?'gentle':
   name==='love_advent_server_date'?'2026-10-15':
   name==='my_love_evening_card_totals'?[{sensual:35,sexual:35,total:70}]:
   name==='my_love_roll_status'&&active?[{my_rolled:mode==='paired-active'||redrawMode,
    partner_rolled:mode!=='paired-pending',both_ready:mode==='paired-active'||redrawMode}]:
   name==='my_love_evening_board'&&active?{
    ready:true,first:user.id,next:user.id,
    targets:{[user.id]:2,[second.id]:3},remaining:{[user.id]:2,[second.id]:3},
    drawn:{[user.id]:0,[second.id]:0},
    completed:{[user.id]:0,[second.id]:0},
    drawsFinished:false,finished:false
   }:
   [],error:null};
  },
  channel(){return {on(){return this},subscribe(){return this}}},
  removeChannel:async()=>{}
 };
}
`;
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const [name,query,expected] of [
  ['anonymous','?boot_case=anonymous','.love-discover'],
  ['google-return','?boot_case=existing&code=simulated-oauth-code','.partner-create-page'],
  ['existing-paired','?boot_case=paired','.loveroll-real-home'],
  ['active-evening','?boot_case=paired-active','.loveroll-real-home'],
  ['redraw-flow','?boot_case=paired-redraw','.loveroll-real-home'],
  ['redraw-iphone','?boot_case=paired-redraw-exclude','.loveroll-real-home'],
  ['redraw-pass','?boot_case=paired-redraw-pass','.loveroll-real-home'],
  ['step1-partner-pending','?boot_case=paired-pending','.loveroll-real-home'],
  ['step1-partner-result','?boot_case=paired-partner-result','.loveroll-real-home']
 ]){
  const page=await browser.newPage({viewport:name==='redraw-iphone'?{width:393,height:852}:{width:412,height:824},serviceWorkers:'block'});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text().slice(0,250));});
  await page.route('https://esm.sh/@supabase/supabase-js@2.107.0*',
    route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeSupabase}));
  await page.goto(site+query,{waitUntil:'domcontentloaded'});
  await page.locator(expected).waitFor({timeout:20000});
  const text=await page.locator('#app').innerText();
  if(await page.locator('[data-lr-boot]').count()||await page.locator('.lr-splash--overlay').count()||errors.length)
   throw Error(name+' failed: '+JSON.stringify({text:text.slice(0,250),errors}));
  if(name==='google-return'){
   if(!(await page.locator('.partner-create-page [data-action="create-couple"]').isVisible())||
      !(await page.locator('.partner-create-page [data-action="prepare-cards"]').isVisible())||
      await page.locator('[data-action="google"]').count())
    throw Error('Verified Google return must reach the create-duo page with its existing account actions');
  }
  if(name==='anonymous'){
   await page.locator('.discover-login').click();
   await page.locator('[data-action="google"]').first().click();
   const args=await page.evaluate(()=>window.__loveOauthArgs);
   if(args?.provider!=='google'||args.options?.queryParams?.prompt!=='select_account')
    throw Error('Google OAuth selector missing '+JSON.stringify(args));
  }
  if(name==='existing-paired'){
   // Home now starts directly with the weekly ritual, no logo nor header icons.
   if(await page.locator('.home-brandbar,.home-brand-actions').count()!==0)
    throw Error('Connected Home still displays removed top header');
   const gift=await page.evaluate(()=>{
    const button=document.querySelector('.home-next-month')?.getBoundingClientRect();
    const graphic=document.querySelector('.home-calendar-icon svg')?.getBoundingClientRect();
    return button&&graphic?{diff:(graphic.top+graphic.bottom)/2-(button.top+button.bottom)/2,
      graphicWidth:graphic.width,buttonHeight:button.height}:null;
   });
   if(!gift||gift.graphicWidth<20||Math.abs(gift.diff)>9)
    throw Error('Home gift not visually centered '+JSON.stringify(gift));
   // Boot also works before the optional WebGL module finishes loading.
   // Once present, measure the real mesh against the podium rather than
   // requiring the old fixed CSS lift. Full geometry/resize coverage lives
   // in home-podium-browser-check.cjs.
   const center=await page.evaluate(()=>{
    const t=document.querySelector('.home-die-theater')?.getBoundingClientRect();
    const p=document.querySelector('.home-die-platform')?.getBoundingClientRect();
    const c=document.querySelector('.home-die-platform canvas');
    const r=c?.getBoundingClientRect(),b=c?.loveRollDie?.projectedBounds();
    return t&&p?{x:(p.left+p.right)/2-(t.left+t.right)/2,
      contact:b?Number(c.dataset.podiumContact):null,
      meshBottom:b?r.top+b.bottom*r.height-t.top:null}:null;
   });
   if(!center||Math.abs(center.x)>3||
      (center.meshBottom!==null&&(!Number.isFinite(center.contact)||Math.abs(center.meshBottom-center.contact)>2)))
    throw Error('HOME_DIE_NOT_ON_PODIUM '+JSON.stringify(center));
   console.log('HOME_DIE_CENTERED_OK',JSON.stringify(center));
   // Regression: tap Soirée after weekly reset. This used to throw
   // Cannot read properties of null (reading 'items') on Samsung.
   await selectTab(page,'session');
   await page.locator('.evening-premium-view.is-finale').waitFor({timeout:10000});
   const copy=await page.locator('.evening-premium-view.is-finale').innerText();
   if(!copy.includes('200 défis à vivre à deux')||copy.includes('Brassez le dé et découvrez votre prochain défi.')||
     !(await page.locator('.evening-finale-start').isDisabled())||errors.length)
    throw Error('S25 Soirée access after reset broke '+JSON.stringify({copy:copy.slice(0,200),errors}));
   if((await page.locator('.toast.visible').allInnerTexts()).some(t=>/reading ['"]items['"]/.test(t)))
    throw Error('S25 user still sees null items error');
   const buttons=await page.locator('.evening-finale-actions button').count();
   if(buttons!==2 ||
     (await page.locator('.evening-intro .ritual-mode-switcher [data-action="tab:eclat"]').count())!==1 ||
     (await page.locator('.evening-intro .ritual-mode-switcher [data-action="tab:session"]').count())!==1 ||
     (await page.locator('.evening-finale-hero [data-action="tab:eclat"]').count())!==0)
    throw Error('Soirée must preserve two original buttons and one Éclat invitation on the photo (not a duplicate in the header): '+JSON.stringify({
     buttons,actions:await page.locator('[data-action]').evaluateAll(nodes=>nodes.map(n=>n.dataset.action).filter(x=>x==='new-session'||x==='evening-calendar')),
     html:(await page.locator('.evening-premium-view').innerHTML()).slice(-1200)
    }));
   await page.locator('[data-action="tab:home"]').last().click();
   await page.locator('.real-home-shell').waitFor({timeout:10000});
   console.log('SOIREE_ONE_PAGE_OK','Samsung viewport: shared premium page, disabled weekly start, no old screen');
  }
  if(name==='step1-partner-pending'||name==='step1-partner-result'){
   await selectTab(page,'session');
   await page.locator('.evening-step.one.is-incomplete').waitFor({timeout:10000});
   await page.waitForFunction(()=>document.querySelector('.evening-d6-theater canvas')?.loveRollDie,{timeout:15000});
   const layout=await page.evaluate(()=>{
    const own=document.querySelector('.evening-own-capsule');
    const partner=document.querySelector('.evening-duo-capsules .evening-partner-card');
    const die=document.querySelector('.evening-d6-theater .home-die-platform');
    const hero=document.querySelector('.evening-d6-theater')?.getBoundingClientRect();
    const status=partner?.querySelector('.evening-partner-mobile-status');
    const a=own?.getBoundingClientRect(),b=partner?.getBoundingClientRect();
    return {ownWidth:a?.width,partnerWidth:b?.width,capsulesAligned:!!(a&&b&&Math.abs(a.top-b.top)<1),
     capsulesBelowDie:!!(a&&hero&&a.top>=hero.bottom-2),dieWidth:die?.getBoundingClientRect().width,
     status:partner?.getAttribute('aria-label'),visibleStatus:status?.textContent.trim(),
     statusVisible:!!status&&getComputedStyle(status).display!=='none',
     infoButtons:document.querySelectorAll('.evening-d6-theater .home-odds-info').length,
     scroll:document.documentElement.scrollHeight-innerHeight};
   });
   const expected=name==='step1-partner-pending'?'En attente du lancer de Test':'Test a obtenu 4 défis';
   if(layout.status!==expected||!layout.statusVisible||!layout.capsulesAligned||!layout.capsulesBelowDie||
     (layout.ownWidth||0)<140||Math.abs(layout.ownWidth-layout.partnerWidth)>4||
     (layout.dieWidth||0)<170||layout.infoButtons!==1||layout.scroll>1||errors.length)
    throw Error('S25 STEP1_DUO_TEMPLATE regression '+name+' '+JSON.stringify({layout,errors}));
   console.log('SOIREE_STEP1_MOBILE_OK',name,JSON.stringify(layout));
  }
  if(name==='active-evening'){
   const info=await page.evaluate(()=>{
    const b=document.querySelector('.home-roll-button.is-used');
    const rollArea=document.querySelector('.home-roll-area');
    const rect=b?.getBoundingClientRect();
    const parent=rollArea?.getBoundingClientRect();
    return b&&rect&&parent?{text:b.textContent.trim(),disabled:b.disabled,
     widthRatio:rect.width/parent.width,height:rect.height}:null;
   });
   if(!info||info.text!=='Déjà brassé cette semaine, revenez la semaine prochaine'||
     !info.disabled||Math.abs(info.widthRatio-.96)>.025||info.height>57)
    throw Error('Already rolled weekly button is hidden or mislabeled '+JSON.stringify(info));
   // This is the essential regression: last tests stopped at locked Soirée
   // and never executed renderSession's real 70-card active branch.
   await selectTab(page,'session');
   await page.locator('.evening-premium-view').waitFor({timeout:10000});
   const evening=await page.locator('.evening-premium-view').innerText();
   if(!evening.includes('Votre défi du soir')||!evening.includes('Voir mes défis')||errors.length)
    throw Error('S25 ACTIVE SOIRÉE failed '+JSON.stringify({evening:evening.slice(0,350),errors}));
   const warnings=await page.locator('.toast.visible').allInnerTexts();
   if(warnings.some(t=>/pending is not defined|not defined|impossible/i.test(t)))
    throw Error('S25 active Soirée still shows JS exception '+JSON.stringify(warnings));
   await selectTab(page,'special');
   await page.locator('.surprise-premium-view').waitFor({timeout:10000});
   await selectTab(page,'session');
   // Synthetic live-sync may complete a scheduled redraw immediately after
   // selectTab sees the view. Retry only if that redraw actually lost it.
   await page.waitForTimeout(250);
   if(!await page.locator('.evening-premium-view').isVisible()){
    console.log('SOIREE_AFTER_LIVE_REFRESH_RETRY');
    await selectTab(page,'session');
   }
   await page.locator('.evening-premium-view').waitFor({timeout:10000});
   if(errors.length)throw Error('Returning from Surprise to Soirée caused exception '+JSON.stringify(errors));
   console.log('SOIREE_ACTIVE_ACCESS_OK','two confirmed dice, shared live board, queue button, tab revisit');
  }
  if(['redraw-flow','redraw-iphone','redraw-pass'].includes(name)){
   await selectTab(page,'session');
   await page.locator('.evening-premium-view').waitFor({timeout:10000});
   await page.locator('[data-action="evening-list"]').first().click();
   await page.locator('.evening-queue-item').first().click();
   mkdirSync('lr015-captures',{recursive:true});
   if(name==='redraw-pass'){
    await page.locator('[data-action="evening-pass:redraw-original"]').click();
    await page.locator('.evening-queue-detail h2')
     .filter({hasText:'Remplacement du défi'}).waitFor({timeout:10000});
    const calls=await page.evaluate(()=>window.__redrawCalls);
    if(calls.length!==1||calls[0].args.p_action!=='pass'||calls[0].args.p_exclude!==false)
     throw Error('Pass must produce exactly one quota-limited replacement '+JSON.stringify(calls));
    if(await page.locator('.evening-queue-item').count()!==1)
     throw Error('Pass must keep one visible D6 queue slot');
    console.log('LR015_REAL_BROWSER_PASS_OK','one replacement, original excluded from visible queue');
   }else{
    const refuse=page.locator('[data-action="evening-refuse:redraw-original"]');
    await refuse.waitFor({state:'visible'});
    await refuse.click();
    const dialog=page.locator('.lr-refusal-dialog[role="alertdialog"]');
    await dialog.waitFor({state:'visible'});
    await dialog.scrollIntoViewIfNeeded();
    await page.screenshot({path:'lr015-captures/'+name+'-refus.png',fullPage:true});
    for(const label of ['Oui, retirer du lot','Non, le garder dans le lot','Annuler'])
     if(!(await dialog.innerText()).includes(label))throw Error('Missing refusal choice '+label);
    await page.locator('[data-action="evening-refuse-cancel"]').click();
    if((await page.evaluate(()=>window.__redrawCalls.length))!==0)
     throw Error('Cancel must not consume a redraw or mutate a card');
    await refuse.click();
    const exclude=name==='redraw-iphone';
    await page.locator('[data-action="evening-refuse-choice:redraw-original:'+(exclude?'yes':'no')+'"]').click();
    await page.locator('.evening-queue-detail h2')
     .filter({hasText:'Remplacement du défi'}).waitFor({timeout:10000});
    await page.screenshot({path:'lr015-captures/'+name+'-remplacement.png',fullPage:true});
    const calls=await page.evaluate(()=>window.__redrawCalls);
    if(calls.length!==1||calls[0].args.p_challenge!=='redraw-original'||
     calls[0].args.p_action!=='refuse'||calls[0].args.p_exclude!==exclude)
     throw Error('Atomic refusal payload mismatch '+JSON.stringify(calls));
    if(await page.locator('.evening-queue-item').count()!==1)
     throw Error('Refusal must keep one visible D6 queue slot');
    if(exclude){
     await selectTab(page,'settings');
     await page.locator('[data-action="settings-page:jeu"]').first().click();
     await page.locator('[data-action="settings-page:excluded-cards"]').first().click();
     const restore=page.locator('[data-action="restore-love-exclusion:SENSUEL:1"]');
     await restore.waitFor({state:'visible',timeout:10000});
     await page.screenshot({path:'lr015-captures/'+name+'-exclusion.png',fullPage:true});
     await restore.click();
     await page.locator('.lr-excluded-row').waitFor({state:'hidden',timeout:10000});
     const result=await page.evaluate(()=>({
      excluded:window.__fakeExclusions.length,restoreCalls:window.__restoreCalls
     }));
     if(result.excluded!==0||result.restoreCalls.length!==1||
      result.restoreCalls[0].p_category!=='SENSUEL'||result.restoreCalls[0].p_card_id!==1)
      throw Error('Restoring current-cycle exclusion failed '+JSON.stringify(result));
     console.log('LR015_REAL_BROWSER_RESTORE_OK','excluded card visible and restored via Settings');
    }
    console.log('LR015_REAL_BROWSER_REFUSAL_OK','cancel/no/yes tested on mobile');
   }
   if(errors.length)throw Error('LR015 browser exception '+JSON.stringify(errors));
  }
  console.log('BOOT_OK',name,text.slice(0,180).replace(/\\s+/g,' '));
  await page.close();
 }
 // Real production navigation in a fake-data browser: no Supabase writes.
 // Responsive smoke for the five connected tabs and auth entry points.
 for(const v of [
  {name:'iPad portrait',width:820,height:1180},
  {name:'iPad landscape',width:1180,height:820},
  {name:'PC laptop',width:1366,height:768},
  {name:'PC widescreen',width:1920,height:1080}
 ]){
  const page=await browser.newPage({viewport:{width:v.width,height:v.height},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.route('https://esm.sh/@supabase/supabase-js@2.107.0*',
   route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeSupabase}));
  await page.goto(site+'?boot_case=paired',{waitUntil:'domcontentloaded'});
  await page.locator('.loveroll-real-home .real-home-shell').waitFor({timeout:20000});
  const inspect=async(tab,selector)=>{
   await page.locator('.nav [data-action="tab:'+tab+'"]').click();
   await page.locator(selector).waitFor({timeout:12000});
   const result=await page.evaluate(sel=>{
    const main=document.querySelector('#app'),nav=document.querySelector('.nav');
    const node=document.querySelector(sel),n=nav.getBoundingClientRect(),el=node.getBoundingClientRect();
    return {page:document.documentElement.scrollWidth,screen:innerWidth,navTop:n.top,navBottom:n.bottom,viewportHeight:innerHeight,
     tabs:nav.querySelectorAll('[data-action^="tab:"]').length,
     visible:el.width>200&&el.height>60,
     navigation:!!nav.querySelector('.active[data-action="tab:'+sel.replace(/^\\./,'')+'"]')};
   },selector);
   if(result.page>result.screen+2||result.navTop<0||result.navBottom>result.viewportHeight+2||result.tabs!==5||!result.visible)
    throw Error('Adaptive tab error '+v.name+' '+tab+' '+JSON.stringify(result));
   return result;
  };
  const initial=await page.evaluate(()=>{
   const box=document.querySelector('.real-home-shell').getBoundingClientRect();
   return {width:box.width,screen:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  if(initial.overflow||initial.width<Math.min(v.width*.75,1000))
   throw Error('Home not responsive '+v.name+' '+JSON.stringify(initial));
  await inspect('session','.evening-premium-view.is-finale');
  await inspect('special','.surprise-premium-view');
  const cards=await page.locator('.surprise-event-card').count();
  if(cards!==6)throw Error('Surprise events missing '+v.name+' '+cards);
  await inspect('advent','.advent-premium-view');
  if(await page.locator('.advent-box').count()!==25)throw Error('Advent tiles missing '+v.name);
  await inspect('settings','.settings-sections');
  await page.locator('.settings-profile-row').click();
  await revealSetting(page,'#profile-name');
  await page.locator('#profile-name').waitFor();
  if(errors.length)throw Error('Browser console errors '+v.name+' '+JSON.stringify(errors));
  console.log('RESPONSIVE_NAV_OK',v.name,JSON.stringify({homeWidth:initial.width,events:cards,tabs:5}));
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error('BOOT_FAILURE',e);process.exit(1)});
