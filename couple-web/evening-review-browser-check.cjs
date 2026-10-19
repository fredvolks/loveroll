// v96 – visible modal at several real phone/tablet/desktop viewport sizes.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const origin='http://127.0.0.1:8765';
(async()=>{
 const {eveningReviewModal}=await import('./evening-review.mjs');
 const {eveningHistoryMarkup}=await import('./evening-calendar.mjs');
 const html=fs.readFileSync('couple-web/index.html','utf8');
 const styles=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
   .map(x=>'<link rel="stylesheet" href="'+origin+'/'+x[1]+'">').join('');
 const modal=eveningReviewModal({
  sessionId:'testing',draft:{overall:4,connection:5,appreciation:3,again:4,comment:'Très belle soirée !'},
  partnerName:'Émilie'
 });
 const archive=eveningHistoryMarkup({
  sessions:[{id:'testing',started_at:'2026-10-16T17:00:00Z',finished_at:'2026-10-16T22:00:00Z',counted:true}],
  month:'2026-10',selectedDate:'2026-10-16',stats:[],historyChallenges:[],
  members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],me:'a',
  reviews:[{session_id:'testing',author_id:'a',overall:4,connection:5,
   appreciation:3,again:4,comment:'Très belle soirée !'},
   {session_id:'testing',author_id:'b',overall:5,connection:4,
    appreciation:4,again:5,comment:'Merci pour ce beau moment'}]});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,640],[393,852],[412,915],[820,1180],[1180,820],[1440,900]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.route(origin+'/review-visual-test.html',r=>r.fulfill({contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+
    '</head><body><main id="app">'+archive+'</main>'+modal+'</body></html>'}));
   await page.goto(origin+'/review-visual-test.html',{waitUntil:'load'});
   assert.equal(await page.locator('.lr-review-question').count(),4);
   assert.equal(await page.locator('.lr-review-heart').count(),20);
   assert.equal(await page.locator('details.evening-cal-person-group').count(),2);
   assert.equal(await page.locator('.evening-review-person').count(),2);
   const nested=await page.evaluate(()=>{
    const sections=[...document.querySelectorAll('details.evening-cal-person-group')];
    const a=sections[0]?.querySelector('.evening-review-person')?.textContent||'';
    const b=sections[1]?.querySelector('.evening-review-person')?.textContent||'';
    return {count:sections.length,firstId:sections[0]?.dataset.personId,secondId:sections[1]?.dataset.personId,
     first:a,second:b,oldArchive:!!document.querySelector('.evening-review-archive'),
     valid:sections.length===2&&a.includes('Très belle soirée')&&!a.includes('Merci pour ce beau moment')&&
      b.includes('Merci pour ce beau moment')&&!b.includes('Très belle soirée')&&
      !document.querySelector('.evening-review-archive')};
   });
   assert.ok(nested.valid,'Partner feedback must be contained in the correct accordion '+JSON.stringify(nested));
   assert.ok(await page.locator('.lr-review-modal .lr-review-question').nth(2).isVisible());
   const fit=await page.evaluate(()=>{
    const modal=document.querySelector('.lr-review-modal');
    const rect=modal.getBoundingClientRect(),backdrop=modal.parentNode.getBoundingClientRect();
    const save=modal.querySelector('.lr-review-save');
    const before=modal.scrollTop;save.scrollIntoView({block:'end',behavior:'instant'});
    const action=save.getBoundingClientRect();
    return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
     left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
     scrollHeight:modal.scrollHeight,clientHeight:modal.clientHeight,
     savedVisible:action.bottom<=innerHeight+3&&action.top>=-3,
     backdropHeight:backdrop.height,scrollable:modal.scrollHeight>=modal.clientHeight};
   });
   assert.ok(fit.left>=-2&&fit.right<=width+2&&fit.top>=-2&&fit.bottom<=height+2&&
      fit.documentWidth<=width+3&&fit.savedVisible,
      'Review modal overflows or CTA unreachable '+JSON.stringify({width,height,fit}));
   console.log('EVENING_HEARTS_MODAL_OK',width,height);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
