// Desktop/tablet single-screen and large original WebGL dice check.
// Run after: python3 -m http.server 8765 --directory couple-web
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const [name,w,h] of [
   ['PC-1080',1920,1080],['PC-768',1366,768],
   ['Laptop-650',1280,650],['iPad-Portrait',820,1180],
   ['iPad-Landscape',1180,820]]){
   for(const view of ['surprise','surprise-ready']){
    const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
    const issues=[];page.on('pageerror',e=>issues.push(e.message));
    await page.goto('http://127.0.0.1:8765/__premium-couple-pages-test.html?page='+view,
     {waitUntil:'load'});
    await page.waitForTimeout(250);
    const size=await page.evaluate(()=>{
     const root=document.querySelector('main#app');
     const panel=root.querySelector('.surprise-premium-view,.evening-premium-view');
     const nav=document.querySelector('nav.nav');
     const rect=e=>{const r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,
      right:r.right,width:r.width,height:r.height}:null};
     const d6=[...document.querySelectorAll('.evening-summary-die .love3d-stage')]
       .map(rect);
     const host=document.querySelector('.surprise-host');
     const month=document.querySelector('.surprise-month');
     const gallery=document.querySelector('.surprise-gallery');
     const special=document.querySelector('.surprise-special');
     const events=[...document.querySelectorAll('.surprise-event-card')].map(rect);
     return {viewport:{w:innerWidth,h:innerHeight},docH:document.documentElement.scrollHeight,
      bodyH:document.body.scrollHeight,rootH:root.scrollHeight,panelH:panel.scrollHeight,
      panel:rect(panel),nav:rect(nav),gallery:rect(gallery),month:rect(month),host:rect(host),special:rect(special),
      controls:[...document.querySelectorAll('.surprise-month>.surprise-primary')].map(rect),
      events,d6,d6Mine:rect(document.querySelector('.evening-my-die .love3d-stage')),
      d6Partner:rect(document.querySelector('.evening-partner-die .love3d-stage')),
      d20:rect(document.querySelector('.surprise-d20-scene')),
      d35:rect(document.querySelector('.evening-d35-col .love3d-stage')),
      gift:rect(document.querySelector('.evening-gift'))};
    });
    assert.deepEqual(issues,[],name+' '+view+' JS errors');
    assert.ok(size.docH>=h-3&&size.panel.top>=0&&size.nav.bottom<=h+2,
      'Desktop layout or navigation outside viewport '+name+' '+view+' '+JSON.stringify(size));
    if(view.startsWith('surprise')){
     assert.equal(size.events.length,6,name+' missing events');
     for(const event of size.events)assert.ok(event.height>=20,
       'Clipped event '+name+' '+JSON.stringify(size));
     assert.equal(size.host,null,'Old separate Qui invite card must be gone');
     if(view==='surprise-ready')
       assert.ok(size.d20?.height>50,'Monthly activity D20 remains visible with inline invite '+name);
     // The photograph and controls now occupy separate slots of one gallery.
     for(const key of ['gallery','special'])assert.ok(size[key]?.height>75&&
       size[key].bottom<=size.docH+2,'Section clipped '+key+' '+name+' '+JSON.stringify(size));
     assert.ok(size.d20?.height>50,'D20 missing '+name+' '+JSON.stringify(size));
     assert.ok(size.d20.bottom<=size.nav.top+2,'Photo overlaps navigation '+name);
     assert.equal(size.controls.length,1,'Monthly action missing '+name);
     for(const control of size.controls)assert.ok(control.height>=40&&control.top>=size.panel.top&&control.bottom<=size.nav.top+2,
       'Monthly action clipped '+name+' '+JSON.stringify(size));
    }else if(view==='evening'){
     assert.equal(size.d6.length,2,'Need both official D6 dice in step 1 '+name);
     for(const die of size.d6)assert.ok(die.width>=90&&die.height>=90,
      'Confirmed desktop D6 too small '+name+' '+JSON.stringify(size));
     assert.ok(size.d35?.height>=80&&size.gift?.bottom<=size.docH+2,
      'D35 or gift clipped '+name+' '+JSON.stringify(size));
    }else{
     assert.ok(size.d6Mine?.width>=90,'Own desktop D6 too small '+name+' '+JSON.stringify(size));
    }
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    const last=await page.evaluate(kind=>{
     const element=document.querySelector(kind.startsWith('surprise')?'.surprise-event-card:last-child':
      '.evening-gift,.evening-empty');
     const nav=document.querySelector('.nav').getBoundingClientRect();
     return {bottom:element?.getBoundingClientRect().bottom,navTop:nav.top};
    },view);
    assert.ok(last.bottom<=last.navTop+2,
      'Last action unreachable above fixed navigation '+name+' '+view+' '+JSON.stringify({size,last}));
    console.log('SURPRISE_DESKTOP_V86_OK',name,view);
    await page.close();
   }
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
