const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LOVEROLL_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const create=browser.newContext.bind(browser);
 browser.newContext=async options=>{const context=await create(options);if(process.env.LOVEROLL_THREE_DIR)await context.route('https://esm.sh/three@0.167.1**',route=>{const name=new URL(route.request().url()).pathname.replace('/three@0.167.1','');return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(process.env.LOVEROLL_THREE_DIR,name||'build/three.module.js'),'utf8').replaceAll("from 'three'","from 'https://esm.sh/three@0.167.1'")});});return context;};
 try{for(const [width,height] of [[360,740],[412,824],[412,915]]){
  const world=createWorld();world.eclat={access:true,active:true,coffret_id:1,minutes:60,chapter_index:1,chapter_number:1,chapter_total:6,variant_number:0,session_id:'synthetic-guided',my_choice:null,both_chosen:false};
  const own=await setupEditorial(browser,world,{width,height,query:'open=home'}),{page}=own;
  const enter=async p=>{await p.waitForSelector('.home-dashboard');await p.locator('[data-action="tab:session"]').click();await p.locator('[data-action="tab:eclat"]').click();await p.waitForSelector('[data-eclat-field="note"]:enabled');};
  await enter(page);
  const nav=await page.locator('.nav').boundingBox();
  const fits=async()=>{const b=await page.locator('.eclat-guided-actions').boundingBox();assert.ok(b.y+b.height<=nav.y,'Actions stay above the common bottom nav');assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1),false);};
  await fits();
  assert.equal(await page.locator('.eclat-guided-content').evaluate(e=>e.scrollHeight>e.clientHeight+1),false,'The full initial moment, private note and help fit without scrolling');
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`eclat-prepare-${width}-${height}.png`)});
  await page.locator('[data-eclat-field="note"]').fill('Notre souvenir privé de test');
  // Approximate Android's resizes-content keyboard without faking an IME.
  await page.setViewportSize({width,height:480});
  await page.locator('[data-eclat-field="note"]').focus();
  await page.locator('[data-eclat-field="note"]').scrollIntoViewIfNeeded();
  const writing=await page.evaluate(()=>{const p=document.querySelector('.eclat-guided-content').getBoundingClientRect(),f=document.querySelector('[data-eclat-field="note"]').getBoundingClientRect();return {pane:p.height,inside:f.top>=p.top-1&&f.bottom<=p.bottom+1};});
  assert.ok(writing.pane>=80&&writing.inside,'Whole text field remains visible in the keyboard-height viewport');
  assert.equal(await page.locator('[data-eclat-field="note"]').inputValue(),'Notre souvenir privé de test');
  await page.setViewportSize({width,height});
  await page.locator('.eclat-clue-field summary').click();
  await page.locator('[data-eclat-field="clue"]').fill('Un indice de test');
  world.noteSaveError=true;
  await page.locator('[data-action="eclat:note-save"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-eclat-note-status]')?.textContent.includes('Non enregistré'));
  assert.equal(await page.locator('[data-eclat-field="note"]').inputValue(),'Notre souvenir privé de test');
  world.noteSaveError=false;
  await page.locator('[data-action="eclat:note-save"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-eclat-note-status]')?.textContent.includes('enregistrée'));
  await page.reload();await enter(page);
  assert.equal(await page.locator('[data-eclat-field="note"]').inputValue(),'Notre souvenir privé de test');
  assert.equal(await page.locator('[data-eclat-field="clue"]').inputValue(),'Un indice de test');
  const partner=await setupEditorial(browser,world,{width,height,actor:'b',query:'open=home'});
  await enter(partner.page);
  assert.equal(await partner.page.locator('[data-eclat-field="note"]').inputValue(),'');
  for(const p of [page,partner.page]){
   await p.locator('[data-action="eclat:note-play"]').click();await p.waitForSelector('[data-eclat-phase="play"]');
   await p.locator('[data-action="eclat:note-done"]').click();await p.waitForSelector('[data-eclat-phase="choose"]');
   if(p===page){await fits();if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`eclat-choose-${width}-${height}.png`)});}
   await p.locator('[data-action="eclat:choose:1"]').click();
  }
  await page.waitForSelector('[data-eclat-phase="reveal"]',{timeout:12000});
  assert.equal(world.eclat.chapter_index,1);
  await page.locator('[data-action="eclat:next"]').click();assert.equal(world.eclat.chapter_index,1);
  await partner.page.locator('[data-action="eclat:next"]').click();
  await page.waitForSelector('[data-eclat-phase="prepare"]',{timeout:12000});
  assert.equal(world.eclat.chapter_index,2);
  assert.equal(await page.locator('[data-eclat-field="note"]').inputValue(),'');
  assert.deepEqual(own.errors,[]);assert.deepEqual(partner.errors,[]);
  await own.context.close();await partner.context.close();console.log('ECLAT_GUIDED_OK',width,height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
