// Exercise the actual Android overlay and packaged observer through a debug
// WebView. The trusted page is fulfilled locally; no account or auth calls occur.
const {_android:android}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const site='https://fredvolks.github.io/mon-wallet-android/';
const pkg='ca.desadeux.jeu',activity=pkg+'/.ConnectedLoveRollActivity';
const bufferLimit=16*1024*1024;
const remaining=deadline=>{
 const time=deadline===Infinity?20000:deadline-Date.now();
 assert.ok(time>0,'Android capture exceeded its reserved startup budget');
 return Math.min(20000,time);
};
const adbUntil=(deadline,...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:remaining(deadline),maxBuffer:bufferLimit});
const adb=(...args)=>adbUntil(Infinity,...args);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const source=fs.readFileSync('couple-web/index.html','utf8');
const boot=source.match(/<main id="app">([\s\S]*?)<\/main>/)[1];
const fixture='<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<link rel="stylesheet" href="./loveroll-splash.css"></head><body style="margin:0;background:#10070c;color:#f5dcd8">'+
 '<main id="app">'+boot+'</main><script src="./loveroll-splash.js"></script></body></html>';
const files=new Map([
 ['loveroll-splash.css','text/css'],['loveroll-splash.js','application/javascript'],
 ['assets/loveroll-glass-heart-v123.webp','image/webp'],['assets/loveroll-splash-satin-v123.webp','image/webp'],
 ['assets/loveroll-wordmark-v127.svg','image/svg+xml'],['assets/loveroll-loading-caption-v127.svg','image/svg+xml']
]);
async function capture(name,{attempts=4,deadline=Infinity,check}={}){
 let error;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   adbUntil(deadline,'shell','uiautomator','dump','/sdcard/'+name+'.xml');
   adbUntil(deadline,'pull','/sdcard/'+name+'.xml','qa/'+name+'.xml');
   const xml=fs.readFileSync('qa/'+name+'.xml','utf8');
   if(check)check(xml);
   // The full-resolution satin/heart PNG exceeds Node's 1 MiB output default.
   // Retrying a truncated screenshot can otherwise consume the real 18s
   // startup watchdog before the held-state assertion is ever evaluated.
   fs.writeFileSync('qa/'+name+'.png',execFileSync('adb',['exec-out','screencap','-p'],{timeout:remaining(deadline),maxBuffer:bufferLimit}));
   return xml;
  }catch(e){
   error=e;
   console.warn('Android capture failed',name,'attempt '+(attempt+1)+'/'+attempts,
    e.code||'',e.message,String(e.stderr||'').trim());
   if(attempt+1<attempts)await pause(500);
  }
 }
 throw error;
}
function nodes(xml){
 return Array.from(xml.matchAll(/<node\b([^>]+)>/g),node=>Object.fromEntries(
  Array.from(node[1].matchAll(/([\w-]+)="([^"]*)"/g),pair=>[pair[1],pair[2]
   .replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<')
   .replaceAll('&gt;','>').replaceAll('&amp;','&')])));
}
function bounds(node){
 assert.ok(node?.bounds,'The accessible view must have bounds');
 const values=node.bounds.match(/-?\d+/g).map(Number);
 assert.equal(values.length,4);
 const [left,top,right,bottom]=values;
 return {left,top,right,bottom,width:right-left,height:bottom-top};
}
function imageSize(name){
 const bytes=fs.readFileSync('qa/'+name+'.png');
 assert.ok(bytes.length>24&&bytes.toString('ascii',1,4)==='PNG','A real PNG screenshot is required');
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
function buttons(xml,name,captions){
 const size=imageSize(name);
 return Object.fromEntries(captions.map(caption=>{
  const found=nodes(xml).filter(n=>n.class==='android.widget.Button'&&n.text===caption);
  assert.equal(found.length,1,'One accessible button is required: '+caption);
  assert.equal(found[0].enabled,'true');assert.equal(found[0].clickable,'true');
  const rect=bounds(found[0]);
  assert.ok(rect.width>0&&rect.height>0&&rect.left>=0&&rect.top>=0&&
   rect.right<=size.width&&rect.bottom<=size.height,'The full button must fit on screen: '+caption);
  return [caption,rect];
 }));
}
const tap=rect=>adb('shell','input','tap',String(Math.round((rect.left+rect.right)/2)),String(Math.round((rect.top+rect.bottom)/2)));
const preview=kind=>adb('shell','am','start','--activity-single-top','-n',activity,'--es','loveroll_debug_dialog',kind);
const callbackLog=()=>adb('logcat','-d','-v','brief','-s','LoveRollDialogQA:I','*:S');
const callbackCount=(log,message)=>log.split(message).length-1;
function dialogReadability(id){
 const log=adb('logcat','-d','-v','brief','-s','LoveRollDialogLayout:I','*:S');
 const readings=Array.from(log.matchAll(/\{[^\n]+\}/g),match=>JSON.parse(match[0]));
 const reading=readings.filter(value=>id===undefined||value.id===id).at(-1);
 assert.ok(reading,'The debug view must report its actual laid-out text lines');
 return reading;
}
const swipeContent=rect=>adb('shell','input','swipe',
 String(Math.round((rect.left+rect.right)/2)),String(Math.round(rect.top+rect.height*.88)),
 String(Math.round((rect.left+rect.right)/2)),String(Math.round(rect.top+rect.height*.12)),'400');
const updateFiles=()=>adb('shell','run-as',pkg,'find','cache','-maxdepth','2','-type','f')
 .split('\n').filter(name=>name.startsWith('cache/updates/')).sort();
async function dialogPreviews(){
 const filesBefore=updateFiles(),logBefore=callbackLog();
 const updateName='loveroll-native-update-dialog';
 preview('update');
 const update=await capture(updateName,{check:xml=>assert.ok(xml.includes('text="Mise à jour disponible"'))});
 const updateButtons=buttons(update,updateName,['Télécharger','Plus tard']);
 assert.ok(nodes(update).some(n=>n.text?.startsWith('Version ')),'The update version must remain readable');
 adb('shell','input','keyevent','KEYCODE_BACK');
 await capture('loveroll-native-update-dismissed',{check:xml=>{
  assert.ok(!xml.includes('text="Mise à jour disponible"'),'Back must dismiss the update preview');
  assert.ok(xml.includes('android.webkit.WebView'),'Dismissing the dialog must restore the existing page');
 }});
 assert.equal(callbackCount(callbackLog(),'download callback'),callbackCount(logBefore,'download callback'),'Back must not accept the update');
 preview('update');
 const acceptName='loveroll-native-update-callback';
 const accept=await capture(acceptName,{check:xml=>assert.ok(xml.includes('text="Mise à jour disponible"'))});
 tap(buttons(accept,acceptName,['Télécharger'])['Télécharger']);
 await capture('loveroll-native-update-accepted',{check:xml=>assert.ok(!xml.includes('text="Mise à jour disponible"')&&xml.includes('android.webkit.WebView'))});
 assert.equal(callbackCount(callbackLog(),'download callback'),callbackCount(logBefore,'download callback')+1,'The real primary button must invoke the safe preview callback once');
 assert.deepEqual(updateFiles(),filesBefore,'Dialog previews must not create an APK download');

 // A real display-size change recreates the activity in a 411 x 366 dp
 // landscape window. Wait for its actual UI before delivering the preview
 // intent, and restore the original display even if an assertion fails.
 const displayBefore=adb('shell','wm','size');
 const previousOverride=displayBefore.match(/Override size:\s*(\d+x\d+)/)?.[1]||'reset';
 let longButtons,scrollBounds,shortSize,reading;
 try{
  adb('shell','wm','size','1080x960');
  await capture('loveroll-native-short-screen',{check:xml=>{
   const app=nodes(xml).find(n=>n.package===pkg);
   const rect=bounds(app);
   assert.ok(rect.width>rect.height&&rect.bottom<=960,'Wait for the short landscape activity after recreation');
  }});
  preview('long');
  const longName='loveroll-native-dialog-long-landscape';
  const long=await capture(longName,{check:xml=>assert.ok(xml.includes('text="Notifications LoveRoll"'))});
  shortSize=imageSize(longName);
  assert.deepEqual(shortSize,{width:1080,height:960});
  longButtons=buttons(long,longName,['Continuer','Annuler']);
  const scroll=nodes(long).find(n=>n.class==='android.widget.ScrollView'&&n.scrollable==='true');
  scrollBounds=bounds(scroll);
  assert.ok(scrollBounds.height>0&&scrollBounds.bottom<=longButtons.Continuer.top,'Long text must scroll above the fixed action buttons');
  const initialReading=dialogReadability();
  assert.equal(initialReading.scrollY,0,'The long dialog must open at the start of its text');
  assert.equal(initialReading.firstFullyVisibleLine,0,'The first description line must be entirely readable');
  assert.ok(initialReading.fullyVisibleLines>=2,'At least two nonempty description lines must be fully visible on opening');
  assert.ok(initialReading.totalLines>initialReading.fullyVisibleLines&&initialReading.maxScrollY>0,'The long fixture must need real scrolling');

  swipeContent(scrollBounds);
  const scrolledName='loveroll-native-dialog-long-scrolled';
  const scrolled=await capture(scrolledName);
  const afterSwipe=dialogReadability(initialReading.id);
  assert.ok(afterSwipe.scrollY>0&&afterSwipe.firstFullyVisibleLine>initialReading.firstFullyVisibleLine,
   'A real swipe must expose later description lines');
  assert.ok(afterSwipe.fullyVisibleLines>=2,'Later text must also have multiple complete readable lines');
  assert.deepEqual(buttons(scrolled,scrolledName,['Continuer','Annuler']),longButtons,'Actions must stay fixed while content scrolls');

  let endReading=afterSwipe,swipes=1;
  for(;swipes<20&&endReading.lastFullyVisibleLine<endReading.totalLines-1;swipes++){
   swipeContent(scrollBounds);await pause(150);
   endReading=dialogReadability(initialReading.id);
  }
  const endName='loveroll-native-dialog-long-end';
  const end=await capture(endName);
  endReading=dialogReadability(initialReading.id);
  assert.equal(endReading.lastFullyVisibleLine,endReading.totalLines-1,'The final description line must be reachable and entirely visible');
  assert.ok(endReading.fullyVisibleLines>=2&&Math.abs(endReading.scrollY-endReading.maxScrollY)<=2,
   'The entire long message must be readable down to its real scroll end');
  assert.deepEqual(buttons(end,endName,['Continuer','Annuler']),longButtons,'Actions must stay fully accessible at the end of the message');
  assert.equal(callbackCount(callbackLog(),'accept callback'),callbackCount(logBefore,'accept callback'),'Reading must not trigger an action');
  reading={initial:initialReading,afterSwipe,end:endReading,swipes};
  tap(longButtons.Continuer);
  await capture('loveroll-native-dialog-long-accepted',{check:xml=>assert.ok(!xml.includes('text="Notifications LoveRoll"'))});
  assert.equal(callbackCount(callbackLog(),'accept callback'),callbackCount(logBefore,'accept callback')+1);
  preview('long');
  const cancelName='loveroll-native-dialog-long-cancel';
  const cancel=await capture(cancelName,{check:xml=>assert.ok(xml.includes('text="Notifications LoveRoll"'))});
  tap(buttons(cancel,cancelName,['Annuler']).Annuler);
  await capture('loveroll-native-dialog-long-cancelled',{check:xml=>assert.ok(!xml.includes('text="Notifications LoveRoll"'))});
  assert.equal(callbackCount(callbackLog(),'cancel callback'),callbackCount(logBefore,'cancel callback')+1);
 }finally{
  adb('shell','wm','size',previousOverride);
 }
 fs.writeFileSync('qa/loveroll-native-dialog-metrics.json',JSON.stringify({
  updateButtons,landscape:{size:shortSize,buttons:longButtons,scrollBounds,reading},
  callbacks:{backDismissed:true,updateAccepted:true,longAccepted:true,longCancelled:true},
  apkDownloadsCreated:false
 },null,2));
 console.log('LOVEROLL_NATIVE_DIALOGS_OK update, Back, callbacks, short landscape, complete text reading');
}
(async()=>{
 fs.mkdirSync('qa',{recursive:true});
 let device;
 try{
  const devices=await android.devices();
  assert.equal(devices.length,1,'The regression requires one isolated Android emulator');
  device=devices[0];
  const webview=await device.webView({pkg:'ca.desadeux.jeu'});
  // Android's entry point avoids desktop-only browser-context commands that
  // the actual WebView protocol intentionally does not implement.
  const page=await webview.page();
  const context=page.context();
  assert.ok(page.url().startsWith(site),'The installed app must expose its trusted WebView in debug builds');
  const protocol=await context.newCDPSession(page);
  await protocol.send('Network.enable');
  await protocol.send('Network.setBypassServiceWorker',{bypass:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  const nativeAnimationScale=adb('shell','settings','get','global','animator_duration_scale').trim();
  assert.equal(Number(nativeAnimationScale),0,'Native animations must be disabled for exact artwork captures');
  // Restrict the fixture to the existing trusted origin. Android still executes
  // its real onPageStarted/onPageFinished, Java bridge and visual-state callback.
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(!url.href.startsWith(site))return route.abort();
   const relative=url.pathname.slice(new URL(site).pathname.length);
   if(!relative)return route.fulfill({contentType:'text/html',body:fixture});
   if(files.has(relative))return route.fulfill({contentType:files.get(relative),body:fs.readFileSync(path.join('couple-web',relative))});
   return route.abort();
  });
  for(const mode of ['destination','recovery']){
   const started=Date.now(),deadline=started+14000;
   await page.goto(site+'?startup_handoff_qa='+mode,{waitUntil:'load',timeout:remaining(deadline)});
   try{
    await page.waitForFunction(()=>document.readyState==='complete'&&window.__loveRollNativeStartup?.serial>0,null,{timeout:remaining(deadline)});
    assert.equal(await page.locator('[data-lr-boot]').count(),1);
    let metrics;
    if(mode==='destination'){
     metrics=await page.evaluate(()=>{
      const rect=selector=>{
       const r=document.querySelector(selector).getBoundingClientRect();
       return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
      };
      return {viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,
       reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,
       rects:{loader:rect('.lr-splash'),heart:rect('.lr-splash__heart'),
        logo:rect('.lr-splash__wordmark'),caption:rect('.lr-splash__caption img'),dots:rect('.lr-splash__dots')},
       images:[...document.querySelectorAll('.lr-splash img')].map(img=>({url:img.currentSrc,
        complete:img.complete,width:img.naturalWidth,height:img.naturalHeight}))};
     });
     assert.ok(metrics.reducedMotion&&metrics.images.every(img=>img.complete&&img.width>0),'Shared artwork must be loaded and still');
     await page.screenshot({path:'qa/loveroll-startup-web-held-destination.png',animations:'disabled',timeout:Math.min(5000,remaining(deadline))});
    }
    // Page load is finished but the asynchronous destination is still withheld.
    // Capture once within a 14s budget, leaving room before the real 18s watchdog.
    const heldName='loveroll-native-startup-held-'+mode;
    const held=await capture(heldName,{attempts:1,deadline});
    assert.ok(held.includes('content-desc="Chargement de votre espace…"'),'Native heart disappeared while the HTML loading screen was still present');
    if(metrics){
     metrics.native={bounds:bounds(nodes(held).find(n=>n['content-desc']==='Chargement de votre espace…')),
      screen:imageSize(heldName),animationScale:nativeAnimationScale};
     metrics.captureDurationMs=Date.now()-started;
     fs.writeFileSync('qa/loveroll-startup-lettering-metrics-destination.json',JSON.stringify(metrics,null,2));
    }
   }finally{
    // Release the destination even when capture fails, so diagnostic retries
    // cannot manufacture an unrelated native network-timeout failure.
    await page.evaluate(mode=>{
     if(mode==='recovery')window.dispatchEvent(new Event('loveroll:boot-error'));
     document.querySelector('#app').innerHTML=mode==='recovery'?
      '<section role="alert" style="padding:48px"><h1>LoveRoll</h1><button>Réessayer</button></section>':
      '<section style="padding:48px"><h1>LoveRoll est prêt</h1><p>Votre espace</p></section>';
    },mode);
   }
   await page.locator('.lr-splash').waitFor({state:'detached'});
   await pause(350);
   const ready=await capture('loveroll-native-startup-ready-'+mode);
   assert.ok(!ready.includes('content-desc="Chargement de votre espace…"'),'Native startup remained above the rendered destination');
   assert.ok(ready.includes('android.webkit.WebView'),'The painted WebView must be accessible after startup');
   assert.ok(ready.includes(mode==='recovery'?'Réessayer':'LoveRoll est prêt'),'The real destination must be visible, with no second loader');
   console.log('LOVEROLL_NATIVE_SINGLE_STARTUP_OK',mode);
  }
  await dialogPreviews();
 }finally{
  if(device)await device.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
