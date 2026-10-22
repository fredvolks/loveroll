const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [width,height] of [[360,740],[412,824],[412,915]]){
  const world=createWorld();world.enableEveningD6=world.enableEveningDraw=true;
  world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
  world.couple.category_preference_percent=height===824?74:88;
  const {nextMonday}=await import('./premium-home.mjs');const monday=new Date(nextMonday()+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-7);
  world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:3,created_at:new Date(Date.now()-120000).toISOString()}];
  world.eveningSessions=[{id:'test-evening',couple_id:'c',started_at:new Date(Date.now()-60000).toISOString(),finished_at:null,paired_turns:true,self_draws:true,starting_user_id:'a'}];
  world.personalRolls=[{id:'d6-a',session_id:'test-evening',user_id:'a',face:2},{id:'d6-b',session_id:'test-evening',user_id:'b',face:3}];
  world.board={ready:true,next:'a',first:'a',remaining:{a:2,b:3},targets:{a:2,b:3},completed:{a:0,b:0},drawn:{a:0,b:0},drawsFinished:false,finished:false};
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home'});
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
  const metrics=()=>page.evaluate(()=>{const b=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,w:r.width,h:r.height,font:c.font};};return {brand:b('.ritual-brand'),title:b('.ritual-page-title'),nav:b('.nav'),info:b('.home-odds-info')};});
  const home=await metrics();await page.locator('.nav [data-action="tab:session"]').click();
  await page.waitForFunction(()=>document.querySelector('.has-evening-d100-template canvas')?.loveRollDie?.readState().optics.loaded);
  await page.evaluate(()=>document.fonts.ready);
  const evening=await metrics();console.log('D100_METRICS',width,{home,evening});
  assert.deepEqual(evening.brand,home.brand);assert.deepEqual(evening.nav,home.nav);assert.equal(evening.title.font,home.title.font);assert.equal(evening.title.y,home.title.y);assert.equal(evening.info.w,home.info.w);assert.equal(evening.info.h,home.info.h);
  const layout=await page.evaluate(()=>{const c=document.querySelector('.evening-d35-col canvas'),r=c.getBoundingClientRect(),b=c.loveRollDie.projectedBounds();const bounds=s=>document.querySelector(s).getBoundingClientRect();return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,contact:bounds('.home-pedestal-contact').top,bottom:r.top+b.bottom*r.height,center:r.left+(b.left+b.right)*r.width/2,mesh:b,meshTop:r.top+b.top*r.height,heroTop:bounds('.evening-d100-theater').top,quotaBottom:bounds('.evening-d100-quota').bottom,navTop:bounds('.nav').top};});console.log('D100_LAYOUT',width,layout);
  assert.equal(layout.scroll,0);assert.equal(layout.horizontal,0);assert.ok(layout.quotaBottom<layout.navTop);assert.ok(Math.abs(layout.bottom-layout.contact)<2);assert.ok(Math.abs(layout.center-width/2)<3);assert.ok(layout.mesh.top>=0&&layout.mesh.bottom<=1);assert.ok(layout.meshTop>=layout.heroTop+3);
  const capture=async name=>{if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`evening-d100-${name}-${width}-${height}.png`)});};
  assert.equal(await page.locator('.evening-choice [aria-pressed=true]').count(),0);assert.equal(await page.locator('.evening-choice-odds').count(),0);
  assert.equal(await page.locator('[data-action="new-challenge"]').isDisabled(),false);await capture('initial');
  await page.evaluate(()=>window.__eveningD100=document.querySelector('.evening-d35-col canvas'));
  await page.locator('[data-action="new-challenge"]').click();await page.waitForSelector('.evening-category-reminder[open]');
  assert.match(await page.locator('.evening-category-reminder').innerText(),/Choisis une catégorie avant de brasser le dé/);
  assert.equal(world.calls.filter(c=>c.name?.startsWith('draw_for_partner')).length,0);await capture('choose-category');
  await page.locator('.evening-category-reminder button').click();
  assert.equal(await page.locator('.evening-choice [aria-pressed=true]').count(),0);
  await page.locator('[data-action="category:SENSUEL"]').click();assert.equal(await page.locator('[data-action="category:SENSUEL"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.evening-choice-odds').innerText(),new RegExp(world.couple.category_preference_percent+' %'));
  assert.equal(await page.evaluate(()=>window.__eveningD100===document.querySelector('.evening-d35-col canvas')),true);
  await capture('selected');await page.locator('.home-odds-info').click();await page.waitForSelector('#evening-play-info[open]');
  assert.match(await page.locator('#evening-play-info').innerText(),new RegExp(world.couple.category_preference_percent+' % pour la catégorie choisie'));
  assert.equal(await page.locator('#evening-play-info [data-action="evening-calendar"]').isVisible(),true);
  assert.equal(await page.locator('#evening-play-info [data-action="evening-close-request"]').isVisible(),true);await capture('info');
  await page.locator('#evening-play-info [data-action="evening-close-request"]').click();await page.waitForSelector('.evening-confirm');
  assert.equal(world.calls.filter(c=>c.name==='close_love_evening_preserve').length,0);await page.locator('[data-action="dismiss-cancel"]').click();
  assert.equal(await page.evaluate(()=>window.__eveningD100===document.querySelector('.evening-d35-col canvas')),true);
  if(width===360){
   await page.locator('[data-action="category:HASARD"]').click();assert.equal(await page.locator('.evening-choice-odds').count(),0);
  }
  await page.locator('[data-action="new-challenge"]').click();
  await page.waitForFunction(()=>document.querySelector('.evening-d100-result')?.textContent==='Résultat : 17',{timeout:16000});
  await page.waitForSelector('[data-action="evening-close"]',{timeout:16000});await page.locator('[data-action="evening-close"]').click();
  assert.equal(world.calls.filter(c=>c.name?.startsWith('draw_for_partner')).length,1);
  assert.equal(world.calls.find(c=>c.name?.startsWith('draw_for_partner')).name,width===360?'draw_for_partner_random':'draw_for_partner');
  assert.equal(await page.evaluate(()=>window.__eveningD100===document.querySelector('.evening-d35-col canvas')),true,'Official draw keeps the same model');
  assert.equal(await page.locator('.evening-d35-col canvas').getAttribute('data-face'),'17');
  assert.equal(await page.locator('.evening-choice [aria-pressed=true]').count(),0,'Category resets after each official draw');
  assert.equal(await page.locator('[data-action="new-challenge"]').isDisabled(),true,'Partner turn stays locked');await capture('recorded');
  assert.deepEqual(errors,[]);await context.close();console.log('EVENING_D100_TEMPLATE_OK',width,height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
