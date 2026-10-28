// LR-017: DOM + responsive proof; no real account or private content is loaded.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:8765';
(async()=>{
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const {width,height,label} of [
   {width:360,height:640,label:'android-small'},
   {width:412,height:915,label:'galaxy-s25'},
   {width:820,height:1180,label:'ipad-portrait'},
   {width:1180,height:820,label:'ipad-landscape'},
   {width:1440,height:900,label:'pc'}
  ]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<=820,
    hasTouch:width<=820,deviceScaleFactor:1});
   await page.route(origin+'/__lr017-adaptation.html',route=>route.fulfill({
    contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="fr-CA"><head><meta charset="utf-8">'+
     '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
     '<link rel="stylesheet" href="'+origin+'/challenge-adaptation.css">'+
     '<style>*{box-sizing:border-box}body{margin:0;background:#25131a;color:#fff5fa;font:16px system-ui}'+
     'main{width:100%;max-width:620px;margin:0 auto;padding:12px}button{font:inherit}</style></head>'+
     '<body><main><h1>Adapter notre défi</h1><div id="panel"></div><div id="inbox"></div></main>'+
     '<script type="module">import {adaptationPanelHtml,pendingAdaptationsHtml,acceptedAdaptationText} from "'+origin+'/challenge-adaptation.mjs";'+
     'const challenge={id:"challenge-1",status:"proposed"};'+
     'window.__clicked=[];document.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(b)window.__clicked.push(b.dataset.action)});'+
     'window.__show=state=>{document.querySelector("#panel").innerHTML=adaptationPanelHtml(challenge,null,{open:state==="edit",originalText:"Consigne originale à conserver entre nous, sans modification automatique.",originalMinutes:5});'+
     'document.querySelector("#inbox").innerHTML=pendingAdaptationsHtml(state==="pending"?[{challenge_id:"challenge-1",proposed_by:"alice",status:"pending",proposed_text:"Une variante douce à deux",proposed_minutes:20}]:[],"bob");'+
     'document.body.dataset.approved=acceptedAdaptationText("Original",state==="accepted"?{status:"accepted",proposed_text:"Approuvée"}:null)};'+
     'window.__show("edit");</script></body></html>'
   }));
   await page.goto(origin+'/__lr017-adaptation.html',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__show==='function');
   const panel=page.locator('.lr-adapt-panel');
   await panel.waitFor({state:'visible'});
   assert.match(await panel.locator('.lr-adapt-original').innerText(),/Consigne originale à conserver/);
   const field=panel.locator('textarea');await field.fill('Une idée libre, à confirmer ensemble');
   const input=panel.locator('input');await input.fill('15');
   const metrics=await page.evaluate(()=>{
    const fields=[...document.querySelectorAll('button,input,textarea')].map(x=>x.getBoundingClientRect());
    return {width:document.documentElement.scrollWidth,
      tooShort:fields.filter(x=>x.height<44).length,
      outside:fields.some(x=>x.left<0||x.right>innerWidth+1)};
   });
   assert.ok(metrics.width<=width+2&&!metrics.outside&&metrics.tooShort===0,
    'Responsive controls failed: '+label+' '+JSON.stringify(metrics));
   await panel.locator('[data-action="adapt-propose:challenge-1"]').click();
   assert.deepEqual(await page.evaluate(()=>window.__clicked),['adapt-propose:challenge-1']);
   await page.evaluate(()=>window.__show('pending'));
   assert.equal(await page.locator('.lr-adapt-inbox').count(),1);
   const approvals=await page.locator('.lr-adapt-inbox button').evaluateAll(v=>v.map(x=>x.dataset.action));
   assert.deepEqual(approvals,['adapt-answer:challenge-1:yes','adapt-answer:challenge-1:no']);
   await page.locator('.lr-adapt-inbox button').first().click();
   assert.deepEqual((await page.evaluate(()=>window.__clicked)).at(-1),'adapt-answer:challenge-1:yes');
   await page.evaluate(()=>window.__show('accepted'));
   assert.equal(await page.evaluate(()=>document.body.dataset.approved),'Approuvée');
   await page.screenshot({path:'design-captures/lr017-'+label+'.png'});
   console.log('LR017_VISUAL_OK',label,JSON.stringify(metrics));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
