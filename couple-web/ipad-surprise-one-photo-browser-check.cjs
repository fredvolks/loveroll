'use strict';
/* Real Surprise DOM, safely driven by a synthetic couple. No production API,
   paid action, dice draw or real-device assertion. */
process.env.LOVEROLL_LOCAL_FILES='1';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const layouts=[
 {name:'android-control',width:412,height:915},
 {name:'ipad-portrait',width:820,height:1180},
 {name:'ipad-landscape',width:1180,height:820},
 {name:'desktop',width:1366,height:768},
 {name:'ipad-landscape-host',width:1180,height:820,host:true}
];
(async()=>{
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const layout of layouts){
   const world=createWorld();
   if(layout.host){
    const key=new Intl.DateTimeFormat('en-CA',{
     timeZone:'America/Toronto',year:'numeric',month:'2-digit'
    }).format(new Date());
    world.rolls.push({id:'synthetic-monthly-activity',couple_id:'c',
     kind:'monthly_activity',key,face:12,created_at:new Date().toISOString()});
   }
   const {page,context,errors}=await setupEditorial(browser,world,{
    width:layout.width,height:layout.height,query:'open=home',motion:'reduce'
   });
   try{
    const tab=page.locator('.nav [data-action="tab:special"]');
    await tab.waitFor({state:'visible',timeout:15000});
    await tab.click();
    await page.locator('.nav [data-action="tab:special"].active').waitFor({timeout:10000});
    await page.locator('#app.loveroll-surprise-ecrin .surprise-main-die-scene').waitFor({state:'visible',timeout:12000});
    await page.evaluate(()=>document.fonts.ready);
    const data=await page.evaluate(()=>{
     const root=document.querySelector('main#app.loveroll-surprise-ecrin');
     const scene=root.querySelector('.surprise-main-die-scene');
     const gallery=root.querySelector('.surprise-gallery');
     const month=root.querySelector('.surprise-month');
     const stage=root.querySelector('.surprise-main-die-scene .love3d-stage');
     const summary=e=>{if(!e)return null;const s=getComputedStyle(e);return {bg:s.backgroundImage,shadow:s.boxShadow,border:s.borderStyle};};
     const photo=getComputedStyle(root,'::before');
     const rect=stage?.getBoundingClientRect();
     return {
      photo:photo.backgroundImage,
      scene:summary(scene),gallery:summary(gallery),month:summary(month),
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      die:rect?{width:rect.width,height:rect.height,top:rect.top,bottom:rect.bottom}:null,
      buttons:[...root.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>=1).length,
      layout:(()=>{
       const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
       return {scene:rect(scene),button:rect(month?.querySelector('.surprise-primary')),
        special:rect(root.querySelector('.surprise-special')),
        legend:rect(root.querySelector('.surprise-host-legend'))};
      })()
     };
    });
    assert.ok(data.die&&data.die.width>=80&&data.die.height>=80,layout.name+' 3D stage collapsed');
    assert.ok(data.buttons>1,layout.name+' controls missing');
    assert.equal(data.overflow,false,layout.name+' page overflows horizontally');
    if(layout.width>=768&&layout.width>layout.height){
     const {scene,button,special}=data.layout;
     assert.ok(scene&&button&&special,layout.name+' missing Surprise layout regions');
     assert.ok(button.top>=scene.bottom-2,layout.name+' primary action must follow the die vertically');
     assert.ok(button.right<=special.left+2,layout.name+' action overlaps the events column');
     assert.ok(special.top<=scene.top+12,layout.name+' events not aligned beside the die');
     if(layout.host){
      assert.ok(data.layout.legend,layout.name+' missing real D6 host legend');
      assert.ok(data.layout.legend.bottom<=button.top+1,layout.name+' host legend overlaps button');
      assert.ok(data.layout.legend.top>=scene.top-1,layout.name+' host legend outside content');
     }
    }
    if(layout.width>=768){
     assert.match(data.photo,/loveroll-home-portrait-v202\.webp/,layout.name+' uses a different photograph');
     for(const [part,style] of Object.entries({scene:data.scene,gallery:data.gallery,month:data.month})){
      if(!style)continue;
      assert.equal(style.bg,'none',layout.name+' duplicate scene in '+part);
      assert.equal(style.shadow,'none',layout.name+' extra shadow/frame in '+part);
     }
    }
    if(layout.width<768){
     // Exercise actual native mobile dialogs, not a static HTML snapshot.
     const events=page.locator('.surprise-events-summary');
     await events.waitFor({state:'visible'});
     assert.equal(await events.isDisabled(),false,'Events must be available independent of D100 roll');
     await events.click();
     const dialog=page.locator('#surprise-events-dialog');
     await dialog.waitFor({state:'visible'});
     assert.equal(await dialog.locator('.surprise-event-card').count(),6,
      'All six editable occasions must be reachable on mobile');
     await page.keyboard.press('Escape');
     await dialog.waitFor({state:'hidden'});
     assert.match(await page.locator('main#app').getAttribute('class'),/loveroll-surprise/,
      layout.name+' Escape must close events, not leave Surprise');
     const info=page.locator('.home-odds-info');
     await info.click();
     const infoDialog=page.locator('#surprise-info-dialog');
     // Assert the actual native open state, not only a CSS visibility guess.
     const infoState=await page.evaluate(()=>{
      const el=document.querySelector('#surprise-info-dialog');
      return {present:!!el,open:!!el?.open,
       displayed:el?getComputedStyle(el).display:null,
       eventsOpen:!!document.querySelector('#surprise-events-dialog')?.open};
     });
     assert.equal(infoState.open,true,layout.name+' info dialog did not open: '+JSON.stringify(infoState));
     assert.equal(infoState.eventsOpen,false,layout.name+' events dialog remained open');
     await infoDialog.waitFor({state:'visible',timeout:8000});
     assert.match(await infoDialog.innerText(),/D100/);
     assert.match(await infoDialog.innerText(),/pair/);
     await page.keyboard.press('Escape');
     await infoDialog.waitFor({state:'hidden'});
     assert.equal(await page.locator('.surprise-events-summary').isVisible(),true);
     // Both orders and repeat entry must work without a stale dialog lock.
     await events.click();
     await dialog.waitFor({state:'visible',timeout:8000});
     await page.locator('#surprise-events-dialog .surprise-minimal-close').click();
     await dialog.waitFor({state:'hidden'});
    }
    assert.deepEqual(errors,[],layout.name+' JavaScript errors');
    await page.screenshot({path:path.join('design-captures','lr-surprise-one-photo-'+layout.name+'.png')});
    console.log('LR_SURPRISE_ONE_PHOTO_OK',layout.name,data);
   }catch(error){
    await page.screenshot({path:path.join('design-captures','lr-surprise-one-photo-'+layout.name+'-failure.png')}).catch(()=>{});
    throw error;
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
