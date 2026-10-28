// MANUAL ONLY: genuine authenticated Studio A/B smoke test on a REAL staging
// LoveRoll Supabase project. Never runs on production and never uses fake dice.
// Requires staging migrations, Studio Edge, platform-admin user and full schema.
// Does not replace the complete real D6/D100/card/RLS acceptance matrix.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const params={
 ref:process.env.LOVEROLL_STUDIO_E2E_REF||'',
 url:process.env.LOVEROLL_STUDIO_E2E_URL||'',
 key:process.env.LOVEROLL_STUDIO_E2E_PUBLISHABLE_KEY||'',
 email:process.env.LOVEROLL_STUDIO_E2E_ADMIN_EMAIL||'',
 password:process.env.LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD||''
};
const productionRef='ejsrqfpkgwraorrznjpm';
if(!params.ref||!params.url||!params.key||!params.email||!params.password){
 throw Error('Staging Supabase, publishable key and staging platform-admin credentials are required');
}
if(!/^[a-z0-9]{20}$/.test(params.ref)||params.ref===productionRef||
   params.url!==`https://${params.ref}.supabase.co`){
 throw Error('REFUSED: staging ref must be explicit and NEVER LoveRoll production');
}
const localApp='http://127.0.0.1:8765';
async function main(){
 const browser=await chromium.launch({headless:true});
 let page=null,created=false,cleanupSuccessful=false;
 fs.mkdirSync('studio-authenticated-e2e-proof',{recursive:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route('**/config.js*',route=>{
   route.fulfill({status:200,contentType:'text/javascript',body:
    `export const CONFIG = ${JSON.stringify({
     supabaseUrl:params.url,
     supabasePublishableKey:params.key,
     oauthProviders:[],
     siteUrl:localApp+'/'
    })};`
   });
  });
  page=await context.newPage();
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(localApp+'/admin.html',{waitUntil:'domcontentloaded'});
  await page.locator('#email').fill(params.email);
  await page.locator('#password').fill(params.password);
  await page.locator('#login button[type=submit]').click();
  await page.locator('#dashboard').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('#gate').isVisible(),false,
   'only a real platform admin may enter the dashboard');
  await page.locator('#studio-real-create').waitFor({state:'visible',timeout:30000});
  await page.locator('#studio-real-create').click();
  created=true;
  await page.locator('#studio-real-frame-A iframe').waitFor({timeout:60000});
  await page.locator('#studio-real-frame-B iframe').waitFor({timeout:60000});
  for(const seat of ['A','B']){
   await page.locator('#studio-real-seat-state-'+seat+'[data-state=connected]')
    .waitFor({timeout:60000});
  }
  const sources=await Promise.all(['A','B'].map(seat=>
   page.locator('#studio-real-frame-'+seat+' iframe').getAttribute('src')));
  assert.match(sources[0],/studio_seat=A/);
  assert.match(sources[1],/studio_seat=B/);
  assert.notEqual(sources[0],sources[1]);
  for(const seat of ['A','B']){
   const frame=page.frameLocator('#studio-real-frame-'+seat+' iframe');
   // A visible splash is NOT evidence that LoveRoll initialized. Require a
   // native signed-in game control before assessing the actual screen.
   await frame.locator('button[data-action="tab:home"]')
    .first().waitFor({state:'visible',timeout:45000});
   const displayed=await frame.locator('#app').evaluate(el=>{
    const text=(el.textContent||'').trim();
    return {textLength:text.length,buttons:el.querySelectorAll('button').length};
   });
   assert.ok(displayed.textLength>20&&displayed.buttons>0,
    seat+' must show actual interactive LoveRoll, not an empty fake iframe');
  }
  assert.equal((await page.locator('#studio-real-progress-count').innerText()).includes('/9'),true);
  await page.screenshot({path:'studio-authenticated-e2e-proof/real-dual-account-desktop.png',fullPage:true});
  // REAL gameplay: click official shipped buttons, observe server-confirmed
  // progress in the admin dashboard; never write dice/card values from tests.
  const a=page.frameLocator('#studio-real-frame-A iframe');
  const b=page.frameLocator('#studio-real-frame-B iframe');
  const verified=(index)=>page.locator(
   '#studio-real-progress-list li:nth-child('+index+')[data-state="verified"]');
  // The genuine Home D6 button rolls directly: it has NO confirmation modal.
  await page.selectOption('#studio-real-jump-A','home');
  await a.locator('[data-action="roll:weekly"]').first().click({timeout:25000});
  await verified(3).waitFor({timeout:60000});
  console.log('Official shared weekly D6 from real A: PASS');
  await page.selectOption('#studio-real-jump-A','session');
  await a.locator('[data-action="new-session"]').first().click({timeout:25000});
  await verified(5).waitFor({timeout:60000});
  await a.locator('[data-action="my-d6"]').first().click({timeout:25000});
  await verified(6).waitFor({timeout:60000});
  await page.selectOption('#studio-real-jump-B','session');
  await b.locator('[data-action="my-d6"]').first().click({timeout:25000});
  await verified(7).waitFor({timeout:60000});
  console.log('Real couple Soirée created, official D6 of both A/B: PASS');
  // Genuine category controls are SENSUEL and SEXUEL; HASARD is a valid
  // RPC category but not a visible option in the production Soirée UI.
  // The official paired-turn engine chooses WHO draws first. It might be
  // B, never assume the owner A has the first card to give. Only an enabled
  // official category control qualifies as evidence of whose turn it is.
  const candidates=[a,b];
  const firstTurn=await Promise.any(candidates.map(async (frame,index)=>{
   await frame.locator('[data-action="category:SENSUEL"]:not([disabled])')
    .first().waitFor({state:'visible',timeout:60000});
   return index;
  }));
  const drawer=candidates[firstTurn];
  await drawer.locator('[data-action="category:SENSUEL"]:not([disabled])')
   .first().click({timeout:12000});
  await drawer.locator('[data-action="new-challenge"]:not([disabled])')
   .first().click({timeout:25000});
  // Real D100 category confirmation is an actual <dialog>, which may
  // disappear when the player has opted out in the true settings.
  const confirmation=drawer.locator('dialog.lr-evening-category-dialog[open] [data-confirm-action="yes"]');
  try{
   await confirmation.waitFor({state:'visible',timeout:4500});
   await confirmation.click({timeout:10000});
  }catch(error){
   // No dialog is permitted only if the real user explicitly disabled its
   // preference. In all other cases the next server-evidenced stage fails.
   if(await confirmation.isVisible().catch(()=>false))throw error;
  }
  await verified(8).waitFor({timeout:60000});
  console.log('Real Soirée D100 and official challenge server record: PASS');
  await page.selectOption('#studio-real-jump-A','special');
  await a.locator('[data-action="roll:monthly_activity"]').first().click({timeout:25000});
  await verified(4).waitFor({timeout:60000});
  console.log('Official Surprise D100 from real A: PASS');
  await page.screenshot({path:'studio-authenticated-e2e-proof/official-rolled-dice-and-cards.png',fullPage:true});
  // The private Venice section can inspect provider status without spending
  // inference credits. NEVER trigger preview_three in an automated QA run.
  await page.locator('#tabs button[data-pane="venice"]').click();
  await page.locator('#studio-venice-status-button').click();
  await page.waitForFunction(()=>{
   const text=document.querySelector('#studio-venice-status')?.textContent||'';
   return /Clé enregistrée|Ajoutez VENICE_API_KEY/.test(text);
  },null,{timeout:35000});
  assert.equal(await page.locator('#studio-venice-generate').isDisabled(),false,
   'paid Venice button exists but automated QA must not click it');
  await page.screenshot({path:'studio-authenticated-e2e-proof/venice-read-only-workshop.png',fullPage:true});
  await page.locator('#tabs button[data-pane="realtest"]').click();
  // Resize the exact authenticated browser to validate the real paired game
  // layout, rather than just blank static fixture windows.
  for(const viewport of [
   {name:'ipad-landscape',width:1180,height:820},
   {name:'ipad-portrait',width:820,height:1180},
   {name:'mobile',width:390,height:844}
  ]){
   await page.setViewportSize({width:viewport.width,height:viewport.height});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=2,viewport.name+' horizontal overflow '+overflow);
   assert.equal(await page.locator('#studio-real-seat-state-A').getAttribute('data-state'),'connected');
   assert.equal(await page.locator('#studio-real-seat-state-B').getAttribute('data-state'),'connected');
   await page.screenshot({path:'studio-authenticated-e2e-proof/real-'+viewport.name+'.png',fullPage:true});
  }
  // On 390px both actual clients remain alive while the user switches seats.
  await page.locator('#studio-show-seat-B').click();
  assert.equal(await page.locator('#studio-real-frame-B iframe').count(),1);
  await page.locator('#studio-show-seat-A').click();
  assert.equal(await page.locator('#studio-real-frame-A iframe').count(),1);
  console.log('Authenticated real A/B sessions + official dice/cards + responsive layouts: PASS');
 }finally{
  if(page&&created){
   try{
    // Always use only the registered test-pair DELETE operation. Never query
    // or manipulate any real customer Auth user ID directly.
    await page.locator('#studio-real-delete').click({timeout:8000});
    await page.locator('#studio-real-create').waitFor({state:'visible',timeout:35000});
    cleanupSuccessful=true;
   }catch(e){
    console.error('CRITICAL: verify staging cleanup manually; test pair may remain',String(e));
   }
  }
  await browser.close();
  if(created&&!cleanupSuccessful)throw Error('Staging A/B cleanup verification failed');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
