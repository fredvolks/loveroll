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
 {name:'desktop',width:1366,height:768}
];
(async()=>{
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const layout of layouts){
   const world=createWorld();
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
      buttons:[...root.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>=1).length
     };
    });
    assert.ok(data.die&&data.die.width>=80&&data.die.height>=80,layout.name+' 3D stage collapsed');
    assert.ok(data.buttons>1,layout.name+' controls missing');
    assert.equal(data.overflow,false,layout.name+' page overflows horizontally');
    if(layout.width>=768){
     assert.match(data.photo,/loveroll-home-portrait-v202\.webp/,layout.name+' uses a different photograph');
     for(const [part,style] of Object.entries({scene:data.scene,gallery:data.gallery,month:data.month})){
      if(!style)continue;
      assert.equal(style.bg,'none',layout.name+' duplicate scene in '+part);
      assert.equal(style.shadow,'none',layout.name+' extra shadow/frame in '+part);
     }
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
