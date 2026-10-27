const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:412,height:824},{width:360,height:700},{width:393,height:780},{width:820,height:1180},{width:1180,height:820}]){
   for(const mode of ['gallery','locked','detail','stage','waiting','reveal','home']){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    await page.goto('http://127.0.0.1:8765/__eclat-screen-test.html?mode='+mode,{waitUntil:'load'});
    await page.waitForFunction(()=>window.__fixtureReady===true,{timeout:15000});
    const result=await page.evaluate(()=>{
     const root=document.querySelector('#app'),shell=root.querySelector('.eclat-shell')||root.querySelector('.real-home-shell');
     const nav=document.querySelector('.nav');
     const last=nav.getBoundingClientRect().top;
     const rect=shell.getBoundingClientRect();
     const visible=[...root.querySelectorAll('.eclat-tile,.eclat-choice,.eclat-primary,.home-next-month')]
       .filter(el=>!el.hasAttribute('disabled'))
       .every(el=>{const r=el.getBoundingClientRect();
        // Éclat's approved discovery view scrolls its twelve coffrets inside the gallery.
        // Offscreen cards must remain correctly sized and horizontally contained;
        // their actual vertical reachability is checked below by scrolling each one.
        const grid=mode==='gallery'&&el.matches('.eclat-tile')?el.closest('.eclat-photo-grid'):null;
        if(grid&&grid.scrollHeight>grid.clientHeight+2){const b=grid.getBoundingClientRect();return r.width>0&&r.height>22&&r.left>=b.left-2&&r.right<=b.right+2;}
        return r.width>0&&r.height>22&&r.left>=-2&&r.right<=innerWidth+2&&r.top>=0&&r.bottom<=last+2;});
     let centered=null;
     const home=root.querySelector('.home-next-month');
     if(home){
      const card=home.getBoundingClientRect(),content=home.querySelector('span:nth-child(2)').getBoundingClientRect();
      const arrow=home.querySelector('.home-gift-icon').getBoundingClientRect();
      const circle=home.querySelector('.home-calendar-icon').getBoundingClientRect();
      const centerX=r=>(r.left+r.right)/2,centerY=r=>(r.top+r.bottom)/2;
      const stats=[...root.querySelectorAll('.home-stat-card')];
      const statAxes=stats.flatMap(row=>{
       const r=row.getBoundingClientRect();
       const text=[...row.querySelectorAll('strong,span,small')];
       const icon=row.querySelector('i')?.getBoundingClientRect();
       const common=text.map(el=>Math.abs(centerX(el.getBoundingClientRect())-centerX(r)));
       return [...common,icon?Math.abs(centerY(icon)-centerY(r)):100];
      });
      const arrowSvg=home.querySelector('.home-gift-icon svg')?.getBoundingClientRect();
      centered={textY:Math.abs(centerY(card)-centerY(content)),
        arrowY:Math.abs(centerY(card)-centerY(arrow)),
        circleY:Math.abs(centerY(card)-centerY(circle)),
        arrowSvgX:Math.abs(centerX(arrow)-centerX(arrowSvg)),
        arrowSvgY:Math.abs(centerY(arrow)-centerY(arrowSvg)),
        statisticsMaxError:Math.max(...statAxes),
        textX:Math.abs(centerX(content)-(centerX(circle)+centerX(arrow))/2)};
     }
     const images=[...root.querySelectorAll('.eclat-tile-photo')];
     const photoGrid=root.querySelector('.eclat-photo-grid');
     const imageOK=images.length===12&&images.every(el=>{
       const styles=getComputedStyle(el);
       return styles.backgroundImage.includes('eclat-photo-strip-v183.webp')&&el.getBoundingClientRect().height>25;
     });
     const gridCols=photoGrid?getComputedStyle(photoGrid).gridTemplateColumns.trim().split(/\s+/).length:0;
     const photoLoaded=images.length?performance.getEntriesByType('resource').some(x=>x.name.includes('eclat-photo-strip-v183.webp')):true;
     return {photoGridCols:gridCols,imageOK,photoLoaded,width:innerWidth,height:innerHeight,noHorizontalScroll:document.documentElement.scrollWidth<=innerWidth+2,
      noVerticalScroll:document.documentElement.scrollHeight<=innerHeight+2,
      shellFits:rect.bottom<=last+2,visible,tiles:root.querySelectorAll('.eclat-tile').length,centered,
      storyText:!!root.querySelector('.eclat-story-main'),errors:window.__consoleErrors||[]};
    });
    // Check every gallery card is genuinely reachable, not merely present in the DOM.
    // This preserves the full 12-card visual check after the gallery gained internal scrolling.
    let galleryReachable=true;
    if(mode==='gallery')galleryReachable=await page.locator('.eclat-photo-grid').evaluate(grid=>{
     const cards=[...grid.querySelectorAll('.eclat-tile')];
     if(cards.length!==12)return false;
     for(const card of cards){
      card.scrollIntoView({block:'nearest',inline:'nearest'});
      const r=card.getBoundingClientRect(),b=grid.getBoundingClientRect();
      if(r.width<=0||r.height<=22||r.top<b.top-2||r.bottom>b.bottom+2||r.left<b.left-2||r.right>b.right+2)return false;
     }
     return true;
    });
    if(!result.noHorizontalScroll||!result.noVerticalScroll||(mode!=='home'&&!result.shellFits)||!result.visible||
       (mode==='gallery'&&(!galleryReachable||result.tiles!==12||result.photoGridCols!==2||!result.imageOK))||(mode==='home'&&
        Object.values(result.centered||{}).some(x=>x>3)))
      throw Error(JSON.stringify({viewport,mode,...result}));
    console.log('ECLAT_LAYOUT_OK',viewport.width+'x'+viewport.height,mode);
    await page.close();
   }
  }
 }finally{await browser.close();}
})().catch(err=>{console.error('ECLAT_VISUAL_FAILED',err);process.exit(1);});
