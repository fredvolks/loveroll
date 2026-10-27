// Browser verifies the modal, real CSS, escape/cancel, opt-out and live 3D continuity.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,640],[393,852],[820,1180]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:width<768,isMobile:width<768});
   await page.route(origin+'/__lr014-confirm-test.html',route=>route.fulfill({
    contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
     '<meta name="viewport" content="width=device-width,initial-scale=1">'+
     '<link rel="stylesheet" href="'+origin+'/evening-category-confirm.css"></head>'+
     '<body><div id="existing-dice"><canvas width="250" height="250" id="dice"></canvas></div>'+
     '<script type="module">import {askEveningCategoryConfirmation} from "'+origin+'/evening-category-confirm.mjs";'+
     'window.__startConfirm=(kind,odds)=>{window.__result=null;window.__die=document.querySelector("#dice");'+
     'askEveningCategoryConfirmation({category:kind,percentage:odds}).then(r=>window.__result=r);};'+
     '</script></body></html>'
   }));
   await page.goto(origin+'/__lr014-confirm-test.html',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__startConfirm==='function');
   await page.evaluate(()=>window.__startConfirm('SEXUEL',88));
   const dialog=page.locator('dialog.lr-evening-category-dialog');
   await dialog.waitFor({state:'visible'});
   const content=await page.locator('.lr-evening-confirm-card').innerText();
   assert.ok(content.includes('Catégorie : Sexuel'),content);
   assert.ok(content.includes('Sensuel 12 % · Sexuel 88 %'),content);
   const fit=await dialog.evaluate(d=>{
    const x=d.getBoundingClientRect();
    return {left:x.left,right:x.right,top:x.top,bottom:x.bottom,w:innerWidth,h:innerHeight};
   });
   assert.ok(fit.left>=-1&&fit.right<=width+1&&fit.top>=-1&&fit.bottom<=height+1,
    'Dialog must fit device: '+JSON.stringify(fit));
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>window.__result!==null);
   assert.deepEqual(await page.evaluate(()=>window.__result),{confirmed:false,neverShow:false});
   assert.equal(await page.locator('dialog.lr-evening-category-dialog').count(),0);
   await page.evaluate(()=>window.__startConfirm('HASARD',88));
   await dialog.waitFor({state:'visible'});
   assert.match(await page.locator('.lr-evening-confirm-odds').innerText(),/Sensuel 50 % · Sexuel 50 %/);
   await page.locator('[data-confirm-optout]').check();
   await page.locator('[data-confirm-action="yes"]').click();
   await page.waitForFunction(()=>window.__result!==null);
   assert.deepEqual(await page.evaluate(()=>window.__result),{confirmed:true,neverShow:true});
   const retained=await page.evaluate(()=>window.__die===document.querySelector('#dice'));
   assert.equal(retained,true,'Category confirmation must not remount the WebGL canvas');
   await page.evaluate(()=>window.__startConfirm('SENSUEL',75));
   await dialog.waitFor({state:'visible'});
   await page.locator('[data-confirm-action="change"]').click();
   await page.waitForFunction(()=>window.__result!==null);
   assert.deepEqual(await page.evaluate(()=>window.__result),{confirmed:false,neverShow:false});
   console.log('LR014_CONFIRM_OK',width,height,JSON.stringify(fit));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exit(1);});
