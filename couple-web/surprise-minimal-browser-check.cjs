const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [width,height,mode] of [[360,740,'initial'],[412,824,'host'],[412,915,'complete']]){
  if(process.env.LOVEROLL_SURPRISE_CASE&&mode!==process.env.LOVEROLL_SURPRISE_CASE)continue;
  const world=createWorld();world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
  if(mode!=='initial'){
   const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit'}).format(new Date());
   world.rolls=[{id:'activity',couple_id:'c',kind:'monthly_activity',key:month,face:14,created_at:new Date().toISOString()}];
   if(mode==='complete')world.rolls.push({id:'host',couple_id:'c',kind:'monthly_host',key:month,face:2,created_at:new Date().toISOString()});
  }
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home'});
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
  const metrics=()=>page.evaluate(()=>{const b=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,w:r.width,h:r.height,font:c.font};};return {brand:b('.ritual-brand'),title:b('.ritual-page-title'),nav:b('.nav'),info:b('.home-odds-info')};});
  const home=await metrics();await page.locator('.nav [data-action="tab:special"]').click();
  await page.waitForFunction(()=>document.querySelector('.surprise-minimal canvas')?.loveRollDie?.readState().optics.loaded);
  await page.evaluate(()=>document.fonts.ready);
  const surprise=await metrics();console.log('SURPRISE_METRICS',width,{home,surprise});
  assert.deepEqual(surprise.brand,home.brand);assert.deepEqual(surprise.nav,home.nav);
  assert.equal(surprise.title.font,home.title.font);assert.equal(surprise.title.y,home.title.y);
  assert.equal(surprise.info.w,home.info.w);assert.equal(surprise.info.h,home.info.h);
  const layout=await page.evaluate(()=>{
   const c=document.querySelector('.surprise-minimal canvas'),r=c.getBoundingClientRect(),b=c.loveRollDie.projectedBounds();
   const marker=document.querySelector('.home-pedestal-contact').getBoundingClientRect();
   const summary=document.querySelector('.surprise-events-summary').getBoundingClientRect();
   return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,contact:marker.top,meshTop:r.top+b.top*r.height,heroTop:document.querySelector('.surprise-main-die-scene').getBoundingClientRect().top,bottom:r.top+b.bottom*r.height,center:r.left+(b.left+b.right)*r.width/2,summaryBottom:summary.bottom,navTop:document.querySelector('.nav').getBoundingClientRect().top,sides:c.dataset.diceSides,info:document.querySelector('.home-odds-info').getBoundingClientRect().bottom};
  });console.log('SURPRISE_LAYOUT',width,mode,layout);
  assert.equal(layout.scroll,0);assert.equal(layout.horizontal,0);assert.ok(Math.abs(layout.bottom-layout.contact)<2);assert.ok(Math.abs(layout.center-width/2)<3);
  assert.ok(layout.meshTop>=layout.heroTop+3,'Die clears the month label');assert.ok(layout.summaryBottom<layout.navTop);assert.equal(layout.sides,mode==='host'?'6':'100');
  if(mode==='host')assert.equal(await page.locator('[data-action="roll:monthly_host"]').isVisible(),true);
  if(mode==='complete')assert.match(await page.locator('.surprise-host-winner').innerText(),/Fred invite/);
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`surprise-${mode}-${width}-${height}.png`)});
  const canvas=page.locator('.surprise-minimal canvas');const mesh=await canvas.evaluate(c=>c.loveRollDie.projectedBounds());assert.ok(mesh.top>=0&&mesh.bottom<=1&&mesh.left>=0&&mesh.right<=1,'Entire die stays inside its actual WebGL canvas');
  await page.mouse.move(width/2,layout.contact-40);await page.mouse.down();await page.mouse.move(width/2+25,layout.contact-40,{steps:4});await page.mouse.up();
  const turned=await canvas.evaluate(c=>c.loveRollDie.readState().quaternion);await page.waitForTimeout(650);
  assert.deepEqual(await canvas.evaluate(c=>c.loveRollDie.readState().quaternion),turned);
  await page.locator('.home-odds-info').click();await page.waitForSelector('#surprise-info-dialog[open]');
  await page.locator('#surprise-info-dialog .surprise-minimal-close').click();
  await page.locator('.surprise-events-summary').click();await page.waitForSelector('#surprise-events-dialog[open]');
  assert.equal(await page.locator('#surprise-events-dialog .surprise-event-card').count(),6);
  assert.equal(await page.locator('#surprise-events-dialog .is-next circle').count(),0);
  const expected=await import('./premium-surprise.mjs').then(m=>m.upcomingSpecialEvents(m.sixSpecialEvents(new Date(),world.settings,[{user_id:'a',name:'Fred',birthday_md:'04-12'},{user_id:'b',name:'Émilie',birthday_md:'04-13'}])).map(x=>'edit-surprise-event:'+x.key+':'+(x.owner||'-')));
  assert.deepEqual(await page.locator('#surprise-events-dialog .surprise-event-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.action)),expected);
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`surprise-events-${width}-${height}.png`)});
  await page.locator('#surprise-events-dialog .surprise-event-card').first().click();await page.waitForSelector('.surprise-event-editor');
  assert.equal(await page.locator('#surprise-events-dialog[open]').count(),0);
  await page.locator('[data-action="close-surprise-event"]').click();
  assert.equal(world.calls.filter(c=>c.name==='save_love_surprise_event').length,0);
  if(mode==='initial'){
   await page.locator('.surprise-events-summary').click();
   await page.locator('#surprise-events-dialog .surprise-event-card').last().click();
   const tomorrow=new Date(Date.now()+86400000),date=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(tomorrow).split('-').reverse().join('/');
   await page.locator('#surprise-event-name').fill('Notre date personnalisée');
   await page.locator('#surprise-event-date').fill(date);
   await page.locator('[data-action="save-surprise-event"]').click();
   await page.waitForFunction(()=>document.querySelector('.surprise-summary-next')?.textContent.includes('Notre date personnalisée'));
   await page.locator('.surprise-events-summary').click();
   assert.match(await page.locator('#surprise-events-dialog .surprise-event-card').first().innerText(),/Notre date personnalisée/);
   assert.equal(world.calls.filter(c=>c.name==='save_love_surprise_event').length,1);
  }
  assert.deepEqual(errors,[]);await context.close();console.log('SURPRISE_MINIMAL_OK',width,height,mode);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
