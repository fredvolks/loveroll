// Preview actual encoded Web and APK resources under common launcher masks.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:760,height:300},deviceScaleFactor:2});
  const web='data:image/png;base64,'+fs.readFileSync('couple-web/assets/loveroll-icon-512.png').toString('base64');
  const native='data:image/webp;base64,'+fs.readFileSync('app/src/main/res/drawable-nodpi/loveroll_launcher.webp').toString('base64');
  await page.setContent('<style>body{margin:0;background:#10070c;color:#f5dcd8;font:15px system-ui;text-align:center}h1{font:26px Georgia;margin:27px 0}section{display:flex;justify-content:center;gap:40px}figure{margin:0;width:130px}img{width:116px;height:116px;border-radius:28px}img.round{border-radius:50%}figcaption{margin-top:12px;color:#ccb3bf}</style><h1>LoveRoll · Un seul emblème</h1><section>'+[['Web',web,''],['APK',native,''],['Web · rond',web,'round'],['APK · rond',native,'round']].map(([label,src,cls])=>'<figure><img class="'+cls+'" src="'+src+'"/><figcaption>'+label+'</figcaption></figure>').join('')+'</section>');
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth===512));
  assert.equal(await page.locator('img').count(),4);fs.mkdirSync('design-captures',{recursive:true});
  await page.screenshot({path:'design-captures/icons122-comparison.png'});console.log('ICON_PREVIEW_OK same Web/APK artwork under rounded square and circle masks');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
