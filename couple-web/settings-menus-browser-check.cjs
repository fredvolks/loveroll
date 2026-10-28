const {chromium}=require('playwright'),assert=require('node:assert/strict'),{createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{for(const [width,height] of [[360,640],[412,824],[393,852],[820,1180],[1366,768]]){
const world=createWorld();world.testModeEligible=true;world.referral={enabled:true,couple_ready:true,code:'0123456789abcdef01234567',available_cad_cents:1500,annual_renewal_cad_cents:4999};
const {page,context,errors}=await setupEditorial(browser,world,{width,height});
for(const route of ['compte','couple','jeu','notifications','monde','confidentialite','application','admin','aide-des','parrainage']){
 await page.locator('.nav [data-action="tab:settings"]').click();if(route==='admin'||route.startsWith('aide')){await page.locator('[data-action="settings-page:'+(route==='admin'?'jeu':'application')+'"]').click();await require('./settings-test-navigation.cjs').revealSetting(page,'[data-action="settings-page:'+route+'"]');}await page.locator('[data-action="settings-page:'+route+'"]').click();
 assert.equal(await page.locator('.settings-screen-pager').count(),0);
 async function walk(path=[]){
  await page.waitForTimeout(40);
  const g=await page.locator('.settings-detail-body').evaluate(el=>({
   overflow:el.scrollHeight-el.clientHeight,
   horizontal:el.scrollWidth-el.clientWidth,
   document:document.documentElement.scrollHeight-innerHeight,
   overflowY:getComputedStyle(el).overflowY,
   title:document.querySelector('.editorial-title h1').textContent,visible:el.innerText
  }));
  console.log(width,route,path.join('/'),g.overflow,g.title);
  // Unifying the Android notifications page makes it taller than 360×640.
  // It must scroll INSIDE the panel (accessible at zoom), not clip the last
  // preference and button, overflow horizontally or push the fixed app nav.
  const notifications=route==='notifications';
  const scrollable=notifications&&['auto','scroll'].includes(g.overflowY);
  if(g.document>2||g.horizontal>2||(g.overflow>2&&!scrollable))
   throw Error(JSON.stringify({width,route,path,g}));
  if(notifications){
   for(const selector of [
    '[data-push-option="weekly"]',
    '[data-push-option="special"]',
    '.notification-actions .notification-action'
   ]){
    const el=page.locator(selector).first();
    if(await el.count()){
     await el.scrollIntoViewIfNeeded();
     const [item,panel]=await Promise.all([
      el.boundingBox(),page.locator('.settings-detail-body').boundingBox()
     ]);
     assert.ok(item&&panel&&item.y>=panel.y-3&&
      item.y+item.height<=panel.y+panel.height+3,
      selector+' must remain reachable inside the short-phone panel');
    }
   }
  }

  const keys=await page.locator('.settings-submenu-list:visible [data-settings-open]').evaluateAll(els=>els.map(el=>el.dataset.settingsOpen));
  for(const key of keys){await page.locator('[data-settings-open="'+key+'"]').click();await walk([...path,key]);await page.locator('.settings-back').click();}
 }
 if(route==='compte'){
  for(const selector of ['#profile-name','#profile-gender','#profile-play-style','.settings-birthday-edit','input[readonly]','.account-test-modes','[data-action="profile"]','[data-action="signout"]']){
   assert.ok(await page.locator(selector).isVisible(),selector+' should be directly visible');
   const box=await page.locator(selector).boundingBox();
   const nav=await page.locator('.nav').boundingBox();
   assert.ok(box.y+box.height<=nav.y,selector+' overlaps navigation');
  }
  assert.equal(await page.locator('[data-settings-open]').count(),0);
 }
 await walk();
}
assert.deepEqual(errors,[]);await context.close();console.log('MENUS_OK',width,height);
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
