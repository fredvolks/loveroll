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
       .every(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>22&&r.left>=-2&&r.right<=innerWidth+2&&r.top>=0&&r.bottom<=last+2;});
     let centered=null;
     const home=root.querySelector('.home-next-month');
     if(home){
      const card=home.getBoundingClientRect(),content=home.querySelector('span:nth-child(2)').getBoundingClientRect();
      const arrow=home.querySelector('.home-gift-icon').getBoundingClientRect();
      const circle=home.querySelector('.home-calendar-icon').getBoundingClientRect();
      centered={textY:Math.abs((card.top+card.bottom)/2-(content.top+content.bottom)/2),
        arrowY:Math.abs((card.top+card.bottom)/2-(arrow.top+arrow.bottom)/2),
        circleY:Math.abs((card.top+card.bottom)/2-(circle.top+circle.bottom)/2)};
     }
     return {width:innerWidth,height:innerHeight,noHorizontalScroll:document.documentElement.scrollWidth<=innerWidth+2,
      noVerticalScroll:document.documentElement.scrollHeight<=innerHeight+2,
      shellFits:rect.bottom<=last+2,visible,tiles:root.querySelectorAll('.eclat-tile').length,centered,
      storyText:!!root.querySelector('.eclat-story-main'),errors:window.__consoleErrors||[]};
    });
    if(!result.noHorizontalScroll||!result.noVerticalScroll||!result.shellFits||!result.visible||
       (mode==='gallery'&&result.tiles!==12)||(mode==='home'&&
        Object.values(result.centered||{}).some(x=>x>3)))
      throw Error(JSON.stringify({viewport,mode,...result}));
    console.log('ECLAT_LAYOUT_OK',viewport.width+'x'+viewport.height,mode);
    await page.close();
   }
  }
 }finally{await browser.close();}
})().catch(err=>{console.error('ECLAT_VISUAL_FAILED',err);process.exit(1);});
