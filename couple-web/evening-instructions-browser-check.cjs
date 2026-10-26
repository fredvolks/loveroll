const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');

const origin='http://127.0.0.1:8765';
(async()=>{
 const index=fs.readFileSync('couple-web/index.html','utf8');
 const styles=[...index.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
  .map(x=>'<link rel="stylesheet" href="'+origin+'/'+x[1]+'">').join('');
 const longText=Array.from({length:28},(_,i)=>
  'Étape '+(i+1)+' : prenez le temps de lire la consigne ensemble, sans précipitation, '+
  'et adaptez le rythme à ce qui vous convient à tous les deux.').join(' ');
 const markup='<main id="app" class="loveroll-evening-page loveroll-editorial">'+
  '<div class="surprise-modal evening-queue-modal is-detail" role="dialog" aria-modal="true">'+
  '<article class="surprise-modal-content evening-queue-content is-detail">'+
  '<div class="eyebrow">♡ MES DÉFIS DU SOIR</div>'+
  '<div class="evening-queue-nav"><button>← Mes défis</button><button>✕ Fermer</button></div>'+
  '<div class="evening-queue-detail">'+
  '<div class="evening-challenge-badge">♥ SENSUEL · Résultat : 20 · En cours</div>'+
  '<h2>Notre défi à deux</h2><div class="evening-challenge-scene" aria-hidden="true"></div>'+
  '<p class="evening-challenge-instructions" role="region" aria-label="Consigne du défi" tabindex="0">'+longText+'</p>'+
  '<div class="timer-panel"><div class="eyebrow">⏱ MINUTEUR</div><div class="timer-clock">04:00</div>'+
  '<div class="actions"><button>Démarrer</button><button>Recommencer</button></div></div>'+
  '<button class="evening-primary">✓ Défi réalisé</button>'+
  '<button class="subtle">Passer ce défi</button>'+
  '<div class="evening-queue-nav"><span></span><button>Suivant →</button></div>'+
  '</div></article></div></main>';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,640],[393,720],[412,824]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});
   await page.route(origin+'/__long-challenge.html',route=>route.fulfill({contentType:'text/html',
    body:'<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
     '<meta name="viewport" content="width=device-width,initial-scale=1">'+styles+
     '</head><body>'+markup+'</body></html>'}));
   await page.goto(origin+'/__long-challenge.html',{waitUntil:'load'});
   const metrics=await page.evaluate(()=>{
    const description=document.querySelector('.evening-challenge-instructions');
    const card=document.querySelector('.evening-queue-content.is-detail');
    const action=document.querySelector('.evening-queue-detail>.evening-primary');
    const nav=document.querySelector('.evening-queue-detail>.evening-queue-nav:last-child');
    const r=description.getBoundingClientRect(),outer=card.getBoundingClientRect();
    const result={visible:r.height>18,width:r.width,scrollHeight:description.scrollHeight,
      clientHeight:description.clientHeight,overflow:getComputedStyle(description).overflowY,
      keyboard:description.tabIndex===0,aria:description.getAttribute('aria-label'),
      buttonVisible:action.getBoundingClientRect().height>22,
      articleBottom:outer.bottom,screenHeight:innerHeight};
    description.scrollTop=description.scrollHeight;
    result.canReadToEnd=description.scrollTop>15;
    // For a long modal, the last action may require scrolling the secondary
    // panel. It must still be reachable, not necessarily visible at first paint.
    card.scrollTop=card.scrollHeight;
    const after=nav.getBoundingClientRect();
    result.nextInside=after.bottom<=outer.bottom+2&&after.top>=outer.top-2;
    result.cardScrollable=card.scrollHeight>card.clientHeight+2;
    return result;
   });
   assert.equal(metrics.overflow,'auto',JSON.stringify({width,height,metrics}));
   assert.ok(metrics.visible&&metrics.width>100&&metrics.keyboard&&metrics.aria==='Consigne du défi',
    'Instructions must be visible and reachable: '+JSON.stringify({width,height,metrics}));
   assert.ok(metrics.scrollHeight>metrics.clientHeight+20&&metrics.canReadToEnd,
    'Long instructions must be scrollable to the last word: '+JSON.stringify({width,height,metrics}));
   assert.ok(metrics.buttonVisible&&metrics.nextInside,
    'Actions must remain reachable when the secondary modal scrolls: '+JSON.stringify({width,height,metrics}));
   console.log('LR012_INSTRUCTIONS_READABLE',width,height,JSON.stringify(metrics));
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
