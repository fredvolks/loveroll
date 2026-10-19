// Validate the fixed recipient challenge (not the scrollable list) in Chromium.
const {chromium}=require('playwright');
(async()=>{
 const origin='http://127.0.0.1:8765';
 const html=await (await fetch(origin+'/index.html')).text();
 const css=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
  .map(m=>'<link rel="stylesheet" href="'+origin+'/'+m[1]+'">').join('');
 const modal='<main id="app" class="loveroll-evening-page loveroll-editorial">'+
 '<div class="surprise-modal evening-queue-modal is-detail" role="dialog" aria-modal="true">'+
 '<article class="surprise-modal-content evening-queue-content is-detail">'+
 '<div class="eyebrow">♡ MES DÉFIS DU SOIR</div>'+
 '<div class="evening-queue-nav"><button>← Mes défis (1)</button><button>✕ Fermer</button></div>'+
 '<div class="evening-queue-detail">'+
 '<div class="eyebrow">♥ SENSUEL · DÉ 35 : 20 · À COMMENCER</div>'+
 '<h2>La danse improvisée</h2>'+
 '<p>Lancez une chanson douce, enlacez-vous et dansez lentement ensemble pendant 4 minutes dans le noir ou à la lueur d’une veilleuse.</p>'+
 '<div class="timer-panel"><div class="eyebrow">⏱ MINUTEUR DU DÉFI · 4 MIN</div>'+
 '<div class="timer-clock">04:00</div><p>À votre rythme</p>'+
 '<div class="actions"><button>▶ Démarrer</button><button class="subtle">↻ Recommencer</button></div>'+
 '<div class="chipline"><button class="pill">♫ Son doux</button><button class="pill">〰 Vibration</button></div>'+
 '<small>Sonnerie discrète en fin de compte à rebours; sur iPhone, la vibration peut être indisponible. Le minuteur n’oblige jamais à poursuivre.</small>'+
 '</div><button class="evening-primary">▶ Commencer ce défi</button>'+
 '<button class="subtle">Passer ce défi</button>'+
 '<div class="evening-queue-nav"><span></span><button>Suivant →</button></div>'+
 '</div></article></div></main>';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,640],[393,720],[412,824],[820,1180]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.route(origin+'/__evening-queue-fixed-test.html',r=>r.fulfill({
    contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="fr">'+
     '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+
     '</head><body>'+modal+'</body></html>'
   }));
   await page.goto(origin+'/__evening-queue-fixed-test.html',{waitUntil:'load'});
   const fit=await page.evaluate(()=>{
    const card=document.querySelector('.evening-queue-content.is-detail');
    const detail=document.querySelector('.evening-queue-detail');
    const timer=document.querySelector('.timer-panel');
    const box=card.getBoundingClientRect();
    const buttons=[...card.querySelectorAll('button')];
    buttons.at(-1).scrollIntoView({block:'end',behavior:'instant'});
    const last=buttons.at(-1).getBoundingClientRect();
    const allButtonsFit=last.bottom<=box.bottom+2 && last.left>=box.left-2 && last.right<=box.right+2;
    return {top:box.top,bottom:box.bottom,viewport:innerHeight,
     cardScroll:card.scrollHeight-card.clientHeight,
     detailScroll:detail.scrollHeight-detail.clientHeight,
     timerScroll:timer.scrollHeight-timer.clientHeight,
     overflow:getComputedStyle(card).overflowY,allButtonsFit};
   });
   if(width<768&&(fit.top<0||fit.bottom>height+2||fit.timerScroll>2||fit.overflow!=='auto'||!fit.allButtonsFit))
    throw Error('FIXED_CHALLENGE_OVERFLOWS '+JSON.stringify({width,height,fit}));
   console.log('LOVE_QUEUE_FIXED_OK',width,height,JSON.stringify(fit));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('LOVE_QUEUE_FIXED_FAIL',e.stack||e);process.exit(1)});
