'use strict';
// LR-AUDIT-GLOBAL: real LoveRoll router, synthetic couple; no production RPC.
process.env.LOVEROLL_LOCAL_FILES='1';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage',
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const {nextMonday}=await import('./premium-home.mjs');
  const monday=new Date(nextMonday()+'T12:00:00Z');
  monday.setUTCDate(monday.getUTCDate()-7);
  for(const [width,height] of [[320,568],[412,915],[820,1180]]){
   const world=createWorld();
   world.enableEveningD6=true;
   world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',
    key:monday.toISOString().slice(0,10),face:3,
    created_at:new Date(Date.now()-120000).toISOString()}];
   world.eveningSessions=[{id:'back-test-night',couple_id:'c',
    started_at:new Date(Date.now()-60000).toISOString(),
    finished_at:null,paired_turns:true,self_draws:true,starting_user_id:'a'}];
   world.personalRolls=[
    {id:'d6-a',session_id:'back-test-night',user_id:'a',face:2},
    {id:'d6-b',session_id:'back-test-night',user_id:'b',face:3}
   ];
   world.board={ready:true,next:'b',first:'a',
    remaining:{a:1,b:3},targets:{a:2,b:3},
    completed:{a:0,b:0},drawn:{a:1,b:0},
    drawsFinished:false,finished:false};
   world.challenges=[{id:'back-test-challenge',couple_id:'c',
    session_id:'back-test-night',recipient:'a',offered_by:'b',
    category:'SENSUEL',face:17,status:'proposed',
    card_title:'Un moment tendre',card_description:'Choisissez votre rythme ensemble.',
    card_timer_minutes:4,created_at:new Date().toISOString()}];
   const {page,context,errors}=await setupEditorial(browser,world,{
    width,height,query:'open=home',motion:'reduce'});
   try{
    await page.locator('.nav [data-action="tab:session"]').click();
    const active=page.locator('.nav [data-action="tab:session"].active');
    await active.waitFor({state:'visible',timeout:15000});
    // A pending challenge can open automatically after sync.
    const queue=page.locator('.evening-queue-modal');
    if(await queue.count())await queue.locator('[data-action="evening-close"]').click();
    const open=page.locator('[data-action="evening-list"]').first();
    await open.waitFor({state:'visible',timeout:10000});
    await open.click();
    await queue.waitFor({state:'visible'});
    const card=queue.locator('[data-action="evening-open:back-test-challenge"]');
    await card.click();
    await page.locator('.evening-queue-content.is-detail').waitFor({state:'visible'});
    const handled=await page.evaluate(()=>window.loveRollHandleBack());
    assert.equal(handled,true,'Android native Back must be consumed by open challenge');
    await queue.waitFor({state:'detached',timeout:4000});
    assert.equal(await active.count(),1,'Android Back must not leave Soirée');
    assert.equal(await open.evaluate(el=>document.activeElement===el),true,
     'Focus must return to the private challenge list trigger');
    await open.click();
    await queue.waitFor({state:'visible'});
    await queue.locator('[data-action="evening-open:back-test-challenge"]').click();
    await page.locator('.evening-queue-content.is-detail').waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await queue.waitFor({state:'detached',timeout:4000});
    assert.equal(await active.count(),1,'Escape must not navigate away from Soirée');
    assert.equal(await open.evaluate(el=>document.activeElement===el),true,
     'Escape must restore focus to the challenge trigger');
    assert.deepEqual(world.calls.filter(c=>c.name&&/^(draw_|roll_|answer_|save_|finish_|close_|delete_|reset_)/.test(c.name)),[],
     'Closing a challenge dialog must never mutate the official game');
    assert.deepEqual(errors,[],'No browser exceptions during native and keyboard Back');
    console.log('LR_EVENING_PRIVATE_BACK_OK',width,height);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
