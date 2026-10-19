// Editorial primary screens must fit the viewport; long cards use separate panels.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const {premiumEveningHtml}=await import('./premium-evening.mjs');
 const origin='http://127.0.0.1:8765/';
 const styles=[...fs.readFileSync('couple-web/index.html','utf8').matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)].map(x=>'<link rel="stylesheet" href="'+origin+x[1]+'">').join('');
 const browser=await chromium.launch({headless:true});
 try{
 for(const [w,h] of [[360,640],[393,852],[412,824],[412,915],[820,1180],[1180,820],[1440,900],[1920,1080]]){
  for(const mode of ['intro','waiting','ready','finished']){
   const ready=mode==='ready',session=['waiting','ready'].includes(mode)?{id:'s1',self_draws:true,paired_turns:true}:null;
   const html=premiumEveningHtml({session,members:[{user_id:'a',name:'Camille'},{user_id:'b',name:'Noémie'}],me:'a',
    status:{both_ready:ready,my_rolled:ready,partner_rolled:ready},rolls:ready?[{user_id:'a',face:2},{user_id:'b',face:5}]:[],
    turn:{ready,next:'a',first:'a',targets:{a:2,b:5},remaining:{a:2,b:5},completed:{a:0,b:0}},category:'SENSUEL',lastD35Face:47,
    weeklyCount:0,weeklyLimit:2,playable:{sensual:100,sexual:100,total:200},
    lastEvening:mode==='finished'?{completed:5,responses:1,myResponse:true,partnerResponse:false}:null});
   const p=await browser.newPage({viewport:{width:w,height:h}});
   await p.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'</head><body><main id="app" class="loveroll-evening-page loveroll-editorial">'+html+'<nav class="nav"><div class="nav-inner">'+['Accueil','Soirée','Surprise','Avent','Réglages'].map(x=>'<button><span>♡</span>'+x+'</button>').join('')+'</div></nav></main></body></html>',{waitUntil:'load'});
   const g=await p.evaluate(()=>{
    const rect=e=>e?.getBoundingClientRect().toJSON();
    const nav=rect(document.querySelector('.nav'));
    const visible=[...document.querySelectorAll('.evening-premium-view button')].filter(e=>e.getBoundingClientRect().height>0);
    const die=document.querySelector('.is-ready .evening-d35-col .love3d-stage,.is-waiting .evening-my-die .love3d-stage');
    const title=document.querySelector('.ritual-page-title'),range=document.createRange();range.selectNodeContents(title);
    return {titleLines:[...range.getClientRects()].filter(r=>r.width>1).length,titleBox:rect(title),titleText:range.getBoundingClientRect().toJSON(),subtitle:document.querySelector('.evening-intro p')?.textContent,
     docH:document.documentElement.scrollHeight,docW:document.documentElement.scrollWidth,rootH:document.querySelector('#app').scrollHeight,
     nav,die:rect(die),buttons:visible.map(e=>({action:e.dataset.action,...rect(e)})),result:document.querySelector('.evening-d100-result')?.textContent};
   });
   assert.ok(g.docH<=h+2&&g.rootH<=h+2&&g.docW<=w+1,'Primary screen scroll '+JSON.stringify({w,h,mode,g}));
   assert.equal(g.titleLines,1,'Primary title must stay on one line');
   assert.ok(g.titleText.left>=g.titleBox.left-1&&g.titleText.right<=g.titleBox.right+1,'Primary title is clipped');
   assert.equal(g.subtitle,undefined);
   for(const b of g.buttons)assert.ok(b.top>=0&&b.bottom<=g.nav.top+2&&b.left>=0&&b.right<=w+1,'Action obscured '+JSON.stringify({w,h,mode,b,g}));
   if(session){assert.ok(g.die.width>=130&&Math.abs(g.die.width-g.die.height)<2,'Die distorted or too small '+JSON.stringify({w,h,mode,g}));}
   if(ready)assert.equal(g.result,'Résultat : 47');
   console.log('EDITORIAL_VIEWPORT_OK',w,h,mode);await p.close();
  }
 }
 // Exercise app.js with separate private and shared history sources. Both
 // accounts must see the same unique progress after a fresh page load.
 for(const [width,height] of [[360,640],[412,824],[1366,768]])for(const actor of ['a','b']){
  const world=createWorld();
  world.challenges=[
   {couple_id:'c',category:'SENSUEL',face:8,status:'completed',recipient:'a'},
   {couple_id:'c',category:'SEXUEL',face:8,status:'accepted',recipient:'a'}
  ];
  world.calendarChallenges=[
   {...world.challenges[0]},
   {category:'SEXUEL',face:8,status:'completed',recipient:'b'},
   {category:'SENSUEL',face:100,status:'completed',recipient:'b'},
   {category:'SENSUEL',face:8,status:'completed',recipient:'b'},
   {category:'SEXUEL',face:99,status:'passed',recipient:'b'}
  ];
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,actor,query:'open=session'});
  try{
   await page.locator('.evening-premium-view.is-inactive').waitFor();
   assert.equal(await page.locator('.evening-intro h2').innerText(),'200 défis à vivre à deux');
   assert.equal(await page.locator('.evening-finale-tiles>div').nth(1).innerText(),'3 / 200\nDéfis complétés');
   assert.deepEqual(errors,[]);
   console.log('EVENING_SHARED_PROGRESS_OK',width,height,actor);
  }finally{await context.close();}
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
