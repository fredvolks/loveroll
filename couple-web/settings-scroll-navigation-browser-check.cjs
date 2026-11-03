'use strict';
// LR-AUDIT-GLOBAL-20261028: synthetic real-router test of Settings scroll
// continuity, never production accounts, writes, or dice draws.
process.env.LOVEROLL_LOCAL_FILES='1';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const viewports=[
 {name:'compact',width:320,height:568},
 {name:'short',width:412,height:650},
 {name:'ipad',width:820,height:1180}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const view of viewports){
   const world=createWorld();
   const {page,context,errors}=await setupEditorial(browser,world,{
    width:view.width,height:view.height,query:'settings=1'
   });
   try{
    await page.locator('.nav [data-action="tab:settings"]').click();
    await page.locator('[data-action="settings-page:jeu"]').click();
    const body=page.locator('.settings-detail-body.has-settings-menus');
    await body.waitFor({state:'visible'});
    const categories=page.locator('[data-settings-open="categories"]');
    await categories.waitFor({state:'visible'});
    const geometry=await body.evaluate(el=>({
     scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,
     overflowY:getComputedStyle(el).overflowY
    }));
    if(view.name==='compact'){
     assert.ok(geometry.scrollHeight>geometry.clientHeight,
      'The compact settings menu must be allowed to scroll instead of clipping');
     assert.ok(['auto','scroll'].includes(geometry.overflowY),
      'The real compact menu must provide an inner scroll container');
    }
    // Simulate returning after the customer read the bottom of a long panel.
    await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await categories.evaluate(el=>el.click());
    await page.waitForFunction(()=>document.querySelector('.settings-detail-body')?.dataset.settingsLocation==='categories');
    assert.equal(await body.evaluate(el=>el.scrollTop),0,
     view.name+': leaf should open at top');
    assert.match(await page.locator('.editorial-title h1').innerText(),/Catégories visibles/i);
    assert.equal(await page.locator('.editorial-title h1').evaluate(el=>document.activeElement===el),true,
     view.name+': title should receive focus after navigating');
    await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await page.locator('.settings-back').click();
    await page.waitForFunction(()=>document.querySelector('.settings-detail-body')?.dataset.settingsLocation==='');
    assert.equal(await body.evaluate(el=>el.scrollTop),0,
     view.name+': returning to settings menu should start at first item');
    assert.equal(await page.locator('.editorial-title h1').evaluate(el=>document.activeElement===el),true,
     view.name+': restored menu heading should receive focus');
    // Actual pointer navigation must still work after restoration.
    await categories.click();
    await page.waitForFunction(()=>document.querySelector('.settings-detail-body')?.dataset.settingsLocation==='categories');
    assert.deepEqual(world.calls.filter(c=>c.name&&/^(save_|roll_|delete_|reset_|import_)/.test(c.name)),[],
     view.name+': browsing settings must not mutate real game state');
    assert.deepEqual(errors,[],view.name+': console errors');
    console.log('LR_SETTINGS_SCROLL_RETURN_OK',view.name,geometry);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
