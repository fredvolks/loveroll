// LR-020/LR-023: a genuinely short touch viewport must allow settings forms
// to scroll above fixed navigation, instead of silently clipping actions.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const [width,height] of [[360,520],[393,540]]){
   const world=createWorld();
   const {page,context,errors}=await setupEditorial(browser,world,{width,height});
   await page.locator('.nav [data-action="tab:settings"]').click();
   await page.locator('[data-action="settings-page:compte"]').click();
   await page.locator('.settings-account-overview').waitFor();
   const geometry=await page.evaluate(()=>{
    const app=document.querySelector('#app');
    const body=app.querySelector('.settings-detail-body');
    return {viewport:innerHeight,appHeight:app.scrollHeight,
      appMax:getComputedStyle(app).maxHeight,
      appOverflow:getComputedStyle(app).overflowY,
      bodyOverflow:getComputedStyle(document.body).overflowY,
      detailOverflow:getComputedStyle(body).overflowY,
      controls:[...app.querySelectorAll('#profile-name,[data-action="profile"],[data-action="signout"]')].length};
   });
   assert.ok(geometry.appHeight>geometry.viewport,
    'Short settings viewport must make overflow reachable: '+JSON.stringify(geometry));
   assert.equal(geometry.bodyOverflow,'auto',JSON.stringify(geometry));
   assert.equal(geometry.detailOverflow,'visible',JSON.stringify(geometry));
   assert.equal(geometry.controls,3,JSON.stringify(geometry));
   const button=page.locator('[data-action="signout"]');
   await button.scrollIntoViewIfNeeded();
   const bottom=await page.evaluate(()=>{
    const button=document.querySelector('[data-action="signout"]').getBoundingClientRect();
    const nav=document.querySelector('#app .nav').getBoundingClientRect();
    return {buttonBottom:button.bottom,navTop:nav.top};
   });
   assert.ok(bottom.buttonBottom<=bottom.navTop+1,
    'Last account action must remain above bottom navigation: '+JSON.stringify(bottom));
   assert.deepEqual(errors,[]);
   console.log('SETTINGS_SHORT_VIEWPORT_OK',width,height,geometry);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
