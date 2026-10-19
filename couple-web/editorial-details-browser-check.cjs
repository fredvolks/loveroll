const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const action=(p,name)=>p.locator('[data-action="'+name+'"]');
const click=async(p,name)=>{await action(p,name).scrollIntoViewIfNeeded();await action(p,name).click();};
const confirm=async(p,accept=true)=>{await p.locator(accept?'.lr-dialog-accept':'.lr-dialog-cancel').click();};
async function settings(p,key){await click(p,'tab:settings');await click(p,'settings-page:'+key);}
async function editor(p,tab){await settings(p,'jeu');await click(p,'tab:'+tab);}
(async()=>{
 const browser=await chromium.launch({headless:true}),world=createWorld(),contexts=[];fs.mkdirSync('design-captures',{recursive:true});
 const open=async options=>{const value=await setupEditorial(browser,world,options);contexts.push(value.context);return value;};
 try{
  // Capture the actual sixteen compositions with all controls and real saved values.
  for(const [label,width,height] of [['small',360,640],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['PC',1366,768]]){
   const {page:p,errors}=await open({width,height});
   let referenceCaption;
   async function capture(name,{short=false}={}){
    await p.waitForTimeout(70);await p.evaluate(()=>scrollTo(0,0));
    const measure=await p.evaluate(()=>({horizontal:document.documentElement.scrollWidth-innerWidth,scroll:document.documentElement.scrollHeight-innerHeight,nav:document.querySelector('.nav')?.getBoundingClientRect().toJSON(),brand:document.querySelector('.ritual-brand')?.getBoundingClientRect().toJSON(),smallInputs:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea')].filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).fontSize.replace('px','')<14).length}));
    const caption=await p.locator('.ritual-kicker').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {top:r.top,center:(r.left+r.right)/2,height:r.height,font:s.font,letterSpacing:s.letterSpacing,color:s.color};});
    assert.ok(Math.abs(caption.center-width/2)<=1,'Secondary-page caption is off-center '+JSON.stringify({label,name,caption}));
    if(!referenceCaption)referenceCaption=caption;
    else assert.deepEqual(caption,referenceCaption,'Secondary-page caption moved or changed typography on '+label+'/'+name);
    assert.ok(measure.horizontal<=1&&!measure.smallInputs,JSON.stringify({label,name,measure}));
    if(short)assert.ok(measure.scroll<=2,JSON.stringify({label,name,measure}));
    if(measure.nav){assert.equal(await p.locator('.nav button.active').innerText(),'Réglages');assert.ok(measure.nav.bottom<=height+1);}
    if(await p.locator('.editorial-search').count())assert.ok(await p.locator('.editorial-search').evaluate(e=>{const input=e.querySelector('input'),icon=e.querySelector('svg');return input.getBoundingClientRect().left+parseFloat(getComputedStyle(input).paddingLeft)>=icon.getBoundingClientRect().right+4;}),'Search text must clear its icon');
    for(const button of await p.locator('.editorial-content button,.settings-detail-body button').all()){
     if(!(await button.isVisible()))continue;await button.evaluate(e=>e.scrollIntoView({block:'center'}));const r=await button.boundingBox();
     const nav=await p.locator('.nav').boundingBox();assert.ok(r.y+r.height<=nav.y+2,JSON.stringify({label,name,button:await button.innerText(),r,nav}));
    }
    await p.evaluate(()=>{scrollTo(0,0);for(const panel of document.querySelectorAll('.editorial-content,.settings-detail-body,.editorial-card-list'))panel.scrollTop=0;});await p.screenshot({path:'design-captures/editorial121-'+label+'-'+name+'.png',fullPage:true});console.log('EDITORIAL_SCREEN_OK',label,name,JSON.stringify(measure));
   }
   for(const key of ['couple','notifications','confidentialite','application']){await settings(p,key);await capture(key,{short:height>=824});}
   await settings(p,'jeu');await click(p,'settings-page:admin');await capture('advanced',{short:height>=824});
   await editor(p,'library');await capture('cards',{short:true});await click(p,'custom-slot:1');await capture('card');await click(p,'editor-back');await click(p,'editor-import:evening');await capture('json');
   await editor(p,'monthly-library');await capture('monthly');await editor(p,'advent-editor');await capture('advent');await editor(p,'special-editor');await capture('events',{short:height>=824});
   assert.deepEqual(errors,[]);await p.context().close();
   for(const [name,actor,query] of [['signup','guest','auth=signup'],['profile','p',''],['confirm','u',''],['forgot','guest','auth=request-reset'],['new-password','a','auth=recover']]){
    const {page,errors}=await open({width,height,actor,query});assert.equal(await page.locator('.nav').count(),0);await page.locator('.auth-editorial').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');
    const buttons=page.locator('.auth-editorial button');for(const b of await buttons.all()){if(await b.isVisible()){await b.scrollIntoViewIfNeeded();const r=await b.boundingBox();assert.ok(r.y>=-1&&r.y+r.height<=height+1,name+' inaccessible control');}}
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'design-captures/editorial121-'+label+'-'+name+'.png',fullPage:true});assert.deepEqual(errors,[]);await page.context().close();
   }
  }
  const {page:p,errors}=await open({});
  await editor(p,'library');assert.equal(await p.locator('.editorial-card-list [data-card-id]').count(),100);
  await p.locator('#custom-card-search').fill('100');assert.equal(await p.locator('.editorial-card-list button:visible').count(),1);await p.locator('#custom-card-search').fill('');
  await click(p,'custom-slot:1');await p.locator('#custom-title').fill('Notre carte modifiée');await click(p,'editor-back');await confirm(p,false);assert.equal(await p.locator('#custom-title').inputValue(),'Notre carte modifiée');
  await p.locator('#custom-drawer-her').check();await p.locator('#custom-recipient-him').check();await p.locator('#custom-timer-enabled').uncheck();await click(p,'save-custom-card');await p.waitForFunction(()=>document.querySelector('#custom-title')?.defaultValue==='Notre carte modifiée');
  const saved=world.calls.findLast(c=>c.name==='save_love_card_with_roles');assert.equal(saved.args.p_drawer_role,'her');assert.equal(saved.args.p_recipient_role,'him');assert.equal(saved.args.p_timer_minutes,null);
  await click(p,'editor-back');await p.locator('#no-repeat-cards').uncheck();await click(p,'save-draw-rule');await p.waitForFunction(()=>document.querySelector('#no-repeat-cards')?.defaultChecked===false);assert.equal(world.couple.no_repeat_challenges,false);
  await click(p,'editor-import:evening');await p.locator('#json-input-evening').fill('{invalid');await click(p,'json-preview:evening');await p.locator('#json-validation-error:not([hidden])').waitFor();assert.ok(!world.calls.some(c=>c.name==='import_love_evening_library'));
  const {buildEveningLibrary}=await import('./json-libraries.mjs');const library=buildEveningLibrary('SENSUEL');library.cards[0]={...library.cards[0],title:'Carte importée valide',timer_minutes:6,drawer_role:'her',recipient_role:'him'};
  await p.locator('input[data-json-file="evening"]').setInputFiles({name:'sensuel-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(library))});await click(p,'json-preview:evening');await p.locator('.json-preview').waitFor();assert.ok(!world.calls.some(c=>c.name==='import_love_evening_library'));
  await click(p,'json-cancel');assert.equal(await p.locator('.json-preview').count(),0);assert.ok(!world.calls.some(c=>c.name==='import_love_evening_library'));
  await click(p,'json-preview:evening');await click(p,'json-apply:evening');await confirm(p);await p.waitForFunction(()=>!document.querySelector('.json-preview'));
  assert.equal(world.calls.filter(c=>c.name==='import_love_evening_library').length,1);assert.equal(world.customCards.filter(c=>c.category==='SEXUEL').length,0);assert.equal(world.customCards[0].title,'Carte importée valide');assert.equal(world.history[0].title,'Contenu officiel immuable');
  await p.locator('#json-input-evening').fill(JSON.stringify(buildEveningLibrary('SEXUEL')));await click(p,'json-preview:evening');await p.locator('#json-validation-error').waitFor({state:'visible'});assert.match(await p.locator('#json-validation-error').innerText(),/catégorie SEXUEL/);assert.equal(world.calls.filter(c=>c.name==='import_love_evening_library').length,1);
  await click(p,'editor-import-back');await confirm(p);await editor(p,'monthly-library');await p.locator('#monthly-title').fill('Notre activité personnalisée');await p.locator('#monthly-timer-enabled').check();await p.locator('#monthly-minutes').fill('8');await click(p,'save-monthly-activity');await p.waitForFunction(()=>document.querySelector('#monthly-title')?.defaultValue==='Notre activité personnalisée');assert.equal(world.monthly[0].timer_minutes,8);assert.equal(await p.locator('#monthly-restaurant').count(),0);
  await editor(p,'advent-editor');await p.locator('#advent-selection').selectOption('3');await p.locator('#advent-day-title').fill('Lettre révisée');await p.locator('#advent-day-timer-enabled').uncheck();await click(p,'save-advent-day');await confirm(p);await p.waitForFunction(()=>document.querySelector('#advent-day-title')?.defaultValue==='Lettre révisée');assert.equal(world.calendar.days[2].timer_minutes,null);assert.equal(world.calendar.days[1].title,'Lettre 2');
  await editor(p,'special-editor');await click(p,'special-editor-event:saint_valentin');await p.locator('#special-option-description').fill('Consigne personnalisée intégrale.\nDeuxième ligne intacte.');await click(p,'save-special-option');await p.waitForFunction(()=>document.querySelector('#special-option-description')?.defaultValue.includes('Deuxième ligne intacte'));assert.equal(world.special.evenements_speciaux.saint_valentin.D6_activite[0][1],'Consigne personnalisée intégrale.\nDeuxième ligne intacte.');
  const {page:partner}=await open({actor:'b',query:'settings=1&section=jeu'});assert.equal(await partner.locator('[data-action="tab:library"]').count(),0);assert.equal(await partner.locator('[data-action="settings-page:admin"]').count(),0);assert.ok(world.calls.every(c=>!['import_love_advent_2026','import_love_special_events'].includes(c.name)||c.uid==='a'));
  // No relationship record exists for either account; all menus and saves worked above.
  assert.ok(!world.calls.some(c=>c.name==='save_my_wellbeing'));assert.deepEqual(errors,[]);
  const {page:profile}=await open({actor:'p',query:''});await profile.locator('#profile-name').fill('Alex');await profile.locator('#profile-gender').selectOption('her');await profile.locator('#signup-birth-month').selectOption('2');await profile.locator('#signup-birth-day').selectOption('14');await click(profile,'complete-registration');assert.ok(!world.calls.some(c=>c.name==='complete_love_registration'&&c.uid==='p'));await profile.locator('#age-confirm').check();await click(profile,'complete-registration');await profile.locator('#profile-name').waitFor({state:'detached'});assert.equal(world.profiles.find(p=>p.id==='p').gender,'her');
  const invite='72aa640b-2644-4d0d-bcf7-575587d27f31';
  const {page:auth}=await open({actor:'guest',query:'auth=signup&invite_id='+invite});await click(auth,'invite-start');await auth.locator('#signin-email').fill('new@test.invalid');await auth.locator('#signin-password').fill('Abcdefg8');await action(auth,'auth-signup-password').evaluate(e=>{e.click();e.click()});await auth.locator('.email-confirm-screen').waitFor();assert.equal(world.calls.filter(c=>c.auth==='signUp').length,1);assert.equal(await auth.locator('input[readonly]').inputValue(),'new@test.invalid');assert.equal(await auth.locator('.nav').count(),0);
  await click(auth,'email-confirm-login');await click(auth,'auth-reset-request');await click(auth,'auth-send-reset');await auth.locator('#auth-form-feedback').waitFor();const reset=world.calls.findLast(c=>c.auth==='resetPasswordForEmail');assert.ok(reset.args.redirectTo.includes('invite_id='+invite));assert.equal(await auth.evaluate(()=>sessionStorage.getItem('pendingInviteId')),invite);
  await click(auth,'auth-mode:signin');await click(auth,'google');const google=world.calls.findLast(c=>c.auth==='signInWithOAuth');assert.equal(google.args.provider,'google');assert.ok(google.args.options.redirectTo.includes('invite_id='+invite));
  const {page:verify}=await open({actor:'u',query:''});await click(verify,'email-confirm-recheck');assert.equal(await verify.locator('.nav').count(),0);world.users.u.email_confirmed_at='2026-10-17';await click(verify,'email-confirm-recheck');await verify.locator('#profile-name').waitFor();
  const {page:recover}=await open({actor:'a',query:'auth=recover'});await recover.locator('#signin-password').fill('short');await click(recover,'auth-update-password');assert.equal(world.calls.filter(c=>c.auth==='updateUser').length,0);await recover.locator('#signin-password').fill('SecureTest8');await click(recover,'auth-update-password');await recover.locator('.auth-editorial').waitFor({state:'detached'});assert.equal(world.calls.filter(c=>c.auth==='updateUser').length,1);
  console.log('EDITORIAL_FUNCTIONS_OK drafts, gender, optional timers, anti-repeat, invalid/cancelled/confirmed import, category preservation, immutable history, private editors, explicit age, no wellbeing gate, verified email, signup/recovery/Google invitation continuity');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
