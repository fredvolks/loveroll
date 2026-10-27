const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LOVEROLL_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const create=browser.newContext.bind(browser);
 browser.newContext=async options=>{const context=await create(options);if(process.env.LOVEROLL_THREE_DIR)await context.route('https://esm.sh/three@0.167.1**',route=>{const name=new URL(route.request().url()).pathname.replace('/three@0.167.1','');return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(process.env.LOVEROLL_THREE_DIR,name||'build/three.module.js'),'utf8').replaceAll("from 'three'","from 'https://esm.sh/three@0.167.1'")});});return context;};
 try{for(const [width,height] of [[360,740],[412,824],[412,915]]){
  const world=createWorld();world.eclat={access:true,active:false};
  world.eclatSessions=[30,60].map(n=>({id:'done-'+n,couple_id:'c',coffret_id:9,minutes:n,chapter_index:6,started_at:'2026-10-20',ended_at:'2026-10-21',cancelled:false}));
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home'});
  await page.waitForSelector('.home-dashboard');
  await page.locator('[data-action="tab:session"]').click();await page.waitForSelector('.has-home-soiree-template');
  const metrics=()=>page.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};return {nav:rect(document.querySelector('.nav')),brand:rect(document.querySelector('.ritual-brand')),kicker:rect(document.querySelector('.ritual-kicker')),title:rect(document.querySelector('.ritual-page-title')),gold:getComputedStyle(document.querySelector('.ritual-mode-premium')).backgroundImage,labels:['.ritual-mode-name','.ritual-premium-copy strong','.ritual-premium-copy small','.ritual-crown'].map(s=>{const n=document.querySelector(s),c=getComputedStyle(n);return {rect:rect(n),font:c.font,color:c.color,gap:c.gap};})};});
  const before=await metrics();
  await page.locator('[data-action="tab:eclat"]').click();await page.waitForSelector('.has-night-gallery .eclat-tile');await page.evaluate(()=>document.fonts.ready);
  const after=await metrics();console.log('ECLAT_HEADER',width,{before,after});
  assert.deepEqual(after.nav,before.nav);assert.deepEqual(after.brand,before.brand);assert.deepEqual(after.kicker,before.kicker);assert.deepEqual(after.title,before.title);assert.equal(after.gold,before.gold);
  assert.deepEqual(after.labels.map(n=>({...n,rect:[n.rect[0],n.rect[2],n.rect[3]]})),before.labels.map(n=>({...n,rect:[n.rect[0],n.rect[2],n.rect[3]]})),'Mode labels use identical fonts, sizes, colors and horizontal positions');
  assert.equal(await page.locator('.ritual-crown svg').count(),1);
  assert.equal(await page.locator('.eclat-library').evaluate(n=>getComputedStyle(n).boxShadow),'none');
  assert.equal(await page.locator('.eclat-tile').count(),12);
  const photos=await page.locator('.eclat-tile-photo').evaluateAll(nodes=>nodes.map(n=>({image:getComputedStyle(n).backgroundImage,position:getComputedStyle(n).backgroundPosition})));
  assert.equal(new Set(photos.map(n=>n.position)).size,12);assert.ok(photos.every(n=>n.image.includes('eclat-night-atlas-v218.webp')));
  assert.match(await page.locator('[data-action="eclat:detail:9"]').innerText(),/Terminé · 2\/3 durées/);
  const viewport=await page.evaluate(()=>{const g=document.querySelector('.eclat-photo-grid'),r=g.getBoundingClientRect(),n=document.querySelector('.nav').getBoundingClientRect();return {scroll:g.scrollHeight>g.clientHeight,cols:getComputedStyle(g).gridTemplateColumns.trim().split(/\s+/).length,fit:r.bottom<=n.top-5,overflow:document.documentElement.scrollHeight>innerHeight};});
  assert.deepEqual(viewport,{scroll:true,cols:1,fit:true,overflow:false});
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`eclat-gallery-${width}.png`)});
  await page.locator('[data-action="eclat:detail:12"]').click();await page.waitForSelector('.eclat-detail[data-coffret-id="12"]');
  assert.equal(await page.locator('.eclat-return[data-action="eclat:library"] .lr-gold-arrow.is-back').count(),1);
  await page.locator('.eclat-return').click();await page.waitForSelector('.eclat-photo-grid');assert.ok(await page.locator('.eclat-photo-grid').evaluate(n=>n.scrollTop)>100);
  await page.locator('[data-action="eclat:detail:9"]').click();
  assert.equal(await page.locator('.eclat-detail .is-done').count(),2);
  await page.locator('[data-action="eclat:minutes:90"]').click();
  const fits=()=>page.locator('.eclat-detail').evaluate(n=>{const b=n.getBoundingClientRect();return n.scrollHeight<=n.clientHeight+1&&[...n.children].filter(x=>getComputedStyle(x).display!=='none').every(x=>{const r=x.getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1;});});
  assert.equal(await fits(),true,'Whole explanation, duration choices and open button fit on one page');
  if(width===360){for(let id=1;id<=12;id++){
   await page.locator('.eclat-return').click();await page.locator('[data-action="eclat:detail:'+id+'"]').click();
   for(const duration of [30,60,90]){await page.locator('[data-action="eclat:minutes:'+duration+'"]').click();assert.equal(await fits(),true,'Coffret '+id+', '+duration+' min fits completely');}
  }
  await page.locator('.eclat-return').click();await page.locator('[data-action="eclat:detail:9"]').click();}
  // Opening a different coffret resets the approved quick-start duration to 30 minutes.
  // This browser journey deliberately chooses 90 again before starting; do not
  // confuse a previous coffret's duration selection with the current coffret.
  if(width===360)assert.equal(await page.locator('[data-action="eclat:minutes:30"].is-selected').count(),1,'Reopened coffret defaults to 30 minutes');
  await page.locator('[data-action="eclat:minutes:90"]').click();
  assert.equal(await page.locator('[data-action="eclat:minutes:90"].is-selected').count(),1,'90-minute choice is visually selected');
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`eclat-detail-${width}.png`)});
  await page.locator('[data-action="eclat:start:9"]').click();await page.waitForSelector('.eclat-play');
  assert.equal(world.eclat.minutes,90,'Explicit 90-minute selection is persisted to the started session');assert.equal(world.calls.filter(x=>x.name==='love_eclat_start').length,1);
  await page.getByRole('button',{name:'Retour aux coffrets',exact:true}).click();await page.waitForSelector('.eclat-photo-grid');
  assert.match(await page.locator('[data-action="eclat:detail:9"]').innerText(),/En cours · 90 min · étape 1/);
  // Locator.click() waits for the currently mounted card and auto-scrolls it;
  // scrollIntoViewIfNeeded() followed by click() raced against reactive gallery remounts on 412x915.
  await page.locator('[data-action="eclat:detail:1"]').click();await page.waitForSelector('.eclat-detail[data-coffret-id="1"]');
  assert.equal(await page.locator('[data-action^="eclat:start:"]').count(),0);
  await page.locator('[data-action="eclat:resume"]').click();await page.waitForSelector('.eclat-play');
  assert.equal(world.calls.filter(x=>x.name==='roll_couple_once').length,0);assert.deepEqual(errors,[]);
  await context.close();console.log('ECLAT_NIGHT_OK',width);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
