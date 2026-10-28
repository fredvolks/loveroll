// Playwright VISUAL layout fixture only. This does not impersonate customers,
// produce cards, or claim actual authenticated gameplay acceptance.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 fs.mkdirSync('studio-visual-captures',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const preset of [
   {name:'PC-1440',width:1440,height:900,visibleSeats:2},
   {name:'iPad-landscape',width:1180,height:820,visibleSeats:2},
   {name:'iPad-portrait',width:820,height:1180,visibleSeats:1},
   {name:'mobile-emergency',width:390,height:844,visibleSeats:1}
  ]){
   const page=await browser.newPage({
    viewport:{width:preset.width,height:preset.height},
    deviceScaleFactor:1
   });
   // Never attempt an admin login in a layout-only job.
   await page.route('**/platform-admin.js*',route=>route.abort());
   await page.goto('http://127.0.0.1:8765/admin.html',{waitUntil:'load'});
   await page.evaluate(async()=>{
    document.querySelector('#gate').hidden=true;
    document.querySelector('#dashboard').hidden=false;
    document.querySelector('#settings').hidden=true;
    document.querySelector('#studio-real-game').hidden=false;
    document.querySelector('#studio-real-views').hidden=false;
    document.querySelector('#studio-real-audit').hidden=true;
    for(const id of ['studio-real-create','studio-real-refresh',
      'studio-real-check','studio-real-reset','studio-real-delete'])
     document.getElementById(id).hidden=false;
    document.querySelector('#studio-real-progress-count').textContent='7/9';
    const list=document.querySelector('#studio-real-progress-list');
    for(const text of ['Duo de test A+B','Connexion des deux joueurs',
     'D6 hebdomadaire','D100 Surprise','Soirée',
     'D6 du joueur A','D6 du joueur B','Vrai défi','Accès Éclat']){
     const item=document.createElement('li');
     item.textContent=text;
     list.append(item);
    }
    const grid=document.querySelector('#studio-real-eclat-grid');
    const {ECLAT_COFFRETS}=await import(new URL('./eclat-catalog.mjs',location.href).href);
    for(const item of ECLAT_COFFRETS){
     const node=document.createElement('div');
     node.className='studio-real-eclat-coffret';
     node.textContent='Coffret '+item.id+' · '+item.title;
     grid.append(node);
    }
    for(const seat of ['A','B']){
     const host=document.getElementById('studio-real-frame-'+seat);
     // Empty iframe verifies the exact shipped game container size/layout.
     const frame=document.createElement('iframe');
     frame.title='Cadre du vrai jeu '+seat+' (test visuel)';
     frame.src='about:blank';
     host.append(frame);
    }
   });
   const layout=await page.evaluate(()=>{
    const box=selector=>{
     const element=document.querySelector(selector);
     const rect=element.getBoundingClientRect();
     return {width:rect.width,height:rect.height,x:rect.x,y:rect.y,
      visible:getComputedStyle(element).display!=='none'};
    };
    const links=['#studio-real-create','#studio-real-refresh',
     '#studio-real-check','#studio-real-reset','#studio-real-delete'];
    const buttons=links.map(x=>box(x));
    const widths=[document.documentElement.scrollWidth,document.body.scrollWidth];
    return {
     viewport:innerWidth,scrollWidth:Math.max(...widths),
     frames:['#studio-real-frame-A','#studio-real-frame-B'].map(box),
     count:document.querySelectorAll('.studio-real-eclat-coffret').length,
     checklist:document.querySelectorAll('#studio-real-progress-list li').length,
     buttons:buttons.filter(x=>x.visible).map(x=>({w:x.width,h:x.height})),
     guide:box('#studio-real-progress'),eclat:box('#studio-real-eclat-progress')
    };
   });
   assert.ok(layout.scrollWidth<=preset.width+2,
    preset.name+' horizontal scrolling '+JSON.stringify(layout));
   assert.equal(layout.frames.filter(x=>x.visible).length,preset.visibleSeats,
    preset.name+' visible genuine game holders');
   assert.equal(layout.checklist,9);
   assert.equal(layout.count,12);
   assert.ok(layout.guide.width>=260&&layout.eclat.width>=260);
   assert.ok(layout.buttons.every(x=>x.w>=100&&x.h>=32),
    preset.name+' action controls are too small');
   if(preset.visibleSeats===2){
    const [a,b]=layout.frames;
    assert.ok(b.x>a.x+a.width-3,
     preset.name+' real player frames overlap');
   }
   await page.screenshot({path:'studio-visual-captures/'+preset.name+'.png',fullPage:true});
   console.log(preset.name,'Studio layout accepted',JSON.stringify(layout));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
