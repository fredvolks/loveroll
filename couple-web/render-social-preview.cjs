// Rebuild the checked-in public social artwork from its code-native composition.
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8765/social-preview.html',{waitUntil:'load'});
 await page.locator('figure img').evaluate(el=>el.decode());await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'couple-web/assets/loveroll-messenger-og-v139.png'});
 await page.screenshot({path:'couple-web/assets/loveroll-messenger-og-v142.jpg',type:'jpeg',quality:90});
 await page.evaluate(()=>document.body.classList.add('scene-only'));
 await page.screenshot({path:'couple-web/assets/loveroll-rendezvous-scene-v139.png'});
 console.log('RENDEZVOUS_SOCIAL_139 1200x630');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
