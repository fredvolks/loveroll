// Real first paint, real app routing and recovery. No live users or auth writes.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const origin=process.env.LOVEROLL_TEST_ORIGIN||'http://127.0.0.1:8765/';
const fake=fs.readFileSync('couple-web/boot-smoke.cjs','utf8').match(/const fakeSupabase=`([\s\S]*?)`;/)[1];
const gated=fake.replace('getUser:async()=>({data:{user:authenticated?user:null},error:null}),','getUser:async()=>{await window.__bootGate;return {data:{user:authenticated?user:null},error:null};},');
// Execute the exact asset injected by ConnectedLoveRollActivity, rather than a
// JavaScript approximation of its native-to-WebView handoff.
const nativeStartup=fs.readFileSync('app/src/main/assets/loveroll-native-startup.js','utf8');
const bootRoutes=[['no-session','boot_case=anonymous','.love-discover'],['saved-session','boot_case=paired','.loveroll-real-home'],['invitation','boot_case=anonymous&invite_id=72aa640b-2644-4d0d-bcf7-575587d27f31','[data-action="invite-start"]']];
function nativeBridgeFixture(){
 window.__nativeReady=[];
 window.LoveRollNativeAuth={splashReady(serial){
  window.__nativeReady.push({serial:Number(serial),loaders:document.querySelectorAll('.lr-splash,[data-lr-boot]').length,
   destination:document.querySelector('#app')?.firstElementChild?.tagName||null});
 }};
}
async function installNativeStartup(page,serial){await page.evaluate('('+nativeStartup+')('+Number(serial)+')');}
async function settleFrames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function assertNativeReady(page,serial){
 await page.waitForFunction(()=>window.__nativeReady.length>0);
 const signals=await page.evaluate(()=>window.__nativeReady);
 assert.equal(signals.length,1,'A navigation must hand off to the real page exactly once');
 assert.equal(signals[0].serial,serial,'Only the current navigation may finish the splash');
 assert.equal(signals[0].loaders,0,'The native splash must never reveal another loading screen');
 assert.ok(signals[0].destination,'The destination must have rendered before native dismissal');
}
(async()=>{
 const site=fs.readFileSync('couple-web/index.html','utf8'),markup=site.match(/<main id="app">([\s\S]*?)<\/main>/)[1].replaceAll('src="./assets/','src="'+origin+'assets/');
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const [name,width,height] of [['small',360,640],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['iPad-landscape',1180,820],['PC',1366,768],['landscape-phone',740,360]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<768,hasTouch:width<768});
   await page.setContent('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="'+origin+'loveroll-splash.css"></head><body style="margin:0"><main id="app">'+markup+'</main><script src="'+origin+'loveroll-splash.js"></script></body></html>'.replaceAll('src="./assets/','src="'+origin+'assets/'),{waitUntil:'load'});
   await page.locator('.lr-splash__heart').evaluate(e=>e.decode());
   const info=await page.evaluate(()=>{
    const bounds=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
    return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
     heart:bounds(document.querySelector('.lr-splash__heart')),logo:bounds(document.querySelector('.lr-splash__logo')),caption:bounds(document.querySelector('.lr-splash__caption')),
     text:document.querySelector('.lr-splash').getAttribute('aria-label'),dots:document.querySelectorAll('.lr-splash__dots i').length,
     obsolete:document.querySelectorAll('.lr-splash__ring,.lr-splash__back-heart').length,buttons:document.querySelectorAll('button,nav').length,
     loaded:[...document.images].every(i=>i.complete&&i.naturalWidth>0),animation:getComputedStyle(document.querySelector('.lr-splash__heart')).animationName};
   });
   assert.equal(info.text,'Chargement de votre espace…');assert.equal(info.dots,3);assert.equal(info.obsolete,0);assert.equal(info.buttons,0);assert.ok(info.loaded);
   assert.equal(info.animation,'lr-splash-beat');assert.ok(info.scrollWidth<=width&&info.scrollHeight<=height);
   for(const element of [info.heart,info.logo,info.caption]){assert.ok(Math.abs(element.x+element.w/2-width/2)<2);assert.ok(element.y>=0&&element.y+element.h<=height);}
   await page.screenshot({path:'design-captures/glass123-'+name+'.png'});
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.lr-splash__heart').evaluate(e=>getComputedStyle(e).animationName),'none');
   await page.evaluate(()=>document.querySelector('#app').replaceChildren());await page.waitForTimeout(30);assert.equal(await page.locator('.lr-splash').count(),0);
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(()=>{window.__ticket1=LoveRollLoader.begin(0);window.__ticket2=LoveRollLoader.begin(0);});await page.locator('.lr-splash--overlay').waitFor();
   await page.evaluate(()=>LoveRollLoader.end(window.__ticket1));assert.equal(await page.locator('.lr-splash--overlay').count(),1);
   await page.evaluate(()=>LoveRollLoader.end(window.__ticket2));assert.equal(await page.locator('.lr-splash--leaving').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
   await page.locator('.lr-splash--overlay').waitFor({state:'detached'});console.log('GLASS_SPLASH_OK',name,JSON.stringify(info));await page.close();
  }
  for(const [name,query,expected] of bootRoutes){
   const page=await browser.newPage({viewport:{width:412,height:824},serviceWorkers:'block'});
   await page.addInitScript(()=>{window.__bootGate=new Promise(resolve=>window.__releaseBoot=resolve);});
   await page.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:gated}));
   await page.goto(origin+'?'+query,{waitUntil:'domcontentloaded'});await page.locator('[data-lr-boot]').waitFor();assert.equal(await page.locator('.nav').count(),0);
   await page.evaluate(()=>window.__releaseBoot());await page.locator(expected).waitFor();
   const leaving=page.locator('.lr-splash--leaving');if(await leaving.count())assert.equal(await leaving.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
   await page.locator('.lr-splash').waitFor({state:'detached'});console.log('REAL_BOOT_ROUTE_OK',name);await page.close();
  }
  for(const [viewport,width,height] of [['small',360,640],['S25',412,824]])for(const [name,query,expected] of bootRoutes){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   await page.addInitScript(nativeBridgeFixture);
   await page.addInitScript(()=>{window.__bootGate=new Promise(resolve=>window.__releaseBoot=resolve);});
   await page.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:gated}));
   await page.goto(origin+'?'+query,{waitUntil:'domcontentloaded'});
   await page.locator('[data-lr-boot]').waitFor();
   await installNativeStartup(page,101);
   await settleFrames(page);
   assert.equal(await page.evaluate(()=>window.__nativeReady.length),0,'Page load alone must not dismiss native startup');
   // Repeated callbacks for this same document must remain idempotent.
   await installNativeStartup(page,101);
   await page.evaluate(()=>{
    window.__bootFades=[];
    new MutationObserver(records=>{
     for(const record of records)for(const node of record.addedNodes)
      if(node.nodeType===1&&node.matches('.lr-splash--leaving'))window.__bootFades.push(node.className);
    }).observe(document.body,{childList:true});
   });
   await page.evaluate(()=>window.__releaseBoot());await page.locator(expected).waitFor();
   await assertNativeReady(page,101);
   assert.equal(await page.locator('.lr-splash').count(),0);
   assert.deepEqual(await page.evaluate(()=>window.__bootFades),[],'Native startup owns the fade; the web boot must not be reinserted');
   await installNativeStartup(page,101);
   await page.evaluate(()=>document.querySelector('#app').appendChild(document.createComment('later app render')));
   await settleFrames(page);await assertNativeReady(page,101);
   console.log('NATIVE_DIRECT_DESTINATION_OK',viewport,name);await page.close();
  }
  // A nonempty shell, unrelated DOM changes and a secondary loader still are
  // not a finished destination.
  {
   const page=await browser.newPage({viewport:{width:412,height:824}});
   await page.setContent('<!doctype html><main id="app"></main>');await page.evaluate(nativeBridgeFixture);
   await installNativeStartup(page,201);
   await page.evaluate(()=>{document.querySelector('#app').textContent='Initialisation';document.body.appendChild(document.createElement('aside'));});
   await settleFrames(page);assert.equal(await page.evaluate(()=>window.__nativeReady.length),0);
   await page.evaluate(()=>{
    const loading=document.createElement('div');loading.className='lr-splash lr-splash--overlay';document.body.appendChild(loading);
    document.querySelector('#app').innerHTML='<section>Destination prête</section>';
   });
   await settleFrames(page);assert.equal(await page.evaluate(()=>window.__nativeReady.length),0,'A loader outside #app still blocks native dismissal');
   await installNativeStartup(page,201);
   await page.evaluate(()=>document.querySelector('.lr-splash').remove());
   await assertNativeReady(page,201);console.log('NATIVE_EMPTY_ROOT_AND_SECONDARY_LOADER_OK');await page.close();
  }
  // An old document must never inherit the serial of a newer navigation. A
  // stale native callback cancels its watcher; only a truly new document can
  // bind that newer serial, including when reloading exactly the same URL.
  {
   const page=await browser.newPage({viewport:{width:412,height:824},serviceWorkers:'block'});
   await page.addInitScript(nativeBridgeFixture);
   await page.addInitScript(()=>{window.__bootGate=new Promise(resolve=>window.__releaseBoot=resolve);});
   await page.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:gated}));
   await page.goto(origin+'?boot_case=anonymous',{waitUntil:'domcontentloaded'});await page.locator('[data-lr-boot]').waitFor();
   await installNativeStartup(page,401);await installNativeStartup(page,402);
   assert.equal(await page.evaluate(()=>window.__loveRollNativeStartup.serial),401,'A document cannot be relabeled as a newer navigation');
   await page.evaluate(()=>window.__releaseBoot());await page.locator('.love-discover').waitFor();
   await settleFrames(page);
   assert.deepEqual(await page.evaluate(()=>window.__nativeReady),[],'The canceled old document must not release either navigation');
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-lr-boot]').waitFor();
   assert.equal(await page.evaluate(()=>window.__loveRollNativeStartup),undefined,'A real navigation creates a fresh document binding');
   await installNativeStartup(page,402);await settleFrames(page);
   assert.equal(await page.evaluate(()=>window.__nativeReady.length),0);
   await page.evaluate(()=>window.__releaseBoot());await page.locator('.love-discover').waitFor();
   await assertNativeReady(page,402);console.log('NATIVE_DOCUMENT_GENERATION_OK');await page.close();
  }
  for(const native of [false,true])for(const failure of ['syntax','network']){
   const page=await browser.newPage({viewport:{width:412,height:824},serviceWorkers:'block'});await page.clock.install();
   await page.clock.pauseAt(new Date(Date.now()+1000));
   if(native)await page.addInitScript(nativeBridgeFixture);
   await page.route('**/app.js?*',r=>failure==='syntax'?r.fulfill({contentType:'application/javascript',body:'export const broken = ;'}):r.abort('internetdisconnected'));
   const invite='72aa640b-2644-4d0d-bcf7-575587d27f31';await page.goto(origin+'?invite_id='+invite,{waitUntil:'domcontentloaded'});
   if(native){await installNativeStartup(page,301);assert.equal(await page.evaluate(()=>window.__nativeReady.length),0);}
   await page.clock.fastForward(18100);await page.clock.resume();await page.locator('.boot-retry-button').waitFor();assert.equal(await page.locator('.lr-splash').count(),0);
   if(native)await assertNativeReady(page,301);
   await page.screenshot({path:'design-captures/glass123-error-'+(native?'native-':'browser-')+failure+'.png'});
   await page.locator('.boot-retry-button').click();await page.waitForURL(u=>u.searchParams.has('boot_retry'));assert.equal(new URL(page.url()).searchParams.get('invite_id'),invite);
   console.log('BOOT_RECOVERY_OK',native?'native':'browser',failure,'retry keeps invitation');await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
