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
   {width:320,height:568,label:'compact-android'},
   {width:412,height:650,label:'short-android'},
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
     '<link rel="stylesheet" href="'+origin+'/evening-invitation.css">'+
     '<style>*{box-sizing:border-box}body{margin:0;background:#200d16;color:white;font:16px system-ui}'+
     'main{min-height:100dvh;padding:18px 12px 80px}.mock-nav{position:fixed;bottom:0;left:0;right:0;'+
     'height:60px;background:#130b11;z-index:4000;padding:10px;text-align:center}.sr-only{position:absolute;'+
     'width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style></head>'+
     '<body><main id="app"><h1 style="font-size:18px;text-align:center">Notre Soirée</h1>'+ 
     '<div id="stage"></div><div id="inbox"></div><nav class="mock-nav">Accueil · Soirée · Surprise</nav></main>'+
     '<script type="module">import {eveningInviteHtml,eveningInviteInboxHtml} from "'+origin+'/evening-invitation.mjs";'+
     'window.__setInvite=(where,state,direction="received",available=false,busy=false)=>{const invite={id:"test",state,direction,available};'+
     'document.querySelector("#stage").innerHTML=where==="evening"?eveningInviteHtml(invite,{partnerName:"Alex",busy}):"";'+
     'document.querySelector("#inbox").innerHTML=where==="home"?eveningInviteInboxHtml(invite,{partnerName:"Alex"}):"";};'+
     'window.__setInvite("home","pending");window.__clicked=[];'+
     'document.addEventListener("click",event=>{if(event.target.closest("[data-action]"))'+
     'window.__clicked.push(event.target.closest("[data-action]").dataset.action);});'+
     '</script></body></html>'
   }));
   await page.goto(origin+'/__lr028-invite-visual.html',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__setInvite==='function');
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
   assert.ok(actions.every(x=>x.height>=44&&x.left>=0&&x.right<=width+1),
    'Soirée actions do not fit: '+JSON.stringify(actions));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),
    'Soirée must not overflow horizontally');
   await page.screenshot({path:'design-captures/lr028-'+label+'-soiree.png'});
   // New journey: either partner can ask to play, wait, and receive a reply.
   // These checks exercise only the real rendering helpers and synthetic clicks.
   await page.evaluate(()=>window.__setInvite('evening','none','sent',true));
   const send=invite.locator('[data-action="evening-invite:send"]');
   await send.waitFor({state:'visible'});
   assert.match(await invite.innerText(),/As-tu envie de jouer ce soir/);
   const sendMetrics=await send.boundingBox();
   const navMetrics=await page.locator('.mock-nav').boundingBox();
   assert.ok(sendMetrics&&sendMetrics.height>=44&&sendMetrics.x>=0&&
    sendMetrics.x+sendMetrics.width<=width+1&&
    sendMetrics.y+sendMetrics.height<=navMetrics.y+1,
    'Send action must remain usable above bottom navigation: '+label);
   await send.click();
   assert.equal((await page.evaluate(()=>window.__clicked)).at(-1),'evening-invite:send');
   await page.screenshot({path:'design-captures/lr028-'+label+'-ask.png'});
   await page.evaluate(()=>window.__setInvite('evening','none','sent',true,true));
   assert.equal(await send.isDisabled(),true,'While sending, no accidental duplicate invitation');
   assert.equal(await send.getAttribute('aria-disabled'),'true');
   await page.evaluate(()=>window.__setInvite('evening','pending','sent'));
   assert.match(await invite.innerText(),/Invitation envoyée à Alex/);
   assert.equal(await invite.locator('button').count(),0,'No duplicate send while awaiting reply');
   await page.evaluate(()=>window.__setInvite('evening','maybe','received'));
   assert.deepEqual(await invite.locator('button').evaluateAll(btns=>btns.map(x=>x.dataset.action)),
    ['evening-invite:yes','evening-invite:no','evening-invite:ignored'],
    'After maybe, the partner can accept, decline or ignore without another maybe');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),
    'The invitation states must not overflow the compact viewport');
   await page.screenshot({path:'design-captures/lr028-'+label+'-maybe.png'});
   await page.evaluate(()=>window.__setInvite('home','no'));
   assert.equal(await page.locator('.lr-evening-inbox').count(),0,'No hides Home prompt');
   await page.evaluate(()=>window.__setInvite('evening','obsolete'));
   assert.equal(await page.locator('.lr-evening-invite').count(),0,'Finished D6 hides invitation');
   console.log('LR028_VISUAL_OK',label,JSON.stringify(metrics));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
