// Actual LoveRoll Settings UI, real buttons; synthetic two-account API only.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const {revealSetting}=require('./settings-test-navigation.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const world=createWorld(),hearts=[
  {category:'SENSUEL',card_id:4,marked_by:'a',marked_at:'2026-10-25T12:00:00Z'}
 ];
 world.challenges=[{id:'arch-a',couple_id:'c',session_id:'old',recipient:'a',category:'SENSUEL',card_id:4,
  card_title:'Titre personnel confidentiel',status:'completed',created_at:'2026-10-24T12:00:00Z'}];
 const contexts=[];let serverReady=true,errors=[];
 async function pageFor(actor,width,height){
  const fixture=await setupEditorial(browser,world,{width,height,actor,query:'settings=1'});
  contexts.push(fixture.context);errors.push(...fixture.errors);
  const {page}=fixture;
  await page.route('**/__editorial-api',async route=>{
   const body=route.request().postDataJSON(),name=body.name,args=body.args||{},uid=world.sessions[body.actor];
   if(!['love_favorites_capabilities','my_love_couple_favorites','set_love_couple_favorite'].includes(name))
    return route.fallback();
   if(!serverReady)return route.fulfill({contentType:'application/json',body:JSON.stringify({data:null,error:{message:'Not installed'}})});
   if(args.p_couple!=='c'||!['a','b'].includes(uid))
    return route.fulfill({contentType:'application/json',body:JSON.stringify({data:null,error:{message:'Access denied'}})});
   let data;
   if(name==='love_favorites_capabilities')data=true;
   else if(name==='my_love_couple_favorites')data=[...hearts];
   else{
    const i=hearts.findIndex(h=>h.category===args.p_category&&h.card_id===args.p_card_id);
    if(args.p_enabled&&i<0)hearts.push({category:args.p_category,card_id:args.p_card_id,marked_by:uid,marked_at:new Date().toISOString()});
    if(!args.p_enabled&&i>=0)hearts.splice(i,1);
    data=hearts.some(h=>h.category===args.p_category&&h.card_id===args.p_card_id);
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify({data,error:null})});
  });
  await page.reload();await page.locator('.settings-editorial').waitFor();
  return page;
 }
 async function visitFavorites(page){
  await page.locator('[data-action="settings-page:jeu"]').click();
  await revealSetting(page,'[data-action="settings-page:favorites"]');
  await page.locator('[data-action="settings-page:favorites"]').click();
  await page.locator('[aria-label="Nos coups de cœur"]').waitFor();
 }
 try{
  // One shared heart for the couple; only a completed partner history can
  // reveal its private title. Either member may remove the shared heart.
  const a=await pageFor('a',412,824);await visitFavorites(a);
  const mine=a.locator('[data-action="favorite-toggle:SENSUEL:4"]');
  assert.match(await mine.innerText(),/Retirer des coups de cœur/);
  assert.match(await a.locator('[aria-label="Nos coups de cœur"]').innerText(),/Titre personnel confidentiel/);
  const b=await pageFor('b',393,852);await visitFavorites(b);
  const theirs=b.locator('[data-action="favorite-toggle:SENSUEL:4"]');
  assert.match(await theirs.innerText(),/Retirer des coups de cœur/);
  assert.doesNotMatch(await b.locator('[aria-label="Nos coups de cœur"]').innerText(),/Titre personnel confidentiel/,
   'Never reveal recipient A historic card title to B');
  await theirs.click();
  await b.locator('[aria-label="Nos coups de cœur"]').getByText('Aucun coup de cœur encore enregistré.').waitFor();
  assert.equal(hearts.length,0,'B removes shared heart originally marked by A');
  await a.reload();await visitFavorites(a);
  await a.locator('[aria-label="Nos coups de cœur"]').getByText('Aucun coup de cœur encore enregistré.').waitFor();
  // Capability missing means no visible inert feature, even when records existed.
  serverReady=false;await a.reload();await a.locator('.settings-editorial').waitFor();
  assert.equal(await a.locator('[data-action="settings-page:favorites"]').count(),0);
  for(const page of [a,b]){
   const fit=await page.evaluate(()=>({screen:innerWidth,doc:document.documentElement.scrollWidth}));
   assert.ok(fit.doc<=fit.screen+2,'No horizontal overflow '+JSON.stringify(fit));
  }
  console.log('LR019_TWO_ACCOUNTS_UI_OK shared hearts, private titles hidden, gated');
 }finally{for(const ctx of contexts)await ctx.close().catch(()=>{});await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
