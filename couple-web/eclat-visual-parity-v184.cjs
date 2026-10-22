/* Browser-level visual geometry verification against the approved 12-coffret design.
   Fails for wrongly placed titles, numbers, arrows, blank photos or misplaced premium pill.
   Unlike basic smoke tests, tests literal DOM pixels/bounding rectangles on screen. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const viewports=[{width:360,height:700},{width:393,height:780},{width:412,height:824},
 {width:820,height:1180},{width:1180,height:820}];
const rect=r=>({x:r.left,y:r.top,w:r.width,h:r.height,right:r.right,bottom:r.bottom});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LOVEROLL_CHROMIUM_PATH||undefined,headless:true});
 fs.mkdirSync('design-captures',{recursive:true});
 try{
  for(const viewport of viewports){
   const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
   if(process.env.LOVEROLL_LOCAL_FILES)await page.route('http://127.0.0.1:8765/**',async route=>{
    const name=new URL(route.request().url()).pathname;
    const file=path.join(process.cwd(),'couple-web',name);
    if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
    const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
    return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
   });
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/__eclat-production-v184.html',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__fixtureReady===true);
   await page.waitForTimeout(120);
   const metrics=await page.evaluate(()=>{
    const $=s=>document.querySelector(s);
    const R=x=>{const r=x.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const card=[...document.querySelectorAll('.eclat-photo-grid button.eclat-tile')].map((tile,index)=>{
     const number=tile.querySelector('.eclat-tile-number'),title=tile.querySelector('strong'),arrow=tile.querySelector('.eclat-tile-arrow'),photo=tile.querySelector('.eclat-tile-photo');
     const style=getComputedStyle(tile);
     return {index:index+1,card:R(tile),num:R(number),title:R(title),arrow:R(arrow),photo:R(photo),
      label:title.textContent,arrowText:arrow.textContent.trim(),arrowSvgs:arrow.querySelectorAll('svg').length,arrowCircles:arrow.querySelectorAll('svg circle').length,arrowPaths:arrow.querySelectorAll('svg path').length,arrowShape:arrow.querySelector('svg path')?.getAttribute('d'),arrowFill:getComputedStyle(arrow.querySelector('svg')).fill,numberText:number.textContent.trim(),
      photoBg:getComputedStyle(photo).backgroundImage,position:getComputedStyle(title).position,
      border:style.borderTopColor};
    });
    const mode=$('.ritual-mode-switcher .ritual-mode-premium');
    return {cards:card,gold:mode?{box:R(mode),background:getComputedStyle(mode).backgroundImage,
      border:getComputedStyle(mode).borderColor,shadow:getComputedStyle(mode).boxShadow}:null,
      viewport:{w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,
      scrollH:document.documentElement.scrollHeight},
      photoLoaded:performance.getEntriesByType('resource').some(x=>x.name.includes('eclat-photo-strip-v183.webp'))};
   });
   assert.equal(metrics.cards.length,12,'Exactly 12 photographed cards');
   assert.ok(metrics.gold,'Éclat premium button must be present');
   assert.match(metrics.gold.background,/gradient/,'Gilded button must have a real glossy ruby material');
   assert.notEqual(metrics.gold.shadow,'none','Gilded button must be 3D and luminous');
   assert.ok(metrics.viewport.scrollW<=viewport.width+2 && metrics.viewport.scrollH<=viewport.height+2,
     'No page scrolling '+JSON.stringify({viewport,screen:metrics.viewport}));
   for(const c of metrics.cards){
    const b=c.card,n=c.num,t=c.title,a=c.arrow;
    const err=message=>{throw Error(message+' '+JSON.stringify({viewport,card:c}));};
    if(b.w<75||b.h<45)err('CARD_TOO_SMALL');
    if(n.y<b.y-1||n.y>b.y+Math.max(14,b.h*.22))err('NUMBER_NOT_TOP_LEFT');
    if(n.x<b.x+1||n.x>b.x+b.w*.14)err('NUMBER_NOT_LEFT');
    if(t.bottom>b.bottom+2 || t.bottom<b.bottom-Math.max(17,b.h*.23))err('TITLE_NOT_BOTTOM_LEFT');
    if(t.x<b.x+1||t.x>b.x+b.w*.14)err('TITLE_NOT_LEFT');
    if(n.bottom>t.y-3)err('NUMBER_OVERLAPS_TITLE');
    if(a.x<b.right-Math.max(42,b.w*.2) || a.right>b.right+2)err('ARROW_NOT_RIGHT');
    if(a.y>b.y+Math.max(14,b.h*.22)||a.y<b.y-2)err('ARROW_NOT_TOP');
    if(!c.photoBg.includes('eclat-photo-strip-v183.webp')||c.photo.h<30)err('PHOTO_MISSING');
    if(c.position!=='absolute')err('TITLE_POSITION_NOT_PINNED');
    if(c.arrowText||c.arrowSvgs!==1||c.arrowCircles!==0||c.arrowPaths!==1||!c.arrowShape?.endsWith('Z')||c.arrowFill==='none')err('GOLD_TRIANGLE_NOT_SINGLE');
    if(c.numberText!==String(c.index).padStart(2,'0')+' / 12')err('CARD_NUMBER_MISMATCH');
   }
   assert.deepEqual(errors,[]);
   const screenshot=path.join('design-captures','coffrets-v184-'+viewport.width+'x'+viewport.height+'.png');
   await page.screenshot({path:screenshot});
   fs.writeFileSync(screenshot.replace(/\.png$/,'.json'),JSON.stringify(metrics));
   console.log('ECLAT_APPROVED_LAYOUT_OK',viewport.width+'x'+viewport.height,
    '12 photos, numbers top-left, titles bottom-left, arrows top-right, no overlapping labels, glossy gold');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('ECLAT_APPROVED_LAYOUT_FAILED',e);process.exit(1);});
