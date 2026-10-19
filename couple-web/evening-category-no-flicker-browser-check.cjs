// True browser regression: switching category must not recreate a live D100 canvas.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin='http://127.0.0.1:8765';
(async()=>{
 const {premiumEveningHtml}=await import('./premium-evening.mjs');
 const css=[...fs.readFileSync('couple-web/index.html','utf8').matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)]
   .map(x=>'<link rel="stylesheet" href="'+origin+'/'+x[1]+'">').join('');
 const users=[{user_id:'one',name:'Fred'},{user_id:'two',name:'Partenaire'}];
 const html=premiumEveningHtml({session:{id:'one'},members:users,me:'one',
  rolls:[{user_id:'one',face:2},{user_id:'two',face:5}],
  status:{my_rolled:true,partner_rolled:true,both_ready:true},
  turn:{ready:true,next:'one',remaining:{one:2,two:5},
   completed:{one:0,two:0},targets:{one:2,two:5}},
  category:'SENSUEL'});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,640],[393,852],[820,1180],[1180,820],[1440,900]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.route(origin+'/category-only-test.html',route=>route.fulfill({
    contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+css+
    '</head><body><main id="app" class="loveroll-evening-page loveroll-editorial">'+html+'</main></body></html>'
   }));
   await page.goto(origin+'/category-only-test.html',{waitUntil:'load'});
   const result=await page.evaluate(async()=>{
    const {updateEveningCategoryUi}=await import('/premium-evening.mjs');
    const root=document.querySelector('#app');
    const initialDice=[...root.querySelectorAll('canvas[data-dice-sides]')];
    const d35=root.querySelector('canvas[data-dice-sides="100"]');
    d35.dataset.webglReady='true'; // Represents a mounted, rendered live WebGL canvas.
    let removals=0;
    const watcher=new MutationObserver(records=>{
     for(const record of records)for(const node of record.removedNodes)
      if(node===d35||node.contains?.(d35))removals++;
    });
    watcher.observe(root,{subtree:true,childList:true});
    let valid=true;
    for(const category of ['HASARD','SEXUEL','SENSUEL','HASARD','SEXUEL']){
     if(!updateEveningCategoryUi(root,category))valid=false;
     const selected=root.querySelectorAll('.evening-choice-btn.selected');
     if(selected.length!==1||selected[0].dataset.action!=='category:'+category)valid=false;
     const odds=[...root.querySelectorAll('.evening-choice-odds')];
     if(odds.length===(category==='HASARD'?0:1)===false)valid=false;
     if(category!=='HASARD'&&odds[0]?.textContent!=='88 % de chancesd’avoir cette catégorie')valid=false;
     if(root.querySelector('button[data-action="new-challenge"]')?.disabled)valid=false;
     if(root.querySelector('canvas[data-dice-sides="100"]')!==d35||
       initialDice.some(canvas=>!canvas.isConnected))valid=false;
    }
    await new Promise(resolve=>requestAnimationFrame(resolve));
    watcher.disconnect();
    return {valid,removals,canvasStillMounted:d35.isConnected,
     hasLiveRendererMark:d35.dataset.webglReady==='true'};
   });
   assert.ok(result.valid&&result.removals===0&&result.canvasStillMounted&&result.hasLiveRendererMark,
    'Category switching remounted 3D dice '+JSON.stringify({width,height,result}));
   console.log('CATEGORY_DICE_PERSIST_OK',width,height);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
