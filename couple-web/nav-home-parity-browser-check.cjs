const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const {premiumHomeHtml}=await import('./premium-home.mjs');
 const {premiumEveningHtml}=await import('./premium-evening.mjs');
 const {eclatHtml}=await import('./eclat-ui.mjs');
 const people=[{user_id:'one',name:'Fred'},{user_id:'two',name:'Émilie'}];
 const source=fs.readFileSync('couple-web/index.html','utf8');
 const links=[...source.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
   .map(m=>'<link rel="stylesheet" href="http://127.0.0.1:8765/'+m[1]+'">').join('');
 const buttons=(active)=>['Accueil','Soirée','Surprise','Avent','Réglages'].map((label,i)=>
  '<button class="'+(i===active?'active':'')+'"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10L12 3l9 7v10H3z"/></svg></span>'+label+'</button>').join('');
 const cases={
  home:['loveroll-real-home',premiumHomeHtml({members:people,monthly:{monthly_activity:{face:12}}}),0],
  evening:['loveroll-evening-page loveroll-editorial',premiumEveningHtml({members:people,me:'one',weeklyCount:0,weeklyLimit:1,weeklyReady:false}),1],
  eclat:['loveroll-eclat-page',eclatHtml({status:{access:true,active:false}}),1]
 };
 const browser=await chromium.launch({headless:true});
 try{
  for(const [width,height] of [[360,640],[360,700],[393,852],[412,824],[820,1180],[1180,820]]){
   const metrics={};
   for(const [mode,[cls,body,active]] of Object.entries(cases)){
    const page=await browser.newPage({viewport:{width,height}});
    const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+links+'</head><body><main id="app" class="'+cls+'">'+body+'<nav class="nav"><div class="nav-inner" style="grid-template-columns:repeat(5,minmax(0,1fr))">'+buttons(active)+'</div></nav></main></body></html>';
    await page.setContent(html,{waitUntil:'load'});
    // Allow shared 160ms background/border transitions to fully settle before
    // comparing visual colors. Transient intermediate RGBA alpha is not a mismatch.
    await page.waitForTimeout(400);
    metrics[mode]=await page.evaluate(()=>{
     const nav=document.querySelector('.nav'),inner=nav.querySelector('.nav-inner'),b=nav.querySelector('button'),selected=nav.querySelector('button.active');
     const rect=e=>{let r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,width:r.width,height:r.height};};
     const look=e=>{let c=getComputedStyle(e);return {padding:c.padding,background:c.backgroundColor,bgImage:c.backgroundImage,border:c.borderTopWidth+' '+c.borderTopColor,radius:c.borderRadius,font:c.fontSize,weight:c.fontWeight,display:c.display,shadow:c.boxShadow};};
     return {nav:rect(nav),inner:rect(inner),button:rect(b),active:rect(selected),svg:rect(selected.querySelector('svg')),
       navCss:look(nav),buttonCss:look(b),activeCss:look(selected),
       overflow:document.documentElement.scrollWidth>innerWidth+2};
    });
    await page.close();
   }
   const base=metrics.home;
   for(const mode of ['evening','eclat']){
    const v=metrics[mode];
    for(const area of ['nav','inner','button','active','svg']){
     for(const prop of (['active','svg'].includes(area)?['top','width','height']:['top','left','width','height'])){
      // The selected tab moves from Accueil (column 1) to Soirée (column 2).
      const n=Math.abs(v[area][prop]-base[area][prop]);
      if(n>1.5)throw Error('NAV_NOT_SAME_AS_HOME '+JSON.stringify({width,height,mode,area,prop,diff:n,home:base[area],other:v[area]}));
     }
    }
    for(const [kind,props] of [['navCss',['padding','background','bgImage','border','radius']],['buttonCss',['padding','font','weight','display']],['activeCss',['background','bgImage','border','radius','shadow']]]){
     for(const prop of props){
      if(v[kind][prop]!==base[kind][prop])
       throw Error('NAV_STYLE_DIFF '+JSON.stringify({width,height,mode,kind,prop,home:base[kind][prop],other:v[kind][prop]}));
     }
    }
    if(v.overflow)throw Error('NAV_HORIZONTAL_OVERFLOW '+mode+' '+width);
   }
   console.log('NAV_EXACT_HOME_OK',width+'x'+height);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
