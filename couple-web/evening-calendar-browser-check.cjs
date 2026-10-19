// LoveRoll v91 — expanding both partners' daily challenge lists on real layouts.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const origin='http://127.0.0.1:8765/';
(async()=>{
 const {eveningHistoryMarkup}=await import('./evening-calendar.mjs');
 const index=fs.readFileSync('couple-web/index.html','utf8');
 const styles=[...index.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
  .map(x=>'<link rel="stylesheet" href="'+origin+x[1]+'">').join('');
 const members=[{user_id:'me',name:'Fred'},{user_id:'partner',name:'Émilie'}];
 const day='2026-10-15';
 const session={id:'s1',started_at:'2026-10-16T01:00:00Z',finished_at:'2026-10-16T02:00:00Z',counted:true};
 const markup=eveningHistoryMarkup({sessions:[session],members,
  stats:[{session_id:'s1',user_id:'me',target:3,drawn:2,completed:1},
   {session_id:'s1',user_id:'partner',target:2,drawn:2,completed:1}],
  historyChallenges:[
   {id:'m',session_id:'s1',recipient:'me',face:1,category:'SENSUEL',card_title:'Mon massage',status:'completed'},
   {id:'m2',session_id:'s1',recipient:'me',face:2,category:'SENSUEL',card_title:'Mon défi à faire',status:'proposed'},
   {id:'p',session_id:'s1',recipient:'partner',face:1,category:'SEXUEL',card_title:'Son massage',status:'completed'},
   {id:'p2',session_id:'s1',recipient:'partner',face:2,category:'SENSUEL',card_title:'Son défi non réalisé',status:'accepted'}
  ],me:'me',month:'2026-10',selectedDate:day});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,640],[393,852],[412,915],[820,1180],[1180,820],[1440,900]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.setContent('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+
    '</head><body style="margin:0"><main id="app" class="loveroll-evening-calendar-page loveroll-editorial">'+markup+
    '<nav class="nav"><div class="nav-inner"><button>Soirée</button></div></nav></main></body></html>',{waitUntil:'load'});
   const first=page.locator('details[data-person-id="me"] summary');
   const second=page.locator('details[data-person-id="partner"] summary');
   assert.equal(await page.locator('details[open]').count(),0,'lists start collapsed');
   await first.click();
   assert.equal(await page.locator('details[open]').count(),1,'own list expands');
   assert.ok(await page.getByText('Mon massage',{exact:true}).isVisible());
   await second.click();
   assert.equal(await page.locator('details[open]').count(),2,'partner opens independently');
   assert.ok(await page.getByText('Son massage',{exact:true}).isVisible());
   assert.ok(await page.getByText('Son défi non réalisé',{exact:true}).isVisible());
   const fit=await page.evaluate(()=>{
    const shell=document.querySelector('.evening-calendar-shell').getBoundingClientRect();
    const rows=[...document.querySelectorAll('summary.evening-cal-person')].map(x=>x.getBoundingClientRect());
    return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
     shellLeft:shell.left,shellRight:shell.right,
     inBounds:rows.every(x=>x.left>=-1&&x.right<=innerWidth+2)};
   });
   assert.ok(fit.scrollWidth<=fit.viewport+3&&fit.shellLeft>=-1&&fit.shellRight<=width+2&&fit.inBounds,
    'No horizontal scrolling '+JSON.stringify({width,height,fit}));
   await first.click();
   assert.equal(await page.locator('details[open]').count(),1,'closing mine leaves partner open');
   console.log('EVENING_CALENDAR_OK',width,height);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
