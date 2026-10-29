const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [width,height] of [[320,568],[360,640],[360,740],[393,852],[412,824],[412,915],[430,932]]){
  const started=Date.now();
  let stage='initialize';
  const checkpoint=name=>{
   stage=name;
   console.log('EVENING_D100_CHECKPOINT',width,height,name,Date.now()-started);
  };
  console.log('EVENING_D100_VIEWPORT_START',width,height);
  // Keep the original viewport loop intact: its diagnostic branch uses break.
  // An explicit process exit is intentional: it also stops stalled Playwright calls.
  const heartbeat=setInterval(()=>{
   console.log('D100_VIEWPORT_HEARTBEAT',width,height,'stage='+stage,'elapsed_ms='+(Date.now()-started));
  },30000);
  const watchdog=setTimeout(()=>{
   console.error('D100_VIEWPORT_TIMEOUT',width,height,'stage='+stage,'after 180000ms');
   process.exit(1);
  },180000);
  try{
  const world=createWorld();world.enableEveningD6=world.enableEveningDraw=true;
  world.profiles[0].display_name='Fred';world.profiles[1].display_name='Émilie';
  world.couple.category_preference_percent=height===824?74:88;
  const {nextMonday}=await import('./premium-home.mjs');const monday=new Date(nextMonday()+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-7);
  world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:3,created_at:new Date(Date.now()-120000).toISOString()}];
  world.eveningSessions=[{id:'test-evening',couple_id:'c',started_at:new Date(Date.now()-60000).toISOString(),finished_at:null,paired_turns:true,self_draws:true,starting_user_id:'a'}];
  world.personalRolls=[{id:'d6-a',session_id:'test-evening',user_id:'a',face:2},{id:'d6-b',session_id:'test-evening',user_id:'b',face:3}];
  world.board={ready:true,next:'a',first:'a',remaining:{a:2,b:3},targets:{a:2,b:3},completed:{a:0,b:0},drawn:{a:0,b:0},drawsFinished:false,finished:false};
  checkpoint('create-page');
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home',motion:'no-preference'});
  checkpoint('wait-home-die');
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
  const metrics=()=>page.evaluate(()=>{const b=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,w:r.width,h:r.height,font:c.font};};return {brand:b('.ritual-brand'),title:b('.ritual-page-title'),nav:b('.nav'),info:b('.home-odds-info')};});
  checkpoint('navigate-evening');
  const home=await metrics();await page.locator('.nav [data-action="tab:session"]').click();
  checkpoint('wait-evening-die');
  await page.waitForFunction(()=>document.querySelector('.has-evening-d100-template canvas')?.loveRollDie?.readState().optics.loaded);
  await page.evaluate(()=>document.fonts.ready);
  const evening=await metrics();console.log('D100_METRICS',width,{home,evening});
  if(process.env.LOVEROLL_D100_HEADER_PROBE){
   const debug=await page.evaluate(()=>{
    const selectors=['main#app','.evening-premium-view','.evening-toolbar','.ritual-heading','.ritual-brand','.ritual-kicker','.evening-intro','.ritual-page-title','.evening-d100-theater'];
    return selectors.map(selector=>{
     const node=document.querySelector(selector);
     if(!node)return {selector,missing:true};
     const r=node.getBoundingClientRect(),s=getComputedStyle(node);
     return {selector,top:r.top,bottom:r.bottom,height:r.height,left:r.left,display:s.display,position:s.position,transform:s.transform,marginTop:s.marginTop,paddingTop:s.paddingTop,gridRows:s.gridTemplateRows,alignItems:s.alignItems,justifyContent:s.justifyContent};
    });
   });
   console.log('D100_HEADER_DEBUG',width,JSON.stringify(debug));
   await context.close();
   break;
  }
  assert.deepEqual(evening.brand,home.brand);assert.deepEqual(evening.nav,home.nav);assert.equal(evening.title.font,home.title.font);
  // Compact short-screen Soirée intentionally raises the heading to create
  // space for D100. Match Accueil typography/width, NOT its absolute y.
  assert.equal(evening.title.x,home.title.x);assert.equal(evening.title.w,home.title.w);
  assert.ok(evening.title.y>=evening.brand.y+evening.brand.h-1,
   'Soirée heading overlaps the shared LoveRoll logo');
  assert.ok(evening.title.y+evening.title.h<=evening.nav.y,
   'Soirée heading leaves the visible screen');
  assert.equal(evening.info.w,home.info.w);assert.equal(evening.info.h,home.info.h);
  checkpoint('measure-d100-layout');
  const layout=await page.evaluate(()=>{const c=document.querySelector('.evening-d35-col canvas'),r=c.getBoundingClientRect(),b=c.loveRollDie.projectedBounds();const bounds=s=>document.querySelector(s).getBoundingClientRect();return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,contact:bounds('.home-pedestal-contact').top,bottom:r.top+b.bottom*r.height,center:r.left+(b.left+b.right)*r.width/2,mesh:b,meshTop:r.top+b.top*r.height,stageSize:bounds('.love3d-stage').width,
   heroHeight:bounds('.evening-d100-theater').height,heroTop:bounds('.evening-d100-theater').top,statusTop:bounds('.evening-play-state').top,quotaBottom:bounds('.evening-d100-quota').bottom,navTop:bounds('.nav').top};});console.log('D100_LAYOUT',width,layout);
  assert.equal(layout.scroll,0);assert.equal(layout.horizontal,0);assert.ok(layout.quotaBottom<layout.navTop);assert.ok(Math.abs(layout.bottom-layout.contact)<2);assert.ok(Math.abs(layout.center-width/2)<3);assert.ok(layout.mesh.top>=0&&layout.mesh.bottom<=1);assert.ok(layout.meshTop>=layout.heroTop+3);assert.ok(layout.bottom<=layout.statusTop-2,'Dice must not overlap the status and action controls');
  assert.ok(layout.stageSize>=110,'LR-001: D100 rendered too tiny on a short phone: '+JSON.stringify({width,height,layout}));
  assert.ok(layout.stageSize<=Math.min(width*.82,height*.41,390)+1,
   'Soirée D100 exceeds Surprise size / available hero height: '+JSON.stringify({width,height,layout}));
  const capture=async name=>{if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,`evening-d100-${name}-${width}-${height}.png`)});};
  assert.equal(await page.locator('.evening-choice [aria-pressed=true]').count(),0);assert.equal(await page.locator('.evening-choice-odds').count(),0);
  assert.equal(await page.locator('[data-action="new-challenge"]').isDisabled(),false);await capture('initial');
  await page.evaluate(()=>window.__eveningD100=document.querySelector('.evening-d35-col canvas'));
  checkpoint('category-reminder');
  await page.locator('[data-action="new-challenge"]').click();await page.waitForSelector('.evening-category-reminder[open]');
  assert.match(await page.locator('.evening-category-reminder').innerText(),/Choisis une catégorie avant de brasser le dé/);
  assert.equal(world.calls.filter(c=>c.name?.startsWith('draw_for_partner')).length,0);await capture('choose-category');
  await page.locator('.evening-category-reminder button').click();
  assert.equal(await page.locator('.evening-choice [aria-pressed=true]').count(),0);
  checkpoint('category-selection');
  await page.locator('[data-action="category:SENSUEL"]').click();assert.equal(await page.locator('[data-action="category:SENSUEL"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.evening-choice-odds').innerText(),new RegExp(world.couple.category_preference_percent+' %'));
  assert.equal(await page.evaluate(()=>window.__eveningD100===document.querySelector('.evening-d35-col canvas')),true);
  await capture('selected');await page.locator('.home-odds-info').click();await page.waitForSelector('#evening-play-info[open]');
  assert.match(await page.locator('#evening-play-info').innerText(),new RegExp(world.couple.category_preference_percent+' % pour la catégorie choisie'));
  assert.equal(await page.locator('#evening-play-info [data-action="evening-calendar"]').isVisible(),true);
  assert.equal(await page.locator('#evening-play-info [data-action="evening-close-request"]').isVisible(),true);await capture('info');
  await page.locator('#evening-play-info [data-action="evening-close-request"]').click();await page.waitForSelector('.evening-confirm');
  assert.equal(world.calls.filter(c=>c.name==='close_love_evening_preserve').length,0);await page.locator('[data-action="dismiss-cancel"]').click();
  assert.equal(await page.evaluate(()=>window.__eveningD100===document.querySelector('.evening-d35-col canvas')),true);
  if(width===360){
   await page.locator('[data-action="category:HASARD"]').click();assert.equal(await page.locator('.evening-choice-odds').count(),0);
  }
  await page.locator('[data-action="new-challenge"]').click();
  // LR-014: the old browser contract now confirms the selected category first.
  const categoryDialog=page.locator('dialog.lr-evening-category-dialog[open]');
  checkpoint('confirm-official-draw');
  await categoryDialog.waitFor({state:'visible',timeout:10000});
  assert.equal(world.calls.filter(c=>c.name?.startsWith('draw_for_partner')).length,0);
  await categoryDialog.locator('[data-confirm-action="yes"]').click();
  // Server draw confirmation is asynchronous: sample only after the real mesh starts spinning.
  await page.waitForFunction(()=>document.querySelector('.evening-d35-col canvas')?.loveRollDie?.readState()?.spinning===true,null,{timeout:15000,polling:'raf'});
  // LR-001: verify the projected *real WebGL mesh*, not just its canvas,
  // at several angles during the throw. No visual masking is permitted.
  let animatedSamples=0;
  for(let sample=0;sample<8;sample++){
   await page.waitForTimeout(130);
   const scene=await page.evaluate(()=>{
    const c=document.querySelector('.evening-d35-col canvas');
    if(!c?.loveRollDie)return null;
    const r=c.getBoundingClientRect(),hero=document.querySelector('.evening-d100-theater').getBoundingClientRect();
    const b=c.loveRollDie.projectedBounds();
    return {spinning:c.loveRollDie.readState().spinning,
     top:r.top+b.top*r.height,bottom:r.top+b.bottom*r.height,
     left:r.left+b.left*r.width,right:r.left+b.right*r.width,
     hero:{top:hero.top,bottom:hero.bottom,left:hero.left,right:hero.right}};
   });
   if(!scene?.spinning)continue;
   animatedSamples++;
   assert.ok(scene.top>=scene.hero.top-2&&scene.bottom<=scene.hero.bottom+2&&
    scene.left>=scene.hero.left-2&&scene.right<=scene.hero.right+2,
    'LR-001: animated D100 geometry exits its theater: '+JSON.stringify({width,height,scene}));
  }
  assert.ok(animatedSamples>0,'LR-001: animation stage was never sampled');
  checkpoint('await-official-result');
  await page.waitForFunction(()=>document.querySelector('.evening-d100-result')?.textContent==='Résultat : 17',null,{timeout:16000,polling:150});
  // A server-confirmed result may return directly to the partner's turn or
  // open this user's private challenge queue. The turn is authoritative;
  // never fail simply because no optional queue popup was opened.
  // A modal for the recipient can precede the "partner's turn" status:
  // dismiss it first when present, rather than waiting on hidden/old content.
  // This does NOT skip the official turn assertion after dismissal.
  // A software-WebGL Chromium page may stop scheduling frames after the official
  // D100 settles. Playwright waitForFunction can time out despite the modal
  // already being present (verified by a direct diagnostic DOM evaluation).
  // Poll the ACTUAL DOM in the regular execution context, independent of rAF,
  // and keep the exact official result and turn assertions below.
  let postRoll;
  for(let attempt=0;attempt<80;attempt++){
   postRoll=await page.evaluate(()=>{
    const die=document.querySelector('.evening-d35-col canvas');
    const close=document.querySelector('.evening-queue-modal [data-action="evening-close"]');
    const status=document.querySelector('.evening-primary-status')?.textContent||'';
    return {face:die?.dataset.face,spinning:die?.loveRollDie?.readState()?.spinning,
     result:document.querySelector('.evening-d100-result')?.textContent,
     primary:status,closeCount:document.querySelectorAll('.evening-queue-modal [data-action="evening-close"]').length,
     hasClose:!!close,partnerTurn:/En attente du tour de ton partenaire/.test(status),
     overlays:[...document.querySelectorAll('.evening-queue-modal')].map(e=>e.className)};
   });
   if(postRoll.hasClose||postRoll.partnerTurn)break;
   await page.waitForTimeout(250);
  }
  if(!postRoll?.hasClose&&!postRoll?.partnerTurn){
   console.error('LR_D100_POST_ROLL_DIAGNOSTIC',JSON.stringify({width,height,state:postRoll,
    draws:world.calls.filter(c=>c.name?.startsWith('draw_for_partner')).map(c=>c.name)}));
  }
  assert.ok(postRoll?.hasClose||postRoll?.partnerTurn,
   'Official D100 draw must open a private challenge or display the partner turn: '+JSON.stringify({width,height,postRoll}));
  const queueModal=page.locator('.evening-queue-modal');
  checkpoint('challenge-modal');
  if(await queueModal.count()){
   const close=queueModal.locator('[data-action="evening-close"]');
   if(await close.count()!==1||!(await close.isVisible())){
    const state=await page.evaluate(()=>{
     const die=document.querySelector('.evening-d35-col canvas');
     const modal=document.querySelector('.evening-queue-modal');
     const button=modal?.querySelector('[data-action="evening-close"]');
     const rect=button?.getBoundingClientRect();
     return {face:die?.dataset.face,spinning:die?.loveRollDie?.readState()?.spinning,
      primary:document.querySelector('.evening-primary-status')?.textContent,
      modalClass:modal?.className,close:button?{width:rect?.width,height:rect?.height,
       display:getComputedStyle(button).display,visibility:getComputedStyle(button).visibility}:null};
    });
    console.error('LR_D100_POST_ROLL_DIAGNOSTIC',JSON.stringify({width,height,state}));
   }
   assert.equal(await close.count(),1,'Private challenge popup needs one Close control');
   assert.equal(await close.isVisible(),true,'Private challenge popup Close must be visible');
   // Software WebGL may not request more rAF frames while the official die is idle.
   // Send a REAL pointer tap on the verified unobstructed button center instead
   // of awaiting an animation-frame-based "stable" state indefinitely.
   const hit=await close.evaluate(button=>{
    button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    const target=document.elementFromPoint(x,y);
    return {x,y,width:rect.width,height:rect.height,visible:getComputedStyle(button).visibility==='visible',
     onScreen:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,
     receivesTap:button===target||button.contains(target),
     blocker:typeof target?.className==='string'?target.className.slice(0,100):target?.tagName||null};
   });
   assert.ok(hit.visible&&hit.onScreen&&hit.width>=44&&hit.height>=44&&hit.receivesTap,
    'Private challenge Close must accept real pointer tap: '+JSON.stringify({width,height,hit}));
   await page.mouse.click(hit.x,hit.y);
   await queueModal.waitFor({state:'detached',timeout:5000});
  }
  assert.equal(world.calls.filter(c=>c.name?.startsWith('draw_for_partner')).length,1);
  assert.equal(world.calls.find(c=>c.name?.startsWith('draw_for_partner')).name,width===360?'draw_for_partner_random':'draw_for_partner');
  assert.equal(await page.evaluate(()=>window.__eveningD100===document.querySelector('.evening-d35-col canvas')),true,'Official draw keeps the same model');
  assert.equal(await page.locator('.evening-d35-col canvas').getAttribute('data-face'),'17');
  assert.equal(await page.locator('.evening-choice [aria-pressed=true]').count(),0,'Category resets after each official draw');
  assert.equal(await page.locator('[data-action="new-challenge"]').count(),0,'No fake disabled D100 during partner turn');
  assert.match(await page.locator('.evening-primary-status').textContent(),/En attente du tour de ton partenaire/);
  checkpoint('capture-recorded');
  await capture('recorded');
  assert.deepEqual(errors,[]);await context.close();console.log('EVENING_D100_TEMPLATE_OK',width,height);
  }finally{
   clearInterval(heartbeat);
   clearTimeout(watchdog);
   console.log('EVENING_D100_VIEWPORT_DURATION_MS',width,height,Date.now()-started);
  }
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
