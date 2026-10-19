/* Actual production components with synthetic accounts; never contacts users. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const appearance=el=>{const s=getComputedStyle(el);return {background:s.backgroundImage,border:s.borderTopColor,text:s.color,shadow:s.boxShadow};};
const click=async(p,name)=>{const b=p.locator('[data-action="'+name+'"]');await b.last().scrollIntoViewIfNeeded();await b.last().click();};
(async()=>{
 const browser=await chromium.launch({headless:true}),contexts=[];let count=0;
 fs.mkdirSync('design-captures',{recursive:true});
 const open=async(world,options)=>{const result=await setupEditorial(browser,world,options);contexts.push(result.context);return result;};
 try{
  const {page:auth}=await open(createWorld(),{actor:'guest',query:'auth=signup'});
  const reference=await auth.locator('.entry-auth-submit').evaluate(appearance);
  const selected=await auth.locator('.entry-auth-segments .is-active').evaluate(appearance);
  assert.match(reference.background,/173, 102, 127/,'Account reference remains the approved muted mauve');
  for(const [width,height] of [[360,640],[412,824],[820,1180]]){
   const world=createWorld(),{page:p,errors}=await open(world,{width,height,query:''});
   const primary=async selector=>{
    const b=p.locator(selector).first();await b.waitFor();
    assert.deepEqual(await b.evaluate(appearance),reference,selector+' must match the account CTA');count++;
   };
   await primary('.home-roll-button');
   await p.screenshot({path:'design-captures/controls141-'+width+'-home.png'});
   for(const [tab,selector] of [['session','.evening-finale-start'],['special','.surprise-primary'],['advent','.advent-primary']]){
    await click(p,'tab:'+tab);await p.locator(selector).waitFor();
    if(await p.locator(selector).isEnabled())await primary(selector);
    else assert.equal(await p.locator(selector).evaluate(el=>getComputedStyle(el).boxShadow),'none','Disabled CTA stays quiet');
   }
   await click(p,'tab:settings');await click(p,'settings-page:jeu');
   await primary('.settings-category-options>.settings-primary');
   for(const id of ['show-sensuel-button','show-sexuel-button']){
    const toggle=p.locator('#'+id);await toggle.scrollIntoViewIfNeeded();
    const geometry=await toggle.evaluate(el=>{const row=el.closest('label'),label=row.querySelector('span'),t=el.getBoundingClientRect(),l=label.getBoundingClientRect(),r=row.getBoundingClientRect(),s=getComputedStyle(el);return {gap:t.left-l.right,right:r.right-t.right,width:t.width,background:s.backgroundImage};});
    assert.ok(geometry.gap>=10,id+' must not cover its label: '+JSON.stringify(geometry));
    assert.ok(geometry.right<=2,id+' must align to the row right edge');
    assert.equal(geometry.width,44);assert.equal(geometry.background,reference.background);
    await toggle.uncheck();assert.equal(await toggle.isChecked(),false);
    assert.equal(await toggle.evaluate(el=>getComputedStyle(el).backgroundImage),'none');
    await toggle.check();count+=3;
   }
   await p.screenshot({path:'design-captures/controls141-'+width+'-settings.png'});
   await click(p,'tab:library');
   assert.equal(await p.locator('.editorial-segments .selected').evaluate(el=>getComputedStyle(el).backgroundImage),selected.background);
   assert.equal(await p.locator('#no-repeat-cards').evaluate(el=>getComputedStyle(el).backgroundImage),reference.background);
   await p.screenshot({path:'design-captures/controls141-'+width+'-cards.png'});
   // The real portal is outside #app; it must share primary/cancel colors too.
   await p.evaluate(async()=>{const {premiumConfirm}=await import('./premium-dialogs.mjs');window.__paletteDialog=premiumConfirm('Vérification visuelle sans action',{title:'Vérification',accept:'Continuer',cancel:'Annuler'});});
   const accept=p.locator('#lr-dialog-overlay .lr-dialog-accept');await accept.waitFor();
   assert.deepEqual(await accept.evaluate(appearance),reference,'Portal CTA');
   const cancel=p.locator('#lr-dialog-overlay .lr-dialog-cancel');
   assert.equal(await cancel.evaluate(el=>getComputedStyle(el).backgroundImage),'none');
   await cancel.click();assert.deepEqual(errors,[]);count+=4;
  }
  const waitingWorld=createWorld();waitingWorld.profiles=waitingWorld.profiles.filter(p=>p.id==='a');
  const {page:waiting,errors}=await open(waitingWorld,{width:412,height:824,query:''});
  const invitation=waiting.locator('.partner-waiting-content>.settings-primary');await invitation.waitFor();
  assert.deepEqual(await invitation.evaluate(appearance),reference,'Waiting invitation uses the same account CTA');
  await waiting.screenshot({path:'design-captures/controls141-412-waiting.png'});assert.deepEqual(errors,[]);count++;
  console.log('CONTROLS_PALETTE_OK',count,'checks: account reference, Home/Soirée/Surprise/Advent/waiting, settings/card segments, switch labels and states, external dialog portal at 360/412/820px');
 }finally{for(const c of contexts)await c.close();await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
