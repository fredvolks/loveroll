const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [width,height] of [[360,640],[412,824],[820,1180],[1366,768]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.route(origin+'/__lr025_privacy.html',route=>route.fulfill({
    contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
     '<meta name="viewport" content="width=device-width,initial-scale=1">'+
     '<link rel="stylesheet" href="'+origin+'/privacy-screen.css"></head><body>'+
     '<main id="app"><h1>Défi privé : contenu confidentiel</h1>'+
     '<button type="button" data-lr-privacy-hide>Masquer</button>'+
     '<button type="button" data-unsafe-action>Action du jeu</button></main>'+
     '<script>document.addEventListener("keydown",e=>{if(e.key==="Escape")document.body.dataset.gameBack="yes"})</script>'+'<script type="module" src="'+origin+'/privacy-screen.mjs"></script></body></html>'
   }));
   await page.goto(origin+'/__lr025_privacy.html',{waitUntil:'load'});
   await page.locator('[data-lr-privacy-hide]').click();
   const hidden=await page.evaluate(()=>{
    const app=document.querySelector('#app');
    const overlay=document.querySelector('[data-lr-privacy-screen]');
    return {stored:localStorage.getItem('loveroll-privacy-mask-v1'),
      title:document.title,hidden:getComputedStyle(app).visibility,
      inert:app.inert,shield:getComputedStyle(overlay).display,
      screenTop:overlay.getBoundingClientRect().top,
      screenBottom:overlay.getBoundingClientRect().bottom};
   });
   assert.equal(hidden.stored,'1');
   assert.equal(hidden.title,'LoveRoll');
   assert.equal(hidden.hidden,'hidden');
   assert.equal(hidden.inert,true);
   assert.equal(hidden.shield,'grid');
   assert.ok(hidden.screenTop<=0&&hidden.screenBottom>=height);
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('lr-privacy-active')),true,
    'Escape must never reveal private content unexpectedly');
   assert.equal(await page.evaluate(()=>document.body.dataset.gameBack),undefined,
    'Escape may not reach the underlying app while masked');
   await page.reload({waitUntil:'load'});
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('lr-privacy-active')),true,
    'Mask must survive page reload on the same device');
   await page.locator('[data-lr-privacy-reveal]').click();
   assert.equal(await page.evaluate(()=>document.querySelector('#app').inert),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('loveroll-privacy-mask-v1')),'0');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#app')).visibility),'visible');
   console.log('LR025_PRIVACY_OK',width,height,JSON.stringify(hidden));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
