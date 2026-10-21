// Real touch on reusable controls, without modifying any real account.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LOVEROLL_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const create=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await create(options);
  if(process.env.LOVEROLL_THREE_DIR)await context.route('https://esm.sh/three@0.167.1**',route=>{
   const name=new URL(route.request().url()).pathname.replace('/three@0.167.1','');
   return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(process.env.LOVEROLL_THREE_DIR,name||'build/three.module.js'),'utf8').replaceAll("from 'three'","from 'https://esm.sh/three@0.167.1'")});
  });return context;
 };
 try{
  for(const [width,height] of [[360,740],[412,824],[412,915]]){
   const world=createWorld();world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
   const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home'});
   await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
   await page.evaluate(()=>document.fonts.ready);
   const measure=()=>page.evaluate(()=>{
    const box=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {top:r.top,width:r.width,height:r.height,font:c.font,letterSpacing:c.letterSpacing}};
    return {heart:box('.ritual-brand i'),brand:box('.ritual-brand b'),kicker:box('.ritual-kicker'),title:box('.ritual-page-title'),imageHeight:getComputedStyle(document.querySelector('#app')).getPropertyValue('--home-scene-top-image-height')};
   });
   const home=await measure();
   await page.locator('[data-action="tab:session"]').click();
   await page.waitForFunction(()=>document.querySelector('.evening-finale-dice canvas')?.loveRollDie?.readState().optics.loaded);
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   const evening=await measure();for(const key of ['heart','brand','kicker','title'])assert.deepEqual(evening[key],home[key],key+' must match Home exactly');
   assert.equal(evening.imageHeight,home.imageHeight,'Same photographed pedestal size');
   const layout=await page.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect(),canvas=document.querySelector('.evening-finale-dice canvas'),c=canvas.getBoundingClientRect(),b=canvas.loveRollDie.projectedBounds();
    return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,
     meshBottom:c.top+b.bottom*c.height,meshCenter:c.left+(b.left+b.right)*c.width/2,
     contact:r('.home-pedestal-contact').top,cardBottom:r('.evening-summary-shell').bottom,navTop:r('.nav').top,
     premium:getComputedStyle(document.querySelector('.ritual-mode-premium')).backgroundImage};
   });
   console.log('SOIREE_LAYOUT',width,layout);
   assert.equal(layout.scroll,0);assert.equal(layout.horizontal,0);
   assert.ok(Math.abs(layout.meshBottom-layout.contact)<1);assert.ok(Math.abs(layout.meshCenter-width/2)<3);
   assert.ok(layout.cardBottom<=layout.navTop-6);assert.ok(layout.premium.includes('255, 249, 206'));
   assert.equal(await page.locator('.evening-finale-start').isDisabled(),true);
   if(await page.locator('.evening-start-reminder').count()){
    await page.locator('.evening-start-reminder').click();await page.waitForSelector('.evening-weekly-reminder[open]');
    assert.match(await page.locator('.evening-weekly-reminder').innerText(),/Brassez le dé de la semaine/);
    await page.locator('.reminder-close').click();
   }
   assert.equal(await page.locator('.evening-finale-actions button').count(),2);
   if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`soiree-${width}-${height}.png`)});
   if(width===360){
    const {nextMonday}=await import('./premium-home.mjs');
    const monday=new Date(nextMonday()+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-7);
    const now=new Date().toISOString();
    world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:3,created_at:new Date(Date.now()-120000).toISOString()}];
    world.eveningSessions=[{id:'closed',couple_id:'c',started_at:now,finished_at:now,counted:true,paired_turns:true,self_draws:true}];
    world.reviews=[{session_id:'closed',author_id:'a'}];
    await page.reload();await page.waitForSelector('.home-dashboard');
    await page.locator('[data-action="tab:session"]').click();await page.waitForSelector('.evening-summary-shell.is-aftercare');
    assert.equal(await page.locator('.evening-finale-start').isDisabled(),true);
    assert.match(await page.locator('.evening-summary-shell').innerText(),/Notre soirée est terminée/);
    assert.match(await page.locator('.evening-summary-shell').innerText(),/1 \/ 2 bilans déposés/);
    const overflows=await page.locator('.evening-summary-shell').evaluate(card=>{const r=card.getBoundingClientRect();return [...card.querySelectorAll('h2,p,strong,small,button')].filter(n=>n.getClientRects().length).some(n=>{const c=n.getBoundingClientRect();return c.bottom>r.bottom+1||c.right>r.right+1||c.left<r.left-1;});});
    assert.equal(overflows,false,'Aftercare information stays inside the shared bubble');
    if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,'soiree-aftercare.png')});
   }
   await page.locator('[data-action="evening-calendar"]').click();await page.waitForSelector('.has-ruby-calendar .evening-cal-grid');
   const calendar=await measure();for(const key of ['heart','brand','kicker'])assert.deepEqual(calendar[key],home[key],key+' calendar matches Home');
   assert.equal(calendar.title.top,home.title.top);assert.equal(calendar.title.font,home.title.font);
   const calLayout=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,
    bottom:document.querySelector('.evening-cal-return').getBoundingClientRect().bottom,nav:document.querySelector('.nav').getBoundingClientRect().top}));
   assert.equal(calLayout.scroll,0);assert.equal(calLayout.horizontal,0);assert.ok(calLayout.bottom<=calLayout.nav-6);
   if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`calendar-${width}-${height}.png`)});
   const month=await page.locator('.evening-cal-toolbar h3').textContent();await page.locator('[data-action="evening-month-prev"]').click();
   await page.waitForFunction(old=>document.querySelector('.evening-cal-toolbar h3').textContent!==old,month);
   await page.locator('.evening-cal-day').first().click();
   await page.waitForFunction(()=>document.querySelector('.evening-cal-day[aria-pressed="true"]')!==null);
   await page.locator('.evening-cal-return').click();await page.waitForSelector('.evening-premium-view');
   await page.locator('[data-action="tab:eclat"]').click();await page.waitForSelector('.eclat-shell');
   assert.equal(world.calls.filter(c=>c.name==='roll_couple_once').length,0);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('SOIREE_HOME_TEMPLATE_OK');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
