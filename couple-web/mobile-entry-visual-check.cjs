/* Production mobile entry gates: REAL Chromium geometry, not regexp checks.
   Runs during GitHub Pages deploy against the actual CSS and rendered DOM. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='http://127.0.0.1:8765/';
const fs=require('node:fs');
async function main(){
 const [{discoverHtml},{authHtml}]=await Promise.all([
  import('./discover.mjs'),import('./onboarding.mjs')
 ]);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const styles=[...fs.readFileSync('couple-web/index.html','utf8').matchAll(/<link rel="stylesheet" href="\.\/([^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1]);
 const css=styles.map(s=>'<link rel="stylesheet" href="'+BASE+s+'">').join('');
 let checked=0;
 try{
  for(const [width,height] of [[393,760],[360,640],[375,520],[320,568],[412,700]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   await page.goto(BASE+'__premium-couple-pages-test.html');
   const cases=[
    ['invitation',discoverHtml(true,''),'[data-action="invite-start"]'],
    ['public',discoverHtml(false,''),'[data-action="show-auth:signup"]'],
    ['signin',authHtml(false,'signin'),'[data-action="auth-signin-password"]'],
    ['signup',authHtml(false,'signup'),'[data-action="auth-signup-password"]'],
    ['invitation-signin',authHtml(true,'signin'),'[data-action="auth-signin-password"]'],
    ['recovery',authHtml(false,'request-reset'),'[data-action="auth-send-reset"]'],
    ['new-password',authHtml(false,'recover'),'[data-action="auth-update-password"]']
   ];
   for(const [name,markup,selector] of cases){
    await page.setContent('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+css+'</head><body><main id="app">'+markup+'</main></body></html>',{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const measure=await page.evaluate(s=>{
     const element=document.querySelector(s),screen=window.innerHeight;
     const r=element?.getBoundingClientRect();
     const container=document.querySelector('.love-discover,.auth-editorial');
     const c=container?.getBoundingClientRect();
     const bounds=e=>e?{top:e.top,bottom:e.bottom,height:e.height}:null;
     return {screen,scrollHeight:document.documentElement.scrollHeight,
      primary:bounds(r),container:bounds(c),
      interactive:!!element&&!element.disabled&&getComputedStyle(element).display!=='none'};
    },selector);
    assert.ok(measure.interactive,name+' '+width+'x'+height+' missing active CTA');
    const marketing=name==='invitation'||name==='public';
    if(marketing)assert.ok(measure.primary.top>=-3&&measure.primary.bottom<=measure.screen+2,name+' CTA clipped');
    else{await page.locator(selector).scrollIntoViewIfNeeded();const r=await page.locator(selector).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=height+2,name+' submit unreachable');}
    const lastControl=name==='invitation'?'[data-action="invite-start"]':name==='public'?'[data-action="show-auth:signin"]':'.entry-auth-back';
    await page.locator(lastControl).first().scrollIntoViewIfNeeded();
    const last=await page.locator(lastControl).first().boundingBox();
    assert.ok(last&&last.y>=-2&&last.y+last.height<=height+2,name+' last control unreachable');
    await page.evaluate(()=>scrollTo(0,0));
    if(name==='invitation'||name==='public'){
     const visual=await page.evaluate(()=>{
      const stage=document.querySelector('.discover-editorial-stage')?.getBoundingClientRect();
      const img=document.querySelector('.discover-editorial-die>img');
      const art=img?.getBoundingClientRect();
      const list=document.querySelector('.discover-editorial-list')?.getBoundingClientRect();
      return {stageHeight:stage?.height,artHeight:art?.height,artWidth:art?.width,
       listHeight:list?.height,features:document.querySelectorAll('.discover-editorial-item').length,
       naturalImageWidth:img?.naturalWidth,stageBottom:stage?.bottom};
     });
     assert.ok(visual.stageHeight>=130&&visual.artHeight>=100&&visual.listHeight>=45&&
      visual.features===4&&visual.naturalImageWidth>100,
      name+' '+width+'x'+height+' showcase disappeared '+JSON.stringify(visual));
    }
    if(marketing)assert.ok(measure.scrollHeight<=measure.screen+3,name+' page scroll');
    else assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');
    if(name==='signup'&&width===375){fs.mkdirSync('design-captures',{recursive:true});await page.screenshot({path:'design-captures/short-signup-375x520.png'});}
    checked++;
   }
   await page.close();
  }
  /* A focused input and virtual keyboard-size viewport must keep its submit CTA. */
  const page=await browser.newPage({viewport:{width:393,height:360},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await page.goto(BASE+'__premium-couple-pages-test.html');
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+css+'</head><body><main id="app">'+authHtml(true,'signin')+'</main></body></html>',{waitUntil:'load'});
  await page.locator('#signin-email').focus();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.locator('[data-action="auth-signin-password"]').scrollIntoViewIfNeeded();
  const keyboard=await page.locator('[data-action="auth-signin-password"]').boundingBox();
  assert.ok(keyboard&&keyboard.y>=0&&keyboard.y+keyboard.height<=360,
   'Submit must fit inside a keyboard-shrunken viewport '+JSON.stringify(keyboard));
  await page.close();checked++;
  console.log('LOVE entry mobile no-scroll Chromium checks passed:',checked);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
