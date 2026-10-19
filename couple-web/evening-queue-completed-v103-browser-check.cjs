// Actual browser computed-style test of completed challenge cards.
const {chromium}=require('playwright');
(async()=>{
 const base='http://127.0.0.1:8765';
 const documentHtml=await (await fetch(base+'/index.html')).text();
 const links=[...documentHtml.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
  .map(m=>'<link rel="stylesheet" href="'+base+'/'+m[1]+'">').join('');
 const markup='<main id="app" class="loveroll-evening-page loveroll-editorial">'+
  '<div class="evening-queue-modal"><article class="evening-queue-content">'+
  '<div class="evening-queue-list">'+
  '<button type="button" class="evening-queue-item" data-action="evening-open:pending">'+
  '<span class="evening-queue-num">1</span>'+
  '<span class="evening-queue-entry"><strong>Massage à faire</strong><small>Sensuel · À commencer</small></span><span>›</span></button>'+
  '<button type="button" class="evening-queue-item is-completed" data-action="evening-open:done">'+
  '<span class="evening-queue-num">2</span>'+
  '<span class="evening-queue-entry"><strong>Tenue secrète</strong><small>Sexuel · ✓ Terminé</small></span><span>›</span></button>'+
  '</div></article></div></main>';
 const browser=await chromium.launch({headless:true});
 try{
  for(const [width,height] of [[360,700],[412,824],[1180,820]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.route(base+'/__completed-style.html',route=>route.fulfill({
    contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
     '<meta name="viewport" content="width=device-width,initial-scale=1">'+links+
     '</head><body>'+markup+'</body></html>'
   }));
   await page.goto(base+'/__completed-style.html',{waitUntil:'load'});
   const state=await page.evaluate(()=>{
    const pending=document.querySelector('[data-action="evening-open:pending"]');
    const done=document.querySelector('[data-action="evening-open:done"]');
    return {pendingBackground:getComputedStyle(pending).backgroundImage,
     doneBackground:getComputedStyle(done).backgroundImage,
     completedColor:getComputedStyle(done).color,completedFilter:getComputedStyle(done).filter,completedOpacity:Number(getComputedStyle(done).opacity),
     pendingColor:getComputedStyle(pending).color,
     completedAccessible:!done.disabled&&done.tagName==='BUTTON',
     completedText:done.textContent,cardCount:document.querySelectorAll('.evening-queue-item').length};
   });
   if(state.cardCount!==2||!state.completedAccessible||
      !state.completedText.includes('✓ Terminé')||
      state.completedOpacity>=1||!state.completedFilter.includes('grayscale(1)'))
    throw Error('Completed challenge not gray and clickable '+JSON.stringify({width,height,state}));
   console.log('LOVE_COMPLETED_GREY_OK',width,height,JSON.stringify(state));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('LOVE_COMPLETED_GREY_FAIL',e.stack||e);process.exit(1)});
