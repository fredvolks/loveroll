const {chromium}=require('playwright');
require('node:fs').mkdirSync('landing-captures',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const device of [{name:'S25-compact',width:412,height:824},{name:'S25-long',width:412,height:915},{name:'iPad-portrait',width:820,height:1180},{name:'iPad-landscape',width:1180,height:820}]){
  for(const scenario of [{name:'december',params:'day=1'},{name:'locked',params:'mode=before'},
                         {name:'opened',params:'day=5&mode=opened'}]){
   const page=await browser.newPage({viewport:{width:device.width,height:device.height},
    isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/__premium-advent-test.html?'+scenario.params,{waitUntil:'load'});
   await page.locator('.advent-premium-view').waitFor();
   const data=await page.evaluate(()=>{
    const frame=document.querySelector('.advent-premium-view');
    const nav=document.querySelector('.nav').getBoundingClientRect();
    const tiles=document.querySelector('.advent-tiles').getBoundingClientRect();
    const grid=[...document.querySelectorAll('.advent-box')],envelopes=[...document.querySelectorAll('.advent-envelope')];
    return {
     documentScroll:document.documentElement.scrollHeight-innerHeight,
     appScroll:document.querySelector('#app').scrollHeight-innerHeight,
     horizontalScroll:document.documentElement.scrollWidth-innerWidth,
     top:Math.round(frame.getBoundingClientRect().top),
     navTop:Math.round(nav.top),gridBottom:Math.round(tiles.bottom),
     tiles:grid.length,available:grid.filter(x=>x.classList.contains('available')).length,
     opened:grid.filter(x=>x.classList.contains('opened')).length,
     minTile:Math.round(Math.min(...grid.map(x=>x.getBoundingClientRect().height))),
     minEnvelope:Math.round(Math.min(...envelopes.map(x=>x.getBoundingClientRect().height))),
     minEnvelopeWidth:Math.round(Math.min(...envelopes.map(x=>x.getBoundingClientRect().width))),
     visibleEnvelopes:envelopes.filter(x=>{const r=x.getBoundingClientRect();return r.height>=44&&r.width>=44;}).length,
     modal:!!document.querySelector('.advent-dialog'),
     nav:document.querySelectorAll('.nav button').length
    };
   });
   console.log(device.name+' '+scenario.name,JSON.stringify(data),errors);
   if(errors.length||data.tiles!==25||data.nav!==5||data.top<0||
    data.documentScroll>2||data.appScroll>2||data.horizontalScroll>2||
    data.gridBottom>data.navTop||data.minTile<44||
    (device.width>=768&&(data.visibleEnvelopes!==25||data.minEnvelope<44||data.minEnvelopeWidth<44))||
    (scenario.name==='december'&&data.available!==1)||
    (scenario.name==='locked'&&data.available!==0)||
    (scenario.name==='opened'&&(data.opened!==1||!data.modal)))
    throw Error('Advent S25 layout invalid: '+device.name+' '+scenario.name);
   await page.screenshot({path:'landing-captures/'+device.name+'-premium-advent-'+scenario.name+'.png'});
   await page.close();
  }
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
