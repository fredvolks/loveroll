// LoveRoll standalone checkout viewport smoke check.
// Runs inside the existing GitHub Pages deployment Playwright environment.
// This intentionally never changes/inspects the main game or Settings.
const {chromium}=require('playwright');
const screens=[{name:'Galaxy S25',width:393,height:740},{name:'iPhone SE',width:375,height:667},{name:'Compact Android',width:360,height:640}];
(async()=>{
 const browser=await chromium.launch({headless:true});
 let failed=false;
 try{
  for(const screen of screens){
   const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   try{
    await page.goto('http://127.0.0.1:8765/checkout.html',{waitUntil:'domcontentloaded',timeout:15000});
    // Worst-case representative real state: renewal + earned credits + discount.
    await page.evaluate(()=>{
     const credit=document.getElementById('checkout-referral-balance');
     credit.hidden=false;credit.textContent='Crédits de parrainage disponibles : 80,00 $ · Réduction du code : 10,00 $';
     const discount=document.getElementById('checkout-discount-row');
     discount.hidden=false;
     document.getElementById('checkout-discount-label').textContent='Crédits de parrainage · rabais retenu';
     document.getElementById('checkout-discount').textContent='−49,99 $';
     document.getElementById('checkout-total').textContent='0,00 $';
     document.getElementById('checkout-promo-status').textContent='Les crédits de parrainage sont plus avantageux. Le code promotionnel n’est pas utilisé.';
    });
    const result=await page.evaluate(()=>{
     const rect=sel=>{
      const e=document.querySelector(sel);
      if(!e)throw new Error('Missing element '+sel);
      const r=e.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};
     };
     return {
      viewport:{width:innerWidth,height:innerHeight},
      pageHeight:document.documentElement.scrollHeight,
      bodyHeight:document.body.scrollHeight,
      elements:Object.fromEntries(['.checkout-header','.checkout-card','#checkout-code','#checkout-apply','#checkout-referral-balance','#checkout-discount-row','#checkout-total','#checkout-pay','.checkout-conditions summary'].map(x=>[x,rect(x)]))
     };
    });
    const boundary=result.viewport.height;
    const bad=Object.entries(result.elements).filter(([k,r])=>r.top<-.5||r.bottom>boundary+1||r.left<-.5||r.right>result.viewport.width+1);
    const scrolling=result.pageHeight>boundary+1||result.bodyHeight>boundary+1;
    console.log('[checkout-v173]',screen.name,screen.width+'x'+screen.height,'body',result.bodyHeight,'page',result.pageHeight,
     'button bottom',Math.round(result.elements['#checkout-pay'].bottom),'legal bottom',Math.round(result.elements['.checkout-conditions summary'].bottom),
     'overflow',scrolling,'offscreen',bad.map(x=>x[0]).join(',')||'none');
    if(bad.length||scrolling)failed=true;
   }finally{await page.close()}
  }
 }finally{await browser.close()}
 if(failed){console.error('LoveRoll checkout does not fit the mobile viewport');process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
