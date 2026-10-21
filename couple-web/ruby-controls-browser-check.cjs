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
  for(const [width,height] of [[412,824],[412,915],[360,740]]){
   const world=createWorld();world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
   const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home',motion:'no-preference'});
   await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.fonts.check('600 28px "LoveRoll Cormorant"')),true,'Bundled romantic font must load');
   const metrics=()=>page.evaluate(()=>{
    const panel=document.querySelector('.home-dashboard');
    return [panel,...panel.querySelectorAll('*')].map(e=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e);
     return {html:e.innerHTML,rect:[r.x,r.y,r.width,r.height],font:s.font,color:s.color,background:s.background,border:s.border,shadow:s.boxShadow,padding:s.padding,transform:s.transform};
    });
   });
   const originalStats=await metrics();
   await page.evaluate(()=>document.querySelector('link[href*="ruby-controls.css"]').disabled=true);
   assert.deepEqual(await metrics(),originalStats,'New controls must not alter statistics content, layout or styling');
   await page.evaluate(()=>document.querySelector('link[href*="ruby-controls.css"]').disabled=false);
   await page.waitForTimeout(250);
   const touch=await context.newCDPSession(page);
   for(const selector of ['.home-roll-button','.home-next-month','.nav .lr-ruby-tab.active']){
    const button=page.locator(selector),before=await button.evaluate(e=>({shadow:getComputedStyle(e).boxShadow,y:e.getBoundingClientRect().y}));
    const r=await button.boundingBox();
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});
    await page.waitForTimeout(160);
    const held=await button.evaluate(e=>({shadow:getComputedStyle(e).boxShadow,y:e.getBoundingClientRect().y}));
    assert.ok(held.y-before.y>=2,'Finger press must physically sink the control');
    assert.notEqual(held.shadow,before.shadow,'Finger press must switch to an inset shadow');
    if(process.env.LOVEROLL_CAPTURE_DIR&&width===412&&height===824)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`pressed-${selector.includes('next')?'feature':selector.includes('nav')?'nav':'action'}.png`)});
    await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await page.waitForTimeout(160);
    assert.equal(await button.evaluate(e=>e.classList.contains('lr-pressed')),false,'Cancelled touch must release the visual state');
    assert.ok(Math.abs((await button.boundingBox()).y-before.y)<.1,'Control must return to its resting position');
   }
   assert.equal(world.calls.filter(c=>c.name==='roll_couple_once').length,0,'Press feedback must not generate a draw');
   await page.locator('[data-action="tab:settings"]').click();await page.waitForSelector('.loveroll-settings-page');
   assert.equal(await page.locator('.lr-ruby-nav [data-action="tab:settings"]').evaluate(e=>e.classList.contains('active')),true);
   await page.locator('[data-action="tab:home"]').click();await page.waitForSelector('.home-dashboard');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),0);
   assert.equal(await page.locator('.nav').evaluate(e=>e.getBoundingClientRect().bottom),height);
   assert.deepEqual(errors,[]);await context.close();console.log('RUBY_CONTROLS_TOUCH_OK',width,height);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
