// MANUAL ONLY: genuine authenticated Studio A/B smoke test on a REAL staging
// LoveRoll Supabase project. Never runs on production and never uses fake dice.
// Requires staging migrations, Studio Edge, platform-admin user and full schema.
// Does not replace the complete real D6/D100/card/RLS acceptance matrix.

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
   params.url!==`https://${params.ref}.supabase.co`||
   !/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(params.key)){ 
 throw Error('REFUSED: staging ref must be explicit and NEVER LoveRoll production');
}
// Hard-block production before loading a browser dependency or making a request.
const {chromium}=require('playwright');
const localApp='http://127.0.0.1:8765';
async function main(){
 const browser=await chromium.launch({headless:true});
 let page=null,created=false,cleanupSuccessful=false;
 fs.mkdirSync('studio-authenticated-e2e-proof',{recursive:true});
 try{
  // Service workers can bypass Playwright routing and reuse production
  // config from a prior run. Block them completely in isolated staging.
  const context=await browser.newContext({
   viewport:{width:1440,height:900},serviceWorkers:'block'
  });
  let blockedProductionRequests=0;
  // Even a stale hardcoded endpoint must NEVER reach real LoveRoll from E2E.
  await context.route('https://ejsrqfpkgwraorrznjpm.supabase.co/**',route=>{
   blockedProductionRequests++;
   return route.abort();
  });
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
  // Check REAL V1 RPC availability as the signed-in staging admin before
  // creating even one disposable Auth account. Table presence alone is not
  // sufficient: partial staging restores frequently omit gameplay functions.
  // Only read-only RPCs; never invoke start/roll/paid provider during preflight.
  const rpcReadiness=await page.evaluate(async probe=>{
   const stored=localStorage.getItem('sb-'+probe.ref+'-auth-token');
   let session=null;
   try{session=JSON.parse(stored||'null')}catch{}
   if(!session?.access_token)return [{name:'admin-session',status:0,valid:false}];
   const tests=[
    {name:'love_eclat_status',valid:data=>data&&typeof data.access==='boolean'},
    {name:'love_test_mode_allowed',valid:data=>typeof data==='boolean'}
   ];
   const result=[];
   for(const rpc of tests){
    const response=await fetch(probe.url+'/rest/v1/rpc/'+rpc.name,{
     method:'POST',cache:'no-store',headers:{
      apikey:probe.key,Authorization:'Bearer '+session.access_token,
      'Content-Type':'application/json'
     },body:'{}'
    });
    let data=null;
    try{data=await response.json()}catch{}
    result.push({name:rpc.name,status:response.status,
     valid:response.ok&&rpc.valid(data)});
   }
   return result;
  },{ref:params.ref,url:params.url,key:params.key});
  assert.equal(rpcReadiness.length,2,'staging admin must retain its true Auth session');
  for(const rpc of rpcReadiness){
   assert.equal(rpc.valid,true,
    'STAGING NOT READY: genuine read-only '+rpc.name+' unavailable (HTTP '+rpc.status+')');
  }
  console.log('Staging admin Auth + read-only Éclat and test-mode RPCs: PASS');
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
  // Verify actual Supabase Auth sessions, not just "connected" labels.
  // Supabase stores seat sessions in isolated, distinct sessionStorage keys.
  // Never output access/refresh tokens, passwords, or private Auth records.
  const verifiedSeats=await Promise.all(['A','B'].map(async seat=>
   page.frameLocator('#studio-real-frame-'+seat+' iframe')
    .locator('#app').evaluate((_,seatName)=>{
      let session=null;
      try{
       session=JSON.parse(sessionStorage.getItem('loveroll-studio-auth-v1-'+seatName)||'null');
      }catch{}
      return {
       id:session?.user?.id||null,
       technical:session?.user?.app_metadata?.love_studio_test===true,
       owner:session?.user?.app_metadata?.love_studio_admin||null
      };
    },seat)
  ));
  assert.ok(verifiedSeats.every(x=>
   /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x.id||'')&&x.technical&&x.owner),
   'the two real game frames must retain approved, tagged Supabase Auth sessions');
  assert.notEqual(verifiedSeats[0].id,verifiedSeats[1].id,
   'both players must be distinct Supabase Auth identities');
  assert.equal(verifiedSeats[0].owner,verifiedSeats[1].owner,
   'both players must belong to the same technical platform admin');
  assert.ok(verifiedSeats.every(x=>x.owner!==x.id),
   'neither game seat can use the actual platform admin account');
  // Genuine staging authorization probe: both players must be rejected by
  // the Data API on ALL private Studio registries. This performs READS ONLY,
  // sends each seat token solely to its staging Supabase backend, and returns
  // no session secret or private row content to the test runner.
  const privateTables=[
   'love_studio_test_pools','love_studio_test_seats',
   'love_studio_test_audit','love_studio_venice_daily_quota'
  ];
  for(const seat of ['A','B']){
   const results=await page.frameLocator('#studio-real-frame-'+seat+' iframe')
    .locator('#app').evaluate(async(_element,probe)=>{
     const stored=JSON.parse(sessionStorage.getItem('loveroll-studio-auth-v1-'+probe.seat)||'null');
     if(!stored?.access_token)return [{status:0}];
     return Promise.all(probe.tables.map(async table=>{
      const reply=await fetch(probe.url+'/rest/v1/'+table+'?select=*&limit=1',{
       method:'GET',cache:'no-store',headers:{
        apikey:probe.key,Authorization:'Bearer '+stored.access_token
       }
      });
      return {table,status:reply.status};
     }));
    },{seat,tables:privateTables,url:params.url,key:params.key});
   assert.equal(results.length,privateTables.length,
    seat+' must have a real Auth token before testing SQL permissions');
   for(const result of results){
    assert.ok([401,403,404].includes(result.status),
     'Security violation: Studio player '+seat+' can read private registry '+
      result.table+' (HTTP '+result.status+')');
   }
  }
  console.log('A/B denied access to four privileged Studio registries: PASS');

  // A valid seat JWT must NOT inherit the parent Super Admin's authority.
  // Query the real privileged Edge endpoint from EACH authenticated game
  // frame. This is read-only, never logs bearer tokens, never sends them
  // outside the isolated staging project, and must return a hard 403.
  for(const seat of ['A','B']){
   const denial=await page.frameLocator('#studio-real-frame-'+seat+' iframe')
    .locator('#app').evaluate(async(_element,probe)=>{
     const session=JSON.parse(
      sessionStorage.getItem('loveroll-studio-auth-v1-'+probe.seat)||'null');
     if(!session?.access_token)return {status:0};
     const reply=await fetch(probe.url+'/functions/v1/love-studio-sandbox',{
      method:'POST',cache:'no-store',
      headers:{
       apikey:probe.key,
       Authorization:'Bearer '+session.access_token,
       'Content-Type':'application/json'
      },
      body:JSON.stringify({action:'status'})
     });
     return {status:reply.status};
    },{seat,url:params.url,key:params.key});
   assert.equal(denial.status,403,
    'SECURITY: technical player '+seat+
    ' must NOT be authorized as a platform admin by the Studio Edge function');
  }
  assert.equal(await page.locator('#gate').isVisible(),false,
   'the parent platform admin must remain authenticated after both seat logins');
  console.log('A/B denied Super Admin Edge authority; parent still signed in: PASS');
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
  // B. The real UI creates "new-challenge" ONLY AFTER choosing a
  // category; waiting for that button before selecting one always times out.
  // Use the visible category choice to locate an eligible seat, then require
  // its genuine D100 button to appear after selection.
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

  // The official draw is delivered to the OTHER registered seat.
  // Verify that the server's recorded recipient matches the paired turn,
  // then accept through that person's genuine challenge buttons.
  const recipientSeat=firstTurn===0?'B':'A';
  const recipient=candidates[1-firstTurn];
  const cardMeta=page.locator('#studio-real-challenge-list .studio-real-card-meta').first();
  await cardMeta.waitFor({state:'visible',timeout:60000});
  assert.match(await cardMeta.innerText(),
   new RegExp('Joueur '+recipientSeat+' \\u00b7'),
   'the server-confirmed official card must be sent to the OTHER test account');
  await page.selectOption('#studio-real-jump-'+recipientSeat,'session');
  await recipient.locator('[data-action="evening-list"]').first().click({timeout:60000});
  await recipient.locator('[data-action^="evening-open:"]').first().click({timeout:25000});
  await recipient.locator('[data-action^="evening-start:"]').first().click({timeout:25000});
  // A/B client completed the ACTUAL answer_challenge RPC; Studio only re-reads.
  await page.locator('#studio-real-challenge-list .studio-real-card-meta')
   .filter({hasText:'accepted'}).first().waitFor({state:'visible',timeout:60000});
  console.log('Official challenge received and ACCEPTED by the true partner: PASS');
  await page.selectOption('#studio-real-jump-A','special');
  await a.locator('[data-action="roll:monthly_activity"]').first().click({timeout:25000});
  await verified(4).waitFor({timeout:60000});
  console.log('Official Surprise D100 from real A: PASS');

  // Premium QA is NOT a mock paywall. The technical accounts must receive
  // a genuine backend Éclat entitlement and open the shipped 12-coffret UI
  // under their OWN Auth sessions. Only browse details: starting chapters
  // or completing all 12 experiences is a separate authenticated test.
  await verified(9).waitFor({timeout:60000});
  assert.equal((await page.locator('#studio-real-progress-count').innerText()).trim(),'9/9',
   'all nine official read-only server milestones must be verified');
  for(const [seat,frame] of [['A',a],['B',b]]){
   await page.selectOption('#studio-real-jump-'+seat,'eclat');
   const tiles=frame.locator('button[data-action^="eclat:detail:"]');
   await tiles.first().waitFor({state:'visible',timeout:45000});
   assert.equal(await tiles.count(),12,
    'technical '+seat+' must have access to all twelve genuine Éclat coffrets');
   for(let id=1;id<=12;id++){
    const tile=frame.locator('button[data-action="eclat:detail:'+id+'"]');
    await tile.click({timeout:15000});
    const detail=frame.locator('.eclat-detail[data-coffret-id="'+id+'"]');
    await detail.waitFor({state:'visible',timeout:15000});
    assert.equal(await detail.locator('button[data-action="eclat:start:'+id+'"]').count(),1,
     'Éclat '+id+' must expose the real start control to authorized seat '+seat);
    await frame.locator('button[data-action="eclat:library"]').first().click({timeout:15000});
    await tile.waitFor({state:'visible',timeout:15000});
   }
  }
  await page.screenshot({path:'studio-authenticated-e2e-proof/real-eclat-twelve-coffrets.png',fullPage:true});
  console.log('Both authenticated players may browse all 12 real Éclat coffrets: PASS');
  // Start ONE real coffret through the shipped UI, then inspect the server's
  // active-chapter record. No artificial RPC, scene advancement or mock state.
  await a.locator('button[data-action="eclat:detail:1"]').click({timeout:15000});
  await a.locator('button[data-action="eclat:start:1"]').click({timeout:25000});
  await page.locator('#studio-real-check').click();
  const activeCoffret=page.locator(
   '#studio-real-eclat-grid .studio-real-eclat-coffret[data-state="active"]');
  await activeCoffret.waitFor({state:'visible',timeout:60000});
  assert.match(await activeCoffret.innerText(),/Coffret 1.*en cours.*30 min/,
   'official Supabase Éclat session must be reflected in Studio diagnostics');
  await page.screenshot({path:'studio-authenticated-e2e-proof/real-eclat-started.png',fullPage:true});
  console.log('Real Éclat chapter 1 started and confirmed by the privileged read-only backend: PASS');
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
  assert.equal(blockedProductionRequests,0,
   'a staging test attempted to contact the real LoveRoll Supabase project');
  console.log('Authenticated real A/B sessions + official dice/cards + responsive layouts: PASS');
 }finally{
  if(page&&created){
   try{
    // Failure may occur inside Venice or in a narrow mobile viewport.
    // Return to the actual A/B controls before trying the mandatory purge.
    await page.setViewportSize({width:1440,height:900});
    await page.locator('#tabs button[data-pane="realtest"]').click({timeout:8000});
    // Always use only the registered test-pair DELETE operation. Never query
    // or manipulate any real customer Auth user ID directly.
    await page.locator('#studio-real-delete').click({timeout:8000});
    await page.locator('#studio-real-create').waitFor({state:'visible',timeout:35000});
    // The original Studio Edge deletion must have completed, not merely
    // re-enabled a button after an optimistic local UI transition. The audit
    // is read back from the privileged backend by Studio's normal refresh.
    await page.locator('#studio-real-audit-list li').first()
     .filter({hasText:'Suppression du duo terminée'})
     .waitFor({state:'visible',timeout:35000});
    assert.equal(await page.locator('#studio-real-delete').isHidden(),true,
     'registered A/B test pool still present after cleanup');
    assert.equal(await page.locator('#studio-real-frame-A iframe').count(),0,
     'player A iframe survived the supposedly successful purge');
    assert.equal(await page.locator('#studio-real-frame-B iframe').count(),0,
     'player B iframe survived the supposedly successful purge');
    assert.equal((await page.locator('#studio-real-progress-count').innerText()).trim(),'0/9',
     'Studio progress was not reset after both synthetic identities were removed');
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
