const {chromium}=require('playwright'),assert=require('node:assert/strict'),{createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{for(const [width,height] of [[360,640],[412,824],[393,852],[820,1180],[1366,768]]){
const world=createWorld();world.testModeEligible=true;world.referral={enabled:true,couple_ready:true,code:'0123456789abcdef01234567',available_cad_cents:1500,annual_renewal_cad_cents:4999};
const {page,context,errors}=await setupEditorial(browser,world,{width,height});
for(const route of ['compte','couple','jeu','notifications','monde','confidentialite','application','admin','aide-des','parrainage']){
 await page.locator('.nav [data-action="tab:settings"]').click();if(route==='admin'||route.startsWith('aide')){await page.locator('[data-action="settings-page:'+(route==='admin'?'jeu':'application')+'"]').click();await require('./settings-test-navigation.cjs').revealSetting(page,'[data-action="settings-page:'+route+'"]');}await page.locator('[data-action="settings-page:'+route+'"]').click();
 assert.equal(await page.locator('.settings-screen-pager').count(),0);
 if(width>=768&&route==='notifications'){
  const glass=await page.locator('.settings-submenu-list button.lr-surface').first().evaluate(el=>{
   const style=getComputedStyle(el),root=getComputedStyle(document.documentElement);
   return {fill:root.getPropertyValue('--lr-surface-fill').trim(),
    background:style.backgroundImage,shadow:style.boxShadow,font:style.fontFamily};
  });
  assert.match(glass.fill,/gradient/,'The shared ruby material must exist beyond mobile');
  assert.match(glass.background,/gradient/,'Desktop settings must visibly reuse Home ruby surfaces');
  assert.notEqual(glass.shadow,'none','Desktop settings must retain Home-like glass depth');
  assert.match(glass.font,/LoveRoll Cormorant/,'Desktop Settings must share Home typography');
 }
 async function walk(path=[]){
  await page.waitForTimeout(40);
  const g=await page.locator('.settings-detail-body').evaluate(el=>({overflow:el.scrollHeight-el.clientHeight,document:document.documentElement.scrollHeight-innerHeight,title:document.querySelector('.editorial-title h1').textContent,visible:el.innerText}));
  console.log(width,route,path.join('/'),g.overflow,g.title);
  if(g.overflow>2||g.document>2)throw Error(JSON.stringify({width,route,path,g}));

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
