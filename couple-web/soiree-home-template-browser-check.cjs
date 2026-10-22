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
    const n=document.querySelector('.nav').getBoundingClientRect();
    const tabs=[...document.querySelectorAll('.lr-ruby-tab')].map(button=>{
     const r=button.getBoundingClientRect(),s=getComputedStyle(button),svg=button.querySelector('svg').getBoundingClientRect();
     const text=[...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
     const range=document.createRange();range.selectNodeContents(text);const t=range.getBoundingClientRect();
     return {x:r.x,y:r.y,width:r.width,height:r.height,font:s.font,padding:s.padding,gap:s.gap,icon:[svg.x,svg.y,svg.width,svg.height],label:[t.x,t.y,t.width,t.height]};
    });
    const scene=['::before','::after'].map(p=>{const s=getComputedStyle(document.querySelector('#app'),p);return {background:s.background,inset:s.inset,height:s.height,opacity:s.opacity,filter:s.filter};});
    return {scene,tabs,nav:{x:n.x,y:n.y,width:n.width,height:n.height},heart:box('.ritual-brand i'),brand:box('.ritual-brand b'),kicker:box('.ritual-kicker'),title:box('.ritual-page-title'),imageHeight:getComputedStyle(document.querySelector('#app')).getPropertyValue('--home-scene-top-image-height')};
   });
   const home=await measure();
   await page.locator('[data-action="tab:session"]').click();
   await page.waitForFunction(()=>document.querySelector('.evening-finale-dice canvas')?.loveRollDie?.readState().optics.loaded);
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   if(width===360){
    const defects=await page.evaluate(async()=>{
     const {faceMarks}=await import('./dice-engraving.mjs?v=20261021-home218');
     const holes={'0':1,'4':1,'6':1,'8':2,'9':1};const errors=[];
     for(let value=1;value<=100;value++){
      const shapes=faceMarks(100,value,false,false),expected=[...String(value)].reduce((n,d)=>n+(holes[d]||0),0);
      const actual=shapes.reduce((n,s)=>n+s.holes.length,0);
      const points=shapes.flatMap(s=>s.getPoints(32));
      if(actual!==expected||shapes.length!==String(value).length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))errors.push({value,actual,expected});
     }return errors;
    });assert.deepEqual(defects,[],'All 100 numeral outlines have intact counters and finite geometry');
   }
   const evening=await measure();assert.deepEqual(evening.tabs,home.tabs,'All navigation buttons and text match Home');for(const key of ['heart','brand','kicker','title'])assert.deepEqual(evening[key],home[key],key+' must match Home exactly');
   assert.equal(evening.imageHeight,home.imageHeight,'Same photographed pedestal size');
   const layout=await page.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect(),canvas=document.querySelector('.evening-finale-dice canvas'),c=canvas.getBoundingClientRect(),b=canvas.loveRollDie.projectedBounds();
    return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,
     meshBottom:c.top+b.bottom*c.height,meshCenter:c.left+(b.left+b.right)*c.width/2,
     contact:r('.home-pedestal-contact').top,cardBottom:r('.evening-summary-shell').bottom,navTop:r('.nav').top,
     premium:getComputedStyle(document.querySelector('.ritual-mode-premium')).backgroundImage};
   });
   console.log('SOIREE_LAYOUT',width,layout);
   const canvas=page.locator('.evening-finale-dice canvas');
   await page.mouse.move(width/2,layout.contact-40);await page.mouse.down();
   await page.mouse.move(width/2+28,layout.contact-40,{steps:4});await page.mouse.up();
   const turned=await canvas.evaluate(c=>c.loveRollDie.readState().quaternion);
   await page.waitForTimeout(650);
   assert.deepEqual(await canvas.evaluate(c=>c.loveRollDie.readState().quaternion),turned,'Manual rotation stays at the chosen angle');
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
   const calendar=await measure();assert.deepEqual(calendar.scene,evening.scene,'Calendar background crop, scale and position match Soirée exactly');for(const key of ['heart','brand','kicker'])assert.deepEqual(calendar[key],home[key],key+' calendar matches Home');
   assert.deepEqual(calendar.nav,home.nav,'Calendar navigation must match Home and Soirée');
   assert.deepEqual(calendar.tabs,home.tabs,'Calendar tab labels, icons, font and spacing match Soirée');
   assert.equal(calendar.title.top,home.title.top);assert.equal(calendar.title.font,home.title.font);
   const calLayout=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,
    bottom:document.querySelector('.evening-cal-history').getBoundingClientRect().bottom,nav:document.querySelector('.nav').getBoundingClientRect().top}));
   assert.equal(calLayout.scroll,0);assert.equal(calLayout.horizontal,0);assert.ok(calLayout.bottom<=calLayout.nav-6);
   if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`calendar-${width}-${height}.png`)});
   const month=await page.locator('.evening-cal-toolbar h3').textContent();await page.locator('[data-action="evening-month-prev"]').click();
   await page.waitForFunction(old=>document.querySelector('.evening-cal-toolbar h3').textContent!==old,month);
   await page.locator('.evening-cal-day').first().click();
   await page.waitForFunction(()=>document.querySelector('.evening-cal-day[aria-pressed="true"]')!==null);
   await page.locator('.calendar-back-arrow').click();await page.waitForSelector('.evening-premium-view');
   await page.locator('[data-action="tab:eclat"]').click();await page.waitForSelector('.eclat-shell');
   assert.equal(world.calls.filter(c=>c.name==='roll_couple_once').length,0);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('SOIREE_HOME_TEMPLATE_OK');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
