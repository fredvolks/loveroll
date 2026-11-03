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
  const world=createWorld();world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
  // en-CA formats YYYY-MM; use explicit parts for consistency across runtimes.
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit'}).formatToParts(new Date());
  const key=parts.find(x=>x.type==='year').value+'-'+parts.find(x=>x.type==='month').value;
  const saved={id:'monthly-activity',couple_id:'c',kind:'monthly_activity',key,face:19,activity_title:'Une très longue activité officielle enregistrée à partager ensemble',activity_description:'Description officielle conservée.'};
  world.rolls=[saved];
  const {page,context,errors}=await setupEditorial(browser,world,{width:360,height:740,query:'open=home'});
  const ready=()=>page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
  await ready();
  assert.equal(await page.locator('.home-next-month .lr-ruby-title').textContent(),saved.activity_title);
  assert.equal(await page.locator('.home-next-month .lr-ruby-caption').textContent(),'Déterminer qui invite');
  for(const [face,expected,winner] of [[2,'Fred invite Émilie','Fred'],[5,'Émilie invite Fred','Émilie']]){
   world.rolls=[saved,{id:'monthly-host-'+face,couple_id:'c',kind:'monthly_host',key,face}];
   await page.reload();await ready();
   assert.equal(await page.locator('.home-next-month .lr-ruby-caption').textContent(),'Choisir notre date');
   assert.ok((await page.locator('.home-next-month').getAttribute('aria-label')).includes(expected),
    'The public step may advance without losing the saved inviter identity');
   assert.equal(await page.locator('.home-next-month .lr-ruby-title').getAttribute('title'),saved.activity_title);
   const layout=await page.evaluate(()=>{
    const card=document.querySelector('.home-dashboard').getBoundingClientRect(),nav=document.querySelector('.nav').getBoundingClientRect();
    return {height:card.height,bottom:card.bottom,nav:nav.top,scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth};
   });
   // Velours & Rose Lanterne deliberately gives primary ruby actions a
   // different material from the velvet information cards. Keep shared
   // geometry and depth without requiring identical gradients everywhere.
   const surfaces=await page.locator('.lr-surface').evaluateAll(nodes=>nodes.map(n=>{
    const c=getComputedStyle(n);
    return {radius:c.borderRadius,border:c.border,background:c.backgroundImage,shadow:c.boxShadow};
   }));
   assert.equal(surfaces.length,4,'Home has navigation, D6 action, monthly card and duo dashboard');
   for(const surface of surfaces){
    assert.equal(surface.radius,'18px','Shared LoveRoll surface shape');
    assert.notEqual(surface.border.split(' ')[0],'0px','Surface border remains visible');
    assert.match(surface.background,/gradient/,'Surface has an actual material');
    assert.notEqual(surface.shadow,'none','Surface retains depth');
   }
   const materials=await page.evaluate(()=>{
    const background=selector=>getComputedStyle(document.querySelector(selector)).backgroundImage;
    return {action:background('.home-roll-button'),
     monthly:background('.home-next-month'),
     duo:background('.home-duo-dashboard')};
   });
   assert.notEqual(materials.action,materials.monthly,'D6 action stays ruby, not a velvet card');
   assert.notEqual(materials.action,materials.duo,'Duo information panel is not a CTA');
   assert.equal(await page.locator('.home-monthly-recap').count(),0);
   assert.equal(await page.locator('.home-present svg g').getAttribute('stroke'),'#fff0e5');
   assert.equal(layout.height,140);assert.ok(layout.bottom<=layout.nav-6);assert.equal(layout.scroll,0);assert.equal(layout.horizontal,0);
   if(face===2&&process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,'home-monthly-duo.png')});
   await page.locator('.home-next-month').click();await page.waitForSelector('.surprise-premium-view');
   assert.ok((await page.locator('.surprise-host-winner').textContent()).includes(winner+' invite cette fois-ci'));
  }
  assert.equal(world.calls.filter(c=>c.name==='roll_couple_once').length,0,'Reading the monthly recap must never draw another result');
  assert.deepEqual(errors,[]);await context.close();console.log('HOME_DUO_MONTHLY_OK: saved activity, even/odd inviter, compact card and real Surprise link');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
