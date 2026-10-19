// The real Settings > Notifications route, with local assets and synthetic
// platform/subscription responses. No live accounts or notification deliveries.
process.env.LOVEROLL_LOCAL_FILES='1';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const states=['web-active','web-disabled','web-denied','web-device','native-active','native-disabled','native-unconfigured','ios-uninstalled','unsupported'];
async function environment(context,kind){
 await context.addInitScript(kind=>{
  const native=kind.startsWith('native-'),registered=kind==='web-active'||kind==='native-active';
  const ios=kind==='ios-uninstalled';
  window.__pushFixtureRegistered=registered;window.__pushFixtureLocal=kind==='native-disabled'||kind==='native-unconfigured';
  window.__pushFixtureToken=registered?'synthetic-native-token':'';
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:ios?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1':'Mozilla/5.0 Chrome/130.0'});
  Object.defineProperty(navigator,'platform',{configurable:true,value:ios?'iPhone':'Linux'});
  Object.defineProperty(navigator,'standalone',{configurable:true,value:false});
  class FixtureNotification{}
  Object.defineProperty(FixtureNotification,'permission',{configurable:true,value:kind==='web-denied'?'denied':registered||kind==='web-device'?'granted':'default'});
  FixtureNotification.requestPermission=async()=>{if(kind==='web-denied')return 'denied';Object.defineProperty(FixtureNotification,'permission',{configurable:true,value:'granted'});return 'granted';};
  window.Notification=FixtureNotification;
  if(kind==='unsupported')delete window.PushManager;else window.PushManager=class {};
  const subscription={endpoint:'https://push.test.invalid/notification-design',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'synthetic-key',auth:'synthetic-auth'}};},async unsubscribe(){window.__pushFixtureRegistered=false;return true;}};
  const registration={pushManager:{async getSubscription(){return window.__pushFixtureRegistered?subscription:null;},async subscribe(){window.__pushFixtureRegistered=true;return subscription;}},async update(){},addEventListener(){}};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{getRegistration:async()=>registration,register:async()=>registration,ready:Promise.resolve(registration),addEventListener(){}}});
  if(native)window.LoveRollNativeAuth={
   nativePushConfigured:()=>kind!=='native-unconfigured',nativePushToken:()=>window.__pushFixtureToken,
   weeklyReminderEnabled:()=>window.__pushFixtureLocal,
   enableWeeklyReminder(){window.__pushFixtureLocal=true;},disableWeeklyReminder(){window.__pushFixtureLocal=false;},
   enableRemotePush(){window.__pushFixtureToken='synthetic-native-token';window.__pushFixtureRegistered=true;dispatchEvent(new CustomEvent('loveroll-native-push-token',{detail:{token:window.__pushFixtureToken}}));},
   disableRemotePush(){window.__pushFixtureToken='';window.__pushFixtureRegistered=false;},appVersion:()=> 'test-only'
  };
 },kind);
}
async function notificationPage(browser,kind,width,height){
 const world=createWorld();world.prefs={...world.prefs,enabled:['web-active','web-device','web-denied','native-active'].includes(kind),monthly:false};
 world.deviceRegistered=kind==='web-active'||kind==='native-active';
 const value=await setupEditorial(browser,world,{width,height,query:'settings=1&section=notifications'});
 await environment(value.context,kind);
 await value.context.route('**/__editorial-api',async route=>{
  const req=JSON.parse(route.request().postData());let data,error=null;
  if(req.table==='love_push_subscriptions')data=world.deviceRegistered?[{user_id:'a',endpoint:'https://push.test.invalid/notification-design'}]:[];
  else if(req.table==='love_push_native_devices')data=world.deviceRegistered?[{user_id:'a',device_token:'synthetic-native-token'}]:[];
  else if(req.write==='love_push_preferences'){world.calls.push({write:req.write,args:req.args});if(world.preferenceError){data=null;error={message:world.preferenceError};}else{world.prefs={...world.prefs,...req.args};data=true;}}
  else if(req.write==='love_push_subscriptions'){world.deviceRegistered=true;world.calls.push({write:req.write,args:req.args});data=true;}
  else if(req.name==='love_push_public_key')data=Buffer.alloc(65,1).toString('base64url');
  else if(req.name==='love_claim_native_push_token'){world.deviceRegistered=true;world.calls.push({name:req.name,args:req.args});data=true;}
  else if(req.name==='love_push_test_me'){world.calls.push({name:req.name});data=world.pushTestError?null:world.pushTestAccepted!==false;error=world.pushTestError?{message:world.pushTestError}:null;}
  else return route.fallback();
  await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error})});
 });
 await value.page.reload();await value.page.locator('.notification-settings').waitFor();
 return {...value,world};
}
async function inlineFeedback(page,{error=false,text=''}={}){
 await page.waitForFunction(({error,text})=>{
  const feedback=document.querySelector('#notification-feedback');
  return feedback&&!feedback.hidden&&feedback.textContent.trim()&&
   (feedback.dataset.tone==='error')===error&&feedback.textContent.toLocaleLowerCase('fr').includes(text.toLocaleLowerCase('fr'));
 },{error,text});
 const bounds=await page.locator('#notification-feedback').evaluate(element=>{
  const feedback=element.getBoundingClientRect(),panel=element.closest('.settings-detail-body').getBoundingClientRect();
  return {top:feedback.top,bottom:feedback.bottom,panelTop:panel.top,panelBottom:panel.bottom,navTop:document.querySelector('.nav').getBoundingClientRect().top};
 });
 assert.ok(bounds.top>=bounds.panelTop-1&&bounds.bottom<=Math.min(bounds.panelBottom,bounds.navTop)+1,'Inline feedback must be visible: '+JSON.stringify(bounds));
}
(async()=>{
 assert.match(fs.readFileSync('couple-web/index.html','utf8'),/notification-design-v127\.css\?v=/,'The production page must load the dedicated design');
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const [label,width,height] of [['S25',412,824],['small',360,640]])for(const kind of states){
   const {page,context,world,errors}=await notificationPage(browser,kind,width,height);
   const active=kind==='web-active'||kind==='native-active';
   const switches=page.locator('[data-push-option]');assert.equal(await switches.count(),4);
   for(const control of await switches.all())assert.equal(await control.isEnabled(),active,kind+' availability');
   assert.equal(await page.locator('[data-push-option="monthly"]').isChecked(),false,'Saved preferences must survive every display state');
   assert.equal(await page.locator('[data-action="push-test"]').count(),active?1:0);
   assert.equal(await page.locator('#notification-feedback').isVisible(),false);
   assert.equal(await page.locator('#notification-feedback').getAttribute('role'),'status');
   assert.equal(await page.locator('#notification-feedback').getAttribute('aria-live'),'polite');
   if(kind==='native-unconfigured')assert.equal(await page.locator('[data-action="push-enable"]').count(),0);
   if(kind==='ios-uninstalled')assert.equal(await page.locator('[data-action="show-install-guide"]').count(),1);
   const measurement=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const panel=document.querySelector('.settings-detail-body'),nav=document.querySelector('.nav');
    return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
     panel:rect(panel),panelScrollHeight:panel.scrollHeight,nav:rect(nav),content:rect(document.querySelector('.notification-settings')),
     controls:[...document.querySelectorAll('.notification-settings input,.notification-settings button')].map(e=>({label:e.getAttribute('aria-label')||e.textContent,...rect(e)})),
     tracks:[...document.querySelectorAll('.notification-settings [role="switch"]')].map(e=>{const track=getComputedStyle(e,'::before');return {width:parseFloat(track.width),height:parseFloat(track.height)};}),
     rows:[...document.querySelectorAll('.notification-option,.notification-local')].map(e=>({copy:rect(e.querySelector('.notification-choice-copy')),control:rect(e.querySelector('input,button'))}))};
   });
   assert.ok(measurement.pageWidth<=width+1&&measurement.pageHeight<=height+1,JSON.stringify({label,kind,measurement}));
   assert.ok(measurement.content.bottom<=measurement.panel.bottom+1,'No notification action may be clipped: '+JSON.stringify({label,kind,measurement}));
   for(const control of measurement.controls){assert.ok(control.w>=44&&control.h>=44,'44px target: '+JSON.stringify(control));assert.ok(control.bottom<=measurement.nav.y,'Navigation overlap: '+JSON.stringify(control));}
   for(const track of measurement.tracks)assert.deepEqual(track,{width:44,height:26},'The old checkbox cascade must not replace the switch track with a circle');
   for(const row of measurement.rows)assert.ok(row.copy.right<=row.control.x-5,'Text and switches must remain separate');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:'design-captures/notifications127-'+label+'-'+kind+'.png'});
   console.log('NOTIFICATION_DESIGN_OK',label,kind,JSON.stringify({state:await page.locator('.notification-settings').getAttribute('data-notification-state'),controls:measurement.controls.length,bottom:measurement.content.bottom,available:measurement.panel.bottom}));
   if(label==='S25'&&kind==='web-active'){
    await page.locator('[data-push-option="weekly"]').focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>!document.querySelector('[data-push-option="weekly"]').checked);
    await inlineFeedback(page,{text:'enregistr'});
    const saved=world.calls.findLast(c=>c.write==='love_push_preferences');assert.equal(saved.args.weekly,false);assert.equal(saved.args.enabled,true);assert.equal(world.prefs.monthly,false);
    world.preferenceError='Le choix n’a pas pu être enregistré.';
    await page.locator('[data-push-option="invitation"]').click();await inlineFeedback(page,{error:true,text:world.preferenceError});
    assert.equal(await page.locator('[data-push-option="invitation"]').isChecked(),true);assert.equal(await page.locator('[data-push-option="invitation"]').isEnabled(),true);assert.equal(world.prefs.invitation,true);world.preferenceError=null;
    await page.locator('[data-action="push-test"]').click();await inlineFeedback(page,{text:'test'});assert.equal(world.calls.filter(c=>c.name==='love_push_test_me').length,1);
    world.pushTestAccepted=false;
    await page.locator('[data-action="push-test"]').click();await inlineFeedback(page,{error:true,text:'refus'});world.pushTestAccepted=true;
    world.pushTestError='Le test n’a pas pu être envoyé.';
    await page.locator('[data-action="push-test"]').click();await inlineFeedback(page,{error:true,text:world.pushTestError});
    assert.equal(world.calls.filter(c=>c.name==='love_push_test_me').length,3);world.pushTestError=null;
    await page.locator('[data-action="push-disable"]').click();await page.waitForFunction(()=>document.querySelector('[data-push-option="weekly"]')?.disabled);
    await inlineFeedback(page);
    assert.equal(world.prefs.enabled,false);assert.equal(await page.locator('[data-push-option="weekly"]').isChecked(),false);
    await page.locator('[data-action="push-enable"]').click();await page.waitForFunction(()=>!document.querySelector('[data-push-option="weekly"]')?.disabled);
    await inlineFeedback(page);
    assert.equal(world.prefs.enabled,true);assert.equal(world.prefs.monthly,false);console.log('NOTIFICATION_EXISTING_ACTIONS_OK','keyboard preference + rollback, test success/refusal/error, disable, enable, visible inline feedback');
   }
   if(label==='small'&&kind==='native-disabled'){
    await page.locator('[data-action="native-notify-disable"]').click();
    await page.waitForFunction(()=>document.querySelector('.notification-local-switch')?.getAttribute('aria-checked')==='false');await inlineFeedback(page);
    await page.locator('[data-action="native-notify-enable"]').click();
    await page.waitForFunction(()=>document.querySelector('.notification-local-switch')?.getAttribute('aria-checked')==='true');await inlineFeedback(page);
    await page.locator('[data-action="push-enable"]').click();
    await page.waitForFunction(()=>document.querySelector('.notification-settings')?.dataset.notificationState==='active');await inlineFeedback(page);
    assert.equal(await page.locator('.notification-local-switch').getAttribute('aria-checked'),'false','Remote push still disables the duplicate Monday reminder');
    assert.equal(world.prefs.enabled,true);assert.equal(world.prefs.monthly,false);
    await page.screenshot({path:'design-captures/notifications127-small-native-feedback.png'});
    await page.locator('[data-action="push-disable"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-push-option="weekly"]')?.disabled);await inlineFeedback(page);
    assert.equal(world.prefs.enabled,false);assert.equal(world.prefs.monthly,false);
    console.log('NOTIFICATION_NATIVE_ACTIONS_OK','local reminder on/off, native enable/disable, no duplicate reminder, visible feedback on small mobile');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
