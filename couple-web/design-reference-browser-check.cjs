// Production DOM and real WebGL, synthetic couple data only. No live account writes.
const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const fake=fs.readFileSync('couple-web/boot-smoke.cjs','utf8').match(/const fakeSupabase=`([\s\S]*?)`;/)[1];
(async()=>{
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const failures=[];const report=[];
 try{
 for(const [name,width,height] of [['S25',412,915],['S25-short',412,824],['small',360,640],['Android',360,740],['iPhone',393,852],['iPad',820,1180],['PC',1440,1000],['PC-768',1366,768],['PC-short',1366,700]]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block',isMobile:width<768,hasTouch:width<900});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await page.goto('http://127.0.0.1:8765/?boot_case=paired-active');
  await page.locator('.real-home-shell').waitFor();
  let mobileNavHeight,homeWordTop,homeKicker,homeTitle;
  for(const tab of ['home','session','special','advent','settings']){
   try{
    if(tab!=='home')await page.locator('.nav [data-action="tab:'+tab+'"]').click();
    await page.waitForTimeout(700);
    if(await page.locator('canvas').count())await page.waitForFunction(()=>[...document.querySelectorAll('canvas[data-dice-sides]')].every(c=>c.dataset.webglReady==='true'),null,{timeout:20000});
    await page.screenshot({path:'design-captures/'+name+'-'+tab+'.png',fullPage:true});
    const geometry=await page.evaluate(()=>{
     const main=document.querySelector('main'),nav=document.querySelector('.nav').getBoundingClientRect();
     const kicker=document.querySelector('.ritual-kicker'),caption=kicker?.getBoundingClientRect(),captionStyle=kicker&&getComputedStyle(kicker);
     const textRange=document.createRange();if(kicker)textRange.selectNodeContents(kicker);
     const textBox=kicker&&textRange.getBoundingClientRect();
     const title=document.querySelector('.ritual-page-title'),titleBox=title?.getBoundingClientRect(),titleStyle=title&&getComputedStyle(title);
     const titleRange=document.createRange();if(title)titleRange.selectNodeContents(title);
     const titleText=title&&titleRange.getBoundingClientRect();
     // A fixed nav can cover a card even when the root never scrolls. Measure
     // the actual controls and full gift border against the nav's top edge.
     const controls=[...main.querySelectorAll('button,a[href],input,textarea,select')].filter(e=>!e.closest('.nav')&&getComputedStyle(e).visibility!=='hidden').map(e=>{
      const r=e.getBoundingClientRect();return {action:e.dataset.action||e.tagName,text:e.textContent.trim().slice(0,90),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
     }).filter(r=>r.width>0&&r.height>0);
     const gift=document.querySelector('.evening-gift'),giftBox=gift?.getBoundingClientRect();
     return {documentHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,mainScroll:main.scrollHeight,mainClient:main.clientHeight,navTop:nav.top,navBottom:nav.bottom,
      controlsOutside:controls.filter(r=>r.left< -1||r.right>innerWidth+1||r.top< -1||r.bottom>nav.top-3),giftGap:giftBox&&giftBox.height>0?nav.top-giftBox.bottom:null,
      sections:[...document.querySelectorAll('.real-home-shell > *')].map(e=>({class:e.className,top:Math.round(e.getBoundingClientRect().top),bottom:Math.round(e.getBoundingClientRect().bottom),height:Math.round(e.getBoundingClientRect().height)})),shell:{display:getComputedStyle(document.querySelector('.real-home-shell')||main).display,height:document.querySelector('.real-home-shell')?.getBoundingClientRect().height,top:document.querySelector('.real-home-shell')?.getBoundingClientRect().top},dice:[...document.querySelectorAll('canvas[data-dice-sides]')].map(c=>({side:c.dataset.diceSides,face:c.dataset.face,width:c.clientWidth,height:c.clientHeight,webgl:c.dataset.webglReady})),
      title:titleBox&&{text:title.textContent,top:titleBox.top,height:titleBox.height,font:titleStyle.font,letterSpacing:titleStyle.letterSpacing,color:titleStyle.color,center:(titleText.left+titleText.right)/2,left:titleText.left,right:titleText.right,lines:[...titleRange.getClientRects()].filter(r=>r.width>1).length},
      subtitleCount:document.querySelectorAll('.home-title>p,.evening-intro>p,.advent-intro>p,.surprise-header>p').length,
      wordTop:document.querySelector('.ritual-brand b')?.getBoundingClientRect().top,kicker:caption&&{top:caption.top,height:caption.height,font:captionStyle.font,letterSpacing:captionStyle.letterSpacing,color:captionStyle.color,center:(textBox.left+textBox.right)/2},stats:[...document.querySelectorAll('.home-stat-card strong')].map(n=>n.textContent)};
    });
    report.push({name,tab,width,height,...geometry});
    assert.ok(geometry.kicker,'Missing ritual caption');
    assert.ok(Math.abs(geometry.kicker.center-width/2)<=2,'Ritual caption is off-center '+JSON.stringify({name,tab,kicker:geometry.kicker}));
    assert.ok(geometry.title,'Missing primary page title');
    assert.equal(geometry.title.lines,1,'Primary page title wraps');
    assert.ok(Math.abs(geometry.title.center-width/2)<=2,'Primary page title is off-center');
    assert.ok(geometry.title.left>=0&&geometry.title.right<=width,'Primary page title is clipped');
    assert.equal(geometry.subtitleCount,0,'A primary header subtitle is still present');
    if(tab==='home'){homeWordTop=geometry.wordTop;homeKicker=geometry.kicker;homeTitle=geometry.title;}
    else{
     assert.ok(Math.abs(geometry.wordTop-homeWordTop)<=1,'LoveRoll wordmark moved between tabs '+JSON.stringify({name,tab,homeWordTop,actual:geometry.wordTop}));
     assert.ok(Math.abs(geometry.kicker.top-homeKicker.top)<=1,'Ritual caption moved between tabs '+JSON.stringify({name,tab,homeKicker,actual:geometry.kicker}));
     for(const key of ['height','font','letterSpacing','color'])assert.equal(geometry.kicker[key],homeKicker[key],'Ritual caption typography differs on '+name+'/'+tab+': '+key);
     assert.ok(Math.abs(geometry.title.top-homeTitle.top)<=1,'Primary title moved between tabs '+JSON.stringify({name,tab,homeTitle,actual:geometry.title}));
     for(const key of ['height','font','letterSpacing','color'])assert.equal(geometry.title[key],homeTitle[key],'Primary title typography differs on '+name+'/'+tab+': '+key);
    }
    assert.ok(geometry.scrollWidth<=width+1,'horizontal overflow');
    assert.ok(geometry.documentHeight<=height+2&&geometry.mainScroll<=geometry.mainClient+2,'primary page scrolls '+JSON.stringify({name,tab,...geometry}));
    assert.ok(geometry.navBottom<=height+1&&geometry.navTop>=0,'navigation outside viewport');
    assert.deepEqual(geometry.controlsOutside,[],'A visible control is clipped or covered by navigation');
    if(geometry.giftGap!==null)assert.ok(geometry.giftGap>=6,'Gift card border touches or extends behind navigation: '+JSON.stringify({name,gap:geometry.giftGap}));
    if(width<768){
     const navHeight=geometry.navBottom-geometry.navTop;
     if(tab==='home')mobileNavHeight=navHeight;
     else assert.ok(Math.abs(navHeight-mobileNavHeight)<1,'bottom navigation height differs between tabs');
    }
    assert.equal(await page.locator('.nav button').count(),5);
    if(tab==='home'){
     assert.equal(await page.locator('.ritual-brand').count(),1);
     assert.equal(await page.locator('.home-weights button').count(),0);
     assert.equal(await page.locator('.home-weight').count(),6);
     assert.deepEqual(geometry.stats,['0','0 / 0','—','0']);
     const panels=await page.locator('.home-panel').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
     assert.equal(panels.length,2);
     assert.ok(Math.abs(panels[0].top-panels[1].top)<=1&&Math.abs(panels[0].bottom-panels[1].bottom)<=1&&panels[0].right<panels[1].left,'Home columns are not aligned');
     assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.home-stat-card')].every(card=>{
      const box=card.getBoundingClientRect();return [...card.querySelectorAll('strong,span,small')].every(text=>{const r=text.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});
     })),'Statistic text is outside its row');
     assert.ok(geometry.dice[0].width>=(height<=860?160:175),'weekly die too small');
     if(name.startsWith('S25'))assert.ok(await page.evaluate(()=>document.querySelector('.home-stats-grid').getBoundingClientRect().bottom<=document.querySelector('.nav').getBoundingClientRect().top+2),'Home stats under bottom navigation '+JSON.stringify(geometry));
     await page.locator('.home-next-month').click();await page.locator('.surprise-premium-view').waitFor();
     await page.locator('.nav [data-action="tab:home"]').click();
    }
    if(tab==='session'){
     const c=page.locator('.evening-d35-col canvas');await c.waitFor();
     await page.evaluate(()=>{window.__keptDie=document.querySelector('.evening-d35-col canvas')});
     for(const category of ['HASARD','SEXUEL','SENSUEL']){
      await page.locator('[data-action="category:'+category+'"]').click();
      assert.ok(await page.evaluate(()=>window.__keptDie===document.querySelector('.evening-d35-col canvas')),'category replaced D100');
     }
    }
    if(tab==='advent'){
     assert.equal(await page.locator('.advent-box').count(),25);
     assert.ok(await page.evaluate(()=>{
      const h=document.querySelector('.advent-top').getBoundingClientRect(),intro=document.querySelector('.advent-intro').getBoundingClientRect();
      return h.bottom<=intro.top+1 && [...document.querySelector('.advent-top').querySelectorAll('h1,p')].every(e=>e.getBoundingClientRect().bottom<=intro.top+1);
     }),'Advent heading overlaps introduction');
    }
    assert.deepEqual(errors,[],'page errors');
    console.log('RITUAL_TITLE_OK',name,tab,JSON.stringify(geometry.title));
   }catch(error){failures.push(name+'/'+tab+': '+error.message);console.error('DESIGN_VIEW_FAILURE',name,tab,error.message);await page.screenshot({path:'design-captures/'+name+'-'+tab+'-FAIL.png',fullPage:true}).catch(()=>{});}
  }
  if(name==='S25-short'){
   await page.goto('http://127.0.0.1:8765/?boot_case=paired');
   await page.locator('.real-home-shell').waitFor();
   await page.screenshot({path:'design-captures/S25-short-home-unrolled.png'});
   const unrolled=await page.evaluate(()=>({
    last:document.querySelector('.home-stats-grid').getBoundingClientRect().bottom,
    nav:document.querySelector('.nav').getBoundingClientRect().top,
    title:document.querySelector('.home-ritual h2').textContent,
    dice:document.querySelector('.home-die-platform canvas')?.dataset.face
   }));
   report.push({name:'S25-short',tab:'home-unrolled',...unrolled});
   assert.equal(unrolled.title,'Cette semaine, on joue ?');
   if(unrolled.last>unrolled.nav+2)failures.push('S25-short/home-unrolled: statistics under navigation '+JSON.stringify(unrolled));
  }
  await page.close();
 }
 }finally{await browser.close();fs.writeFileSync('design-captures/report.json',JSON.stringify({report,failures},null,2))}
 console.log(JSON.stringify({report,failures},null,2));assert.deepEqual(failures,[]);
})().catch(e=>{console.error(e);process.exit(1)});
