const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:360,height:700},{width:393,height:780},{width:412,height:824},{width:820,height:1180}]){
   const values=[];
   for(const mode of ['evening','eclat']){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    await page.goto('http://127.0.0.1:8765/__eclat-parity-test.html?mode='+mode,{waitUntil:'load'});
    await page.waitForFunction(()=>window.__fixtureReady===true);
    const v=await page.evaluate(()=>{
     const box=selector=>{
      const e=document.querySelector(selector);if(!e)return null;
      const r=e.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height,bottom:r.bottom};
     };
     return {
      heading:box('.ritual-heading'),caption:box('.ritual-kicker'),
      title:box('.ritual-page-title'),switcher:box('.ritual-mode-switcher'),
      menu:box('.nav'),menuActive:box('.nav .active'),
      screenWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth
     };
    });
    if(Object.entries(v).some(([k,b])=>k!=='screenWidth'&&k!=='viewportWidth'&&(!b||!Number.isFinite(b.top))) ||
       v.screenWidth>v.viewportWidth+2)throw Error(JSON.stringify({viewport,mode,v}));
    values.push(v);await page.close();
   }
   const [a,b]=values;
   const diff=(k,prop)=>Math.abs(a[k][prop]-b[k][prop]);
   for(const k of ['heading','caption','title','switcher','menu','menuActive']){
    for(const prop of ['top','height']){
     const delta=diff(k,prop);
     if(delta>2)throw Error('SOIREE_ECLAT_PARITY_FAILED '+JSON.stringify({viewport,element:k,property:prop,delta,evening:a[k],eclat:b[k]}));
    }
   }
   if(diff('switcher','left')>3||diff('switcher','width')>3)
    throw Error('The premium switcher must also align horizontally '+JSON.stringify({viewport,a:a.switcher,b:b.switcher}));
   console.log('LOVE_LAYOUT_PARITY_OK',viewport.width+'x'+viewport.height);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error('LOVE_LAYOUT_PARITY_FAILED',error);process.exit(1);});
