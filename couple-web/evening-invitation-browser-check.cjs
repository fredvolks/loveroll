// LR-028: actual Chromium DOM/CSS coverage, not a fake Supabase-authentication test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:8765';
(async()=>{
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const {width,height,label} of [
   {width:360,height:640,label:'small-android'},
   {width:412,height:915,label:'galaxy-s25'},
   {width:820,height:1180,label:'ipad-portrait'},
   {width:1180,height:820,label:'ipad-landscape'},
   {width:1440,height:900,label:'desktop'}
  ]){
   const page=await browser.newPage({
    viewport:{width,height},isMobile:width<=820,hasTouch:width<=820,deviceScaleFactor:1
   });
   await page.route(origin+'/__lr028-invite-visual.html',route=>route.fulfill({
    contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="fr-CA"><head><meta charset="utf-8">'+
     '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
     '<link rel="stylesheet" href="'+origin+'/premium-theme.css">'+
     '<link rel="stylesheet" href="'+origin+'/controls-rose-v141.css">'+
     '<link rel="stylesheet" href="'+origin+'/evening-invitation.css">'+
     '<style>*{box-sizing:border-box}body{margin:0;background:#200d16;color:white;font:16px system-ui}'+
     'main{min-height:100dvh;padding:18px 12px 80px}.mock-nav{position:fixed;bottom:0;left:0;right:0;'+
     'height:60px;background:#130b11;z-index:4000;padding:10px;text-align:center}.sr-only{position:absolute;'+
     'width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style></head>'+
     '<body><main id="app"><button type="button" id="palette-primary-reference" class="entry-auth-submit" aria-hidden="true" tabindex="-1" style="position:absolute;opacity:0;pointer-events:none">Référence</button>'+
     '<button type="button" id="palette-secondary-reference" class="settings-secondary" aria-hidden="true" tabindex="-1" style="position:absolute;opacity:0;pointer-events:none">Référence</button>'+
     '<h1 style="font-size:18px;text-align:center">Notre Soirée</h1>'+ 
     '<div id="stage"></div><div id="inbox"></div><nav class="mock-nav">Accueil · Soirée · Surprise</nav></main>'+
     '<script type="module">import {eveningInviteHtml,eveningInviteInboxHtml} from "'+origin+'/evening-invitation.mjs";'+
     'window.__setInvite=(where,state)=>{const invite={id:"test",state,direction:"received"};'+
     'document.querySelector("#stage").innerHTML=where==="evening"?eveningInviteHtml(invite,{partnerName:"Alex"}):"";'+
     'document.querySelector("#inbox").innerHTML=where==="home"?eveningInviteInboxHtml(invite,{partnerName:"Alex"}):"";};'+
     'window.__setInvite("home","pending");window.__clicked=[];'+
     'document.addEventListener("click",event=>{if(event.target.closest("[data-action]"))'+
     'window.__clicked.push(event.target.closest("[data-action]").dataset.action);});'+
     '</script></body></html>'
   }));
   await page.goto(origin+'/__lr028-invite-visual.html',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__setInvite==='function');
   // Reuse exactly the published account controls, not a page-specific
   // palette. Compare computed CSS (including !important and stylesheet order).
   const appearance=async selector=>page.locator(selector).first().evaluate(el=>{
    const s=getComputedStyle(el);
    return {background:s.backgroundImage,bgColor:s.backgroundColor,
     border:s.borderTopColor,color:s.color,shadow:s.boxShadow};
   });
   const primary=await appearance('#palette-primary-reference');
   const secondary=await appearance('#palette-secondary-reference');
   let inbox=page.locator('.lr-evening-inbox');
   await inbox.waitFor({state:'visible'});
   const metrics=await inbox.evaluate(element=>{
    const r=element.getBoundingClientRect();
    const nav=document.querySelector('.mock-nav').getBoundingClientRect();
    const btn=element.querySelector('button').getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,navTop:nav.top,
     viewportWidth:innerWidth,viewportHeight:innerHeight,
     documentWidth:document.documentElement.scrollWidth,
     buttonWidth:btn.width,buttonHeight:btn.height};
   });
   assert.ok(metrics.left>=-1&&metrics.right<=width+1&&metrics.top>=0&&
    metrics.bottom<=metrics.navTop+1&&metrics.documentWidth<=width+2&&
    metrics.buttonHeight>=44,'Accueil invitation does not fit: '+JSON.stringify(metrics));
   assert.match(await inbox.innerText(),/Alex a envie de jouer ce soir/);
   assert.deepEqual(await appearance('.lr-evening-inbox-open'),primary,
    'Accueil invite action must match the approved account CTA');
   await inbox.locator('button').click();
   assert.deepEqual(await page.evaluate(()=>window.__clicked),['tab:session']);
   await page.screenshot({path:'design-captures/lr028-'+label+'-accueil.png'});
   await page.evaluate(()=>window.__setInvite('evening','pending'));
   const invite=page.locator('.lr-evening-invite');
   await invite.waitFor({state:'visible'});
   const actions=await invite.locator('button').evaluateAll(buttons=>buttons.map(b=>({
    action:b.dataset.action,height:b.getBoundingClientRect().height,
    left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right
   })));
   assert.deepEqual(actions.map(x=>x.action),[
    'evening-invite:yes','evening-invite:no','evening-invite:maybe','evening-invite:ignored']);
   assert.deepEqual(await appearance('.lr-evening-invite-primary'),primary,
    'Soirée Yes action must match the account primary control');
   assert.deepEqual(await appearance('.lr-evening-invite-secondary'),secondary,
    'Soirée No/Maybe/Ignore must match the account secondary control');
   assert.ok(actions.every(x=>x.height>=44&&x.left>=0&&x.right<=width+1),
    'Soirée actions do not fit: '+JSON.stringify(actions));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),
    'Soirée must not overflow horizontally');
   await page.screenshot({path:'design-captures/lr028-'+label+'-soiree.png'});
   for(const answer of ['yes','no','maybe','ignored'])
    await invite.locator('[data-action="evening-invite:'+answer+'"]').click();
   assert.deepEqual(await page.evaluate(()=>window.__clicked),
    ['tab:session','evening-invite:yes','evening-invite:no','evening-invite:maybe','evening-invite:ignored'],
    'Every visible invitation action must respond to the actual pointer tap');
   await page.evaluate(()=>window.__setInvite('home','no'));
   assert.equal(await page.locator('.lr-evening-inbox').count(),0,'No hides Home prompt');
   await page.evaluate(()=>window.__setInvite('evening','obsolete'));
   assert.equal(await page.locator('.lr-evening-invite').count(),0,'Finished D6 hides invitation');
   console.log('LR028_VISUAL_OK',label,JSON.stringify(metrics));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
