// Actual Settings and signup routes. All accounts, responses and mutations are
// synthetic; no dissociation is accepted and nothing reaches a real account.
process.env.LOVEROLL_LOCAL_FILES='1';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const action=(page,name)=>page.locator('[data-action="'+name+'"]');
async function inspectDialog(page,label,name){
 const overlay=page.locator('.install-overlay,#lr-dialog-overlay');await overlay.waitFor();
 const measure=await overlay.evaluate(element=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const card=element.querySelector('.install-modal,.lr-dialog-card'),content=element.querySelector('.install-content,.lr-dialog-content');
  const primary=element.querySelector('.install-primary,.lr-dialog-accept'),cancel=element.querySelector('.install-later,.install-secondary,.lr-dialog-cancel');
  const close=element.querySelector('.install-close,.lr-dialog-close');
  return {viewport:{width:innerWidth,height:innerHeight},card:rect(card),content:rect(content),scrollable:content.scrollHeight>content.clientHeight,
   focusInside:element.contains(document.activeElement),backgroundInert:!!document.querySelector('.nav')?.closest('[inert]'),
   headingFont:getComputedStyle(element.querySelector('h2')).fontFamily,
   buttons:[...element.querySelectorAll('button')].map(button=>({label:button.textContent,...rect(button)})),
   emblem:rect(element.querySelector('.install-symbol,.lr-dialog-icon')),
   primary:getComputedStyle(primary).backgroundImage,cancel:cancel?getComputedStyle(cancel).backgroundImage:null,
   close:close?{background:getComputedStyle(close).backgroundImage,shadow:getComputedStyle(close).boxShadow}:null};
 });
 assert.ok(measure.focusInside&&measure.backgroundInert,'A modal must own focus and make the app inert: '+JSON.stringify({label,name,measure}));
 assert.match(measure.headingFont,/Georgia/);
 assert.ok(measure.card.x>=10&&measure.card.right<=measure.viewport.width-10&&measure.card.y>=19&&measure.card.bottom<=measure.viewport.height-19,'Safe margins: '+JSON.stringify({label,name,measure}));
 assert.ok(measure.emblem.height<=32,'No oversized icon');
 for(const button of measure.buttons)assert.ok(button.width>=44&&button.height>=44&&button.y>=measure.card.y&&button.bottom<=measure.card.bottom,'All actions remain visible, even when the message scrolls: '+JSON.stringify({label,name,button,card:measure.card}));
 assert.notEqual(measure.primary,'none');if(measure.cancel!==null)assert.equal(measure.cancel,'none','Cancel must not inherit the global primary gradient');
 if(measure.close)assert.deepEqual(measure.close,{background:'none',shadow:'none'},'Close is a neutral 44px control');
 await page.screenshot({path:'design-captures/web-dialogs127-'+label+'-'+name+'.png'});
 for(let index=0;index<measure.buttons.length+2;index++){
  await page.keyboard.press('Tab');assert.equal(await overlay.evaluate(element=>element.contains(document.activeElement)),true,'Tab must stay within the dialog');
 }
 await page.keyboard.press('Shift+Tab');assert.equal(await overlay.evaluate(element=>element.contains(document.activeElement)),true);
 console.log('WEB_DIALOG_DESIGN_OK',label,name,JSON.stringify({card:measure.card,scrollable:measure.scrollable,buttons:measure.buttons.length}));
 return measure;
}
async function isClosed(page){
 await page.locator('.install-overlay,#lr-dialog-overlay').waitFor({state:'detached'});
 assert.equal(await page.locator('#app').evaluate(root=>root.inert||!!root.querySelector('[inert]')),false,'The app must become interactive again');
}
async function platform(context,kind){
 await context.addInitScript(kind=>{
  const ios=kind==='embedded'||kind==='ios';
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:ios?'Mozilla/5.0 (iPhone) '+(kind==='embedded'?'Messenger':'Safari'):'Mozilla/5.0 (Linux; Android 16) Chrome'});
  Object.defineProperty(navigator,'platform',{configurable:true,value:ios?'iPhone':'Android'});
  Object.defineProperty(navigator,'standalone',{configurable:true,value:kind==='installed'});
  if(kind==='native')window.LoveRollNativeAuth={nativePushConfigured:()=>false,nativePushToken:()=>'',weeklyReminderEnabled:()=>false,appVersion:()=> 'test-only'};
 },kind);
}
(async()=>{
 assert.match(fs.readFileSync('couple-web/index.html','utf8'),/web-dialogs-v127\.css\?v=/,'The production page must load the dialog design');
 fs.mkdirSync('design-captures',{recursive:true});const browser=await chromium.launch({headless:true});
 try{
  for(const [label,width,height] of [['S25',412,824],['small',360,640],['short',360,480],['PC',1366,768]]){
   const world=createWorld(),{page,context,errors}=await setupEditorial(browser,world,{width,height,query:'settings=1&section=application'});
   await action(page,'install-home').click();await inspectDialog(page,label,'install-guide');
   await page.keyboard.press('Escape');await isClosed(page);
   assert.equal(await action(page,'install-home').evaluate(element=>element===document.activeElement),true,'Return focus to the settings row');
   await action(page,'install-home').click();assert.equal(await page.evaluate(()=>window.loveRollHandleBack()),true);await isClosed(page);
   assert.equal(await page.locator('.settings-detail-body').getAttribute('data-settings-page'),'application','Android Back closes the guide before navigating');
   await action(page,'tab:settings').click();await action(page,'settings-page:couple').click();
   await action(page,'end-couple').click();await inspectDialog(page,label,'confirm-disassociate');
   if(label==='short'){
    await page.setViewportSize({width:360,height:360});
    assert.equal((await inspectDialog(page,'very-short','confirm-disassociate')).scrollable,true,'A short viewport scrolls the message while keeping both choices visible');
    await page.setViewportSize({width,height});
   }
   await page.locator('.lr-dialog-cancel').click();await isClosed(page);
   assert.equal(await action(page,'end-couple').evaluate(element=>element===document.activeElement),true,'Return focus after cancellation');
   await action(page,'end-couple').click();await page.keyboard.press('Escape');await isClosed(page);
   assert.ok(!world.calls.some(call=>call.name==='end_love_match'),'Cancellation never dissociates the couple');
   if(label==='small'){
    await action(page,'tab:settings').click();await action(page,'settings-page:jeu').click();await action(page,'tab:library').click();
    await action(page,'custom-slot:1').click();await page.locator('#custom-title').fill('Brouillon local de test');await action(page,'editor-back').click();
    await inspectDialog(page,label,'confirm-unsaved');await page.locator('.lr-dialog-cancel').click();await isClosed(page);
    assert.equal(await page.locator('#custom-title').inputValue(),'Brouillon local de test');
    await action(page,'editor-back').click();await page.locator('.lr-dialog-accept').click();await isClosed(page);
    await page.locator('.editorial-card-list').waitFor();assert.ok(!world.calls.some(call=>call.name==='save_love_card_with_roles'),'Only the local draft was abandoned');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  // Both optional-install choices are exercised after actual profile completion.
  for(const [label,width,height] of [['S25',412,824],['small',360,640]]){
   const world=createWorld(),{page,context,errors}=await setupEditorial(browser,world,{width,height,actor:'p',query:''});
   await page.locator('#profile-name').fill('Alex');await page.locator('#profile-gender').selectOption('her');
   await page.locator('#signup-birth-month').selectOption('2');await page.locator('#signup-birth-day').selectOption('14');await page.locator('#age-confirm').check();
   await action(page,'complete-registration').click();await inspectDialog(page,label,'install-offer');
   if(label==='S25'){await action(page,'install-home').click();await inspectDialog(page,label,'offer-instructions');await action(page,'install-understood').click();}
   else await action(page,'install-later').click();
   await isClosed(page);assert.equal(await page.evaluate(()=>document.activeElement===document.body),false,'A vanished signup trigger restores focus to the new page');
   assert.deepEqual(errors,[]);await context.close();
  }
  for(const kind of ['native','ios','embedded','installed']){
   const {page,context,errors}=await setupEditorial(browser,createWorld(),{width:360,height:640,query:'settings=1&section=application'});
   await platform(context,kind);await page.reload();
   await page.locator('[data-action="install-home"],[data-action="show-install-guide"]').click();
   await inspectDialog(page,'small','install-'+kind);
   if(kind==='embedded')assert.equal(await action(page,'install-copy-url').count(),1);
   await action(page,'install-understood').click();await isClosed(page);assert.deepEqual(errors,[]);await context.close();
  }
  console.log('WEB_DIALOG_ACTIONS_OK optional install, instructions, cancel, Escape, Android Back, restored focus/inert, preserved local draft and explicit abandon');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
