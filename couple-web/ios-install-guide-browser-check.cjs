// Browser-emulated Safari test (not physical iOS/Safari).
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs');
const safariUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
(async()=>{
 fs.mkdirSync('landing-captures',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const size of [
   ['iPhone-SE',320,568],['iPhone-small',375,667],['iPhone-standard',393,852],['iPhone-ProMax',430,932]
  ]){
   const [label,width,height]=size;
   const context=await browser.newContext({viewport:{width,height},userAgent:safariUA,isMobile:true,
    hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/__ios-install-tour-test.html',{waitUntil:'load'});
   await page.locator('.lr-ios-tour-card').waitFor({timeout:12000});
   for(let step=0;step<=4;step++){
    const result=await page.evaluate(()=>{
     const get=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
     const card=document.querySelector('.lr-ios-tour-card'),bounds=get(card);
     const within=e=>{const r=get(e);return r.width>0&&r.height>0&&r.x>=bounds.x-2&&r.y>=bounds.y-2&&
       r.right<=bounds.right+2&&r.bottom<=bounds.bottom+2&&r.x>=-2&&r.y>=-2&&
       r.right<=innerWidth+2&&r.bottom<=innerHeight+2;};
     return {card:bounds,viewport:[innerWidth,innerHeight],
       scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],
       content:[...card.children].filter(e=>getComputedStyle(e).position!=='absolute').map(e=>({name:e.tagName,ok:within(e)})),
       buttons:[...card.querySelectorAll('button')].map(e=>({text:e.textContent,ok:within(e),height:get(e).height}))};
    });
    console.log('IOS_GUIDE',label,step,JSON.stringify(result));
    assert.deepEqual(errors,[]);
    assert.ok(result.scroll.every(x=>x<=2),'Unexpected scroll: '+label+' step '+step);
    assert.ok(result.card.y>=0&&result.card.bottom<=height+2,'Dialog clipped: '+label);
    assert.ok(result.content.every(x=>x.ok),'Tutorial content clipped: '+label+' step '+step);
    assert.ok(result.buttons.every(x=>x.ok&&x.height>=40),'Button clipped: '+label+' step '+step);
    await page.screenshot({path:'landing-captures/ios-guide-'+label+'-'+step+'.png'});
    if(step<4)await page.locator('[data-ios-tour="next"]').click();
   }
   await page.locator('[data-ios-tour="done"]').click();
   assert.equal(await page.locator('.lr-ios-tour').count(),0,'Tutorial closes');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('loveroll-ios-safari-guide-v229')).choice),'done');
   await page.reload();await page.waitForTimeout(1300);
   assert.equal(await page.locator('.lr-ios-tour').count(),0,'Finished tour stays dismissed');
   await page.evaluate(()=>window.dispatchEvent(new Event('loveroll:ios-install-guide')));
   await page.locator('.lr-ios-tour-card').waitFor();
   await page.locator('[data-ios-tour="later"]').click();
   await context.close();
  }
  const android=await browser.newContext({viewport:{width:412,height:824},isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'});
  const page=await android.newPage();
  await page.goto('http://127.0.0.1:8765/__ios-install-tour-test.html');
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('.lr-ios-tour').count(),0,'Android must not see Safari tutorial');
  await android.close();
  console.log('IOS_INSTALL_TOUR_FIT_PASSED');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
