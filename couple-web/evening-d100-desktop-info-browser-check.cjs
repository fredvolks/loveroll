const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 fs.mkdirSync('design-captures',{recursive:true});
 try{
  for(const [name,width,height] of [['desktop',1366,768],['wide',1600,900]]){
   const world=createWorld();world.enableEveningD6=world.enableEveningDraw=true;
   world.profiles[0].display_name='Partenaire A';
   world.profiles[1].display_name='Partenaire B';
   world.couple.category_preference_percent=74;
   const {nextMonday}=await import('./premium-home.mjs');
   const monday=new Date(nextMonday()+'T12:00:00Z');
   monday.setUTCDate(monday.getUTCDate()-7);
   world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),
    face:3,created_at:new Date(Date.now()-120000).toISOString()}];
   world.eveningSessions=[{id:'desktop-evening-info',couple_id:'c',
    started_at:new Date(Date.now()-60000).toISOString(),
    finished_at:null,paired_turns:true,self_draws:true,starting_user_id:'a'}];
   world.personalRolls=[{id:'d6-a',session_id:'desktop-evening-info',user_id:'a',face:2},
    {id:'d6-b',session_id:'desktop-evening-info',user_id:'b',face:3}];
   world.board={ready:true,next:'a',first:'a',remaining:{a:2,b:3},
    targets:{a:2,b:3},completed:{a:0,b:0},drawn:{a:0,b:0},
    drawsFinished:false,finished:false};
   const {page,context,errors}=await setupEditorial(browser,world,
    {width,height,query:'open=home',motion:'reduce'});
   try{
    await page.locator('.nav [data-action="tab:session"]').click();
    await page.waitForSelector('#app.has-evening-d100-desktop-info .evening-step.two .home-odds-info');
    const info=page.locator('.evening-step.two .home-odds-info');
    assert.equal(await info.count(),1,'Desktop must expose exactly one real info button');
    assert.equal(await info.getAttribute('aria-controls'),'evening-play-info');
    assert.equal(await info.getAttribute('aria-haspopup'),'dialog');
    const dice=page.locator('.evening-die-row canvas');
    await page.waitForFunction(()=>document.querySelector('.evening-die-row canvas')?.loveRollDie?.readState);
    const modelBefore=await dice.evaluate(e=>e.loveRollDie.readState().modelId);
    const drawCount=world.calls.filter(c=>c.name==='give_love_challenge').length;
    await info.click();
    const dialog=page.locator('#evening-play-info');
    await dialog.waitFor({state:'visible'});
    assert.equal(await dialog.evaluate(e=>e.open),true);
    assert.match(await dialog.innerText(),/74 % pour la catégorie choisie/);
    assert.equal(await dialog.locator('[data-action="evening-calendar"]').isVisible(),true);
    await page.screenshot({path:'design-captures/desktop-d100-info-'+name+'.png'});
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(e=>e.open),false);
    assert.equal(await info.evaluate(e=>document.activeElement===e),true,
     'Closing info must return keyboard focus to i');
    assert.equal(await dice.evaluate(e=>e.loveRollDie.readState().modelId),modelBefore,
     'D100 WebGL instance must not remount when info closes');
    assert.equal(world.calls.filter(c=>c.name==='give_love_challenge').length,drawCount,
     'Viewing information must not draw a card');
    await info.click();
    assert.equal(await page.evaluate(()=>window.loveRollHandleBack()),true,
     'Android/system Back must close the information modal first');
    assert.equal(await dialog.evaluate(e=>e.open),false);
    assert.equal(await page.locator('#app.loveroll-evening-page').count(),1);
    await info.click();await dialog.locator('.evening-play-close').click();
    assert.equal(await dialog.evaluate(e=>e.open),false);
    assert.deepEqual(errors,[]);
    console.log('DESKTOP_D100_INFO_OK',name);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
