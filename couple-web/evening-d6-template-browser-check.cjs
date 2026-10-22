const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [width,height] of [[360,740],[412,824],[412,915]]){
  const world=createWorld();world.enableEveningD6=true;world.personalRolls=[];
  world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
  const {nextMonday}=await import('./premium-home.mjs');const monday=new Date(nextMonday()+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-7);
  world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:3,created_at:new Date(Date.now()-120000).toISOString()}];
  world.eveningSessions=[{id:'evening-test',couple_id:'c',started_at:new Date(Date.now()-60000).toISOString(),finished_at:null,paired_turns:true,self_draws:true}];
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home'});
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
  const metrics=()=>page.evaluate(()=>{const b=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,w:r.width,h:r.height,font:c.font,bg:c.backgroundImage};};return {brand:b('.ritual-brand'),title:b('.ritual-page-title'),nav:b('.nav'),info:b('.home-odds-info')};});
  const home=await metrics();
  await page.locator('[data-action="tab:session"]').click();
  await page.waitForFunction(()=>document.querySelector('.has-evening-d6-template canvas')?.loveRollDie?.readState().optics.loaded);
  const evening=await metrics();console.log('D6_TEMPLATE_METRICS',width,{home,evening});
  assert.deepEqual(evening.brand,home.brand);assert.deepEqual(evening.nav,home.nav);
  assert.equal(evening.title.font,home.title.font);assert.equal(evening.title.y,home.title.y);
  assert.equal(evening.info.w,home.info.w);assert.equal(evening.info.h,home.info.h);
  const measure=()=>page.evaluate(()=>{const c=document.querySelector('.evening-d6-theater canvas'),r=c.getBoundingClientRect(),b=c.loveRollDie.projectedBounds(),marker=document.querySelector('.home-pedestal-contact').getBoundingClientRect();return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,bottom:r.top+b.bottom*r.height,contact:marker.top,center:r.left+(b.left+b.right)*r.width/2,preview:c.dataset.dicePreview};});
  let layout=await measure();console.log('D6_TEMPLATE_LAYOUT',width,layout);
  assert.equal(layout.scroll,0);assert.equal(layout.horizontal,0);assert.ok(Math.abs(layout.bottom-layout.contact)<2);assert.ok(Math.abs(layout.center-width/2)<3);
  assert.equal(layout.preview,'true');assert.equal(await page.locator('[data-dice-markers="hearts"]').count(),0);
  assert.equal(await page.locator('.evening-manage').count(),0);assert.equal(await page.locator('.evening-menu-eclat').count(),0);
  const capture=async name=>{if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`d6-${name}-${width}-${height}.png`)});};
  await capture('initial');
  await page.locator('[data-home-odds-open]').click();await page.waitForSelector('#evening-odds-dialog[open]');
  assert.deepEqual(await page.locator('.home-odds-entry>span').allTextContents(),['30 %','25 %','20 %','12 %','8 %','5 %']);
  assert.match(await page.locator('#evening-odds-dialog').innerText(),/nombre de défis pour cette soirée/);await capture('odds');
  await page.locator('[data-home-odds-close]').click();
  const partnerFirst=height===915;
  await page.evaluate(()=>{window.__ownD6=document.querySelector('.evening-d6-theater canvas');});
  if(partnerFirst){
   world.personalRolls.push({id:'d6-b',session_id:'evening-test',user_id:'b',face:4});
   await page.waitForFunction(()=>document.querySelector('.evening-partner-mobile-status')?.textContent.includes('4'),{timeout:16000});
   assert.equal(await page.evaluate(()=>window.__ownD6===document.querySelector('.evening-d6-theater canvas')),true,'Partner refresh keeps the same live model');
   const anchored=await measure();assert.ok(Math.abs(anchored.bottom-anchored.contact)<2);
  }
  await page.locator('[data-action="my-d6"]').click();
  if(partnerFirst){
   await page.waitForSelector('.evening-premium-view.is-ready',{timeout:16000});
   assert.equal(world.calls.filter(c=>c.name==='roll_my_evening_d6').length,1);
   assert.equal(await page.locator('.evening-my-die canvas').getAttribute('data-face'),'2');
   assert.equal(await page.locator('.evening-partner-card canvas').getAttribute('data-face'),'4');
   assert.deepEqual(errors,[]);await context.close();console.log('EVENING_D6_TEMPLATE_OK',width,height,'partner first');continue;
  }
  await page.waitForFunction(()=>document.querySelector('[data-action="my-d6"]')?.textContent==='Lancer enregistré');
  assert.equal(await page.locator('[data-action="my-d6"]').isDisabled(),true);
  assert.match(await page.locator('.evening-own-capsule').innerText(),/Fred.*2/s);
  assert.equal(world.calls.filter(c=>c.name==='roll_my_evening_d6').length,1);
  assert.equal((await page.locator('.evening-d6-theater canvas').getAttribute('data-face')),'2');
  await capture('recorded');
  assert.equal(await page.evaluate(()=>window.__ownD6===document.querySelector('.evening-d6-theater canvas')),true,'The same live D6 survives its official roll');
  world.personalRolls.push({id:'d6-b',session_id:'evening-test',user_id:'b',face:4});
  await page.waitForSelector('.evening-premium-view.is-ready',{timeout:16000});
  assert.equal(await page.locator('.evening-my-die canvas').getAttribute('data-face'),'2');
  assert.equal(await page.locator('.evening-partner-card canvas').getAttribute('data-face'),'4');
  assert.equal(await page.locator('.has-evening-d6-template').count(),0);
  assert.deepEqual(errors,[]);await context.close();console.log('EVENING_D6_TEMPLATE_OK',width,height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
