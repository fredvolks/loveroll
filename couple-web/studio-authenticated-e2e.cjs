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
const failOnError=()=>{};
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
   await frame.locator('#app').waitFor({state:'visible',timeout:45000});
   const displayed=await frame.locator('#app').evaluate(el=>{
    const text=(el.textContent||'').trim();
    return {textLength:text.length,buttons:el.querySelectorAll('button').length};
   });
   assert.ok(displayed.textLength>20&&displayed.buttons>0,
    seat+' must show actual interactive LoveRoll, not an empty fake iframe');
  }
  assert.equal((await page.locator('#studio-real-progress-count').innerText()).includes('/9'),true);
  await page.screenshot({path:'studio-authenticated-e2e-proof/real-dual-account-desktop.png',fullPage:true});
  console.log('Authenticated staging owner A/B sessions and official screens: PASS');
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
