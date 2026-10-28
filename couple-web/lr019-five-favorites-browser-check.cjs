// LR-019: exercise real Settings controls with two synthetic accounts in Chromium.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const {revealSetting}=require('./settings-test-navigation.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const world=createWorld(),actors=['a','b'];
 const hearts=[...Array.from({length:5},(_,i)=>({category:'SENSUEL',card_id:i+1,marked_by:'a'}))];
 world.challenges=Array.from({length:6},(_,i)=>({
  id:'test-'+i,couple_id:'c',session_id:'old',recipient:'a',category:'SENSUEL',
  card_id:i+1,card_title:'Mon défi personnel '+(i+1),status:'completed',
  created_at:'2026-10-24T12:00:00Z'}));
 const contexts=[],pageErrors=[];
 async function open(actor,width,height){
  const fixture=await setupEditorial(browser,world,{width,height,actor,query:'settings=1'});
  contexts.push(fixture.context);
  const page=fixture.page;page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/__editorial-api',async route=>{
   const req=route.request().postDataJSON(),name=req.name,args=req.args||{},uid=world.sessions[req.actor];
   if(!['love_favorites_capabilities','my_love_couple_favorites','set_love_couple_favorite','replace_love_couple_favorite'].includes(name))
    return route.fallback();
   if(!actors.includes(uid)||args.p_couple!=='c')
    return route.fulfill({contentType:'application/json',body:JSON.stringify({data:null,error:{message:'Accès refusé'}})});
   let data=null,error=null;
   if(name==='love_favorites_capabilities')data=true;
   else if(name==='my_love_couple_favorites')data=[...hearts];
   else if(name==='replace_love_couple_favorite'){
    const old=hearts.findIndex(h=>h.category===args.p_old_category&&h.card_id===args.p_old_card_id);
    const present=hearts.some(h=>h.category===args.p_new_category&&h.card_id===args.p_new_card_id);
    if(old<0||present)error={message:'La liste commune a changé, actualisez'};
    else hearts.splice(old,1,{category:args.p_new_category,card_id:args.p_new_card_id,marked_by:uid});
    data=!error;
   }else{
    const i=hearts.findIndex(h=>h.category===args.p_category&&h.card_id===args.p_card_id);
    if(args.p_enabled&&i<0){
     if(hearts.length>=5)
      error={message:'Maximum de 5 coups de cœur atteint. Retirez un favori pour en ajouter un nouveau.'};
     else hearts.push({category:args.p_category,card_id:args.p_card_id,marked_by:uid});
    }
    if(!args.p_enabled&&i>=0)hearts.splice(i,1);
    data=hearts.some(h=>h.category===args.p_category&&h.card_id===args.p_card_id);
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error})});
  });
  await page.reload();await page.locator('.settings-editorial').waitFor();
  await page.locator('[data-action="settings-page:jeu"]').click();
  await revealSetting(page,'[data-action="settings-page:favorites"]');
  await page.locator('[data-action="settings-page:favorites"]').click();
  await page.locator('[aria-label="Nos coups de cœur"]').waitFor();
  return page;
 }
 try{
  for(const [width,height] of [[360,640],[412,915]]){
   const page=await open('a',width,height);
   await page.locator('[data-action="favorite-toggle:SENSUEL:6"]').click();
   const modal=page.locator('.lr-favorite-cap-dialog');
   await modal.waitFor();
   assert.match(await modal.locator('h2').innerText(),/déjà 5/i);
   assert.equal(await modal.locator('.lr-favorite-cap-list li').count(),5);
   assert.equal(hearts.length,5,'sixth favorite not added');
   await modal.locator('[data-action="favorite-limit-replace:SENSUEL:2"]').click();
   await modal.waitFor({state:'hidden'});
   assert.equal(hearts.length,5,'one-click replacement must conserve the shared quota');
   assert.ok(!hearts.some(h=>h.card_id===2),'selected old favorite is removed');
   assert.ok(hearts.some(h=>h.card_id===6),'new favorite installed atomically');
   const fit=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
   assert.ok(fit.document<=fit.width+2,JSON.stringify(fit));
   await page.context().close();
   // Restore the simulated starting set before next viewport.
   hearts.splice(0,hearts.length,...Array.from({length:5},(_,i)=>({category:'SENSUEL',card_id:i+1,marked_by:'a'})));
  }
  assert.equal(pageErrors.length,0,'Browser console exceptions: '+JSON.stringify(pageErrors));
  console.log('LR019_FIVE_HEARTS_CHROMIUM_OK');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
