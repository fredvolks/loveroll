/* Real app rendering with isolated fixture data; never shares or sends an invitation. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const out=process.env.LOVEROLL_OWNER_CAPTURE_DIR||'design-captures/waiting-invitation-v127';
const action=(page,name)=>page.locator('[data-action="'+name+'"]');
async function click(page,name){const control=action(page,name).first();await control.scrollIntoViewIfNeeded();await control.click();}
async function reachable(page,control){
 await control.scrollIntoViewIfNeeded();
 assert(await control.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  return r.width>0&&r.height>=44&&x>=0&&x<=innerWidth&&y>=0&&y<=innerHeight&&el.contains(document.elementFromPoint(x,y));}),await control.getAttribute('data-action')||'control obscured');
}
async function capture(page,device,name,{allowVertical=false}={}){
 await page.evaluate(()=>{scrollTo(0,0);for(const el of document.querySelectorAll('.settings-detail-body'))el.scrollTop=0;});
 const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
  documentHeight:document.documentElement.scrollHeight,brand:document.querySelector('.ritual-brand')?.getBoundingClientRect().toJSON(),
  body:(()=>{const el=document.querySelector('.settings-detail-body');return el?{height:el.clientHeight,scrollHeight:el.scrollHeight}:null;})()}));
 assert(metrics.documentWidth<=metrics.width+1,device+' '+name+' horizontal overflow');
 if(!allowVertical)assert(metrics.documentHeight<=metrics.height+1,device+' '+name+' document overflow');
 assert.equal(await page.locator('#app>.header:visible').count(),0,device+' '+name+' old header');
 assert.equal(await page.locator('.settings-page-header .ritual-brand:visible,.entry-account-hero .ritual-brand:visible').count(),1,device+' '+name+' shared brand');
 await page.screenshot({path:path.join(out,device+'-'+name+'.png')});
 return {device,name,...metrics};
}
async function exposeFixtureState(page,context){
 const source=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
 await context.route('**/app.js?*',route=>route.fulfill({contentType:'application/javascript',body:source+'\nwindow.__ownerFixture={state,render,openSettingsPage};\n'}));
 await page.reload();await page.waitForFunction(()=>!!window.__ownerFixture);
 await page.locator('[data-lr-boot]').waitFor({state:'detached'});
}
async function stateCase(page,{invitation=null,ready=false,manual=false}={}){
 await page.evaluate(({invitation,ready,manual})=>{const {state,render,openSettingsPage}=window.__ownerFixture;
  state.invitations=invitation?[invitation]:[];state.inviteCopyFallback=manual;
  state.members=state.members.filter(member=>member.user_id===state.user.id);
  if(ready)state.members.push({user_id:'fixture-partner',name:'Partenaire',gender:'her'});
  if(ready)openSettingsPage('couple');else{state.tab='invitation';render();}
 },{invitation,ready,manual});
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});process.env.LOVEROLL_LOCAL_FILES='1';
 const browser=await chromium.launch({headless:true,...(process.env.LOVEROLL_BROWSER_EXECUTABLE?{executablePath:process.env.LOVEROLL_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const report=[];
 try{
  for(const [device,width,height] of [['S25',412,824],['small',360,640],['iPad',820,1180],['PC',1366,768]]){
   const world=createWorld();world.profiles=world.profiles.slice(0,1);
   const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:''});
   try{
    assert.equal(await page.locator('link[href*="waiting-invitation-v127.css"]').count(),1,'owner stylesheet loaded');
    assert.equal(await page.locator('#invite-email').count(),0,'waiting must not duplicate the invitation form');
    await reachable(page,action(page,'tab:invitation'));
    const waiting=await capture(page,device,'waiting');report.push(waiting);
    assert(waiting.body.scrollHeight<=waiting.body.height+1,device+' waiting should fit one screen');
    const summary=page.locator('.partner-waiting-prepare>summary');await summary.focus();await page.keyboard.press('Space');
    assert.equal(await page.locator('.partner-waiting-prepare').getAttribute('open'),'');
    for(const key of ['library','monthly-library','special-editor','advent-editor'])await reachable(page,action(page,'tab:'+key).first());
    report.push(await capture(page,device,'waiting-prepare'));
    await click(page,'tab:library');assert.equal(await page.locator('.editorial-card-list').count(),1);
    await click(page,'tab:home');await click(page,'tab:invitation');
    await reachable(page,page.locator('#invite-email'));
    for(const key of ['invite','send-messenger','send-sms','send-email'])await reachable(page,action(page,key));
    report.push(await capture(page,device,'invitation-empty'));
    await click(page,'tab:settings');await click(page,'settings-page:couple');
    assert.equal(await page.locator('.partner-invite-panel').count(),1);
    report.push(await capture(page,device,'duo-waiting'));
    await exposeFixtureState(page,context);
    const base={id:'00000000-0000-4000-8000-000000000001',invited_email:'partenaire@test.invalid',
     created_at:new Date(Date.now()-86400000).toISOString(),expires_at:new Date(Date.now()+6*86400000).toISOString()};
    for(const [name,invitation,ready] of [['prepared',base,false],['sent',{...base,sent_at:new Date().toISOString()},false],
     ['expired',{...base,expires_at:'2020-01-01T00:00:00Z'},false],['cancelled',{...base,cancelled_at:new Date().toISOString()},false],
     ['accepted',{...base,accepted_at:new Date().toISOString()},false],['connected',{...base,accepted_at:new Date().toISOString()},true]]){
     await stateCase(page,{invitation,ready});
     const active=['prepared','sent'].includes(name);
     assert.equal(await page.locator('#invite-email').count(),ready?0:1,name+' email');
     for(const key of ['send-messenger','send-sms','send-email','copy-invite','confirm-invite-sent'])assert.equal(await action(page,key).count(),active?1:0,name+' '+key);
     assert.equal(await action(page,'cancel-invite:'+base.id).count(),active?1:0,name+' cancel');
     if(active){
      for(const key of ['send-messenger','send-sms','send-email','copy-invite','confirm-invite-sent'])await reachable(page,action(page,key));
      const options=page.locator('.partner-invite-options>summary');await options.scrollIntoViewIfNeeded();await options.click();
      await reachable(page,action(page,'invite'));await reachable(page,action(page,'cancel-invite:'+base.id));
      await options.click();
     }else if(!ready)await reachable(page,action(page,'invite'));
     report.push(await capture(page,device,'invitation-'+name));
    }
    await stateCase(page,{invitation:base,manual:true});
    const manual=page.locator('#invite-manual-link');await reachable(page,manual);
    assert.equal(await manual.getAttribute('readonly'),'');assert((await manual.inputValue()).includes(base.id));
    report.push(await capture(page,device,'invitation-manual-copy'));
    const preview=page.locator('.partner-invite-preview>summary');await preview.scrollIntoViewIfNeeded();await preview.click();
    await page.locator('.loveroll-invite-preview').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,device+'-invitation-preview.png')});
    await page.evaluate(()=>{const {state,render}=window.__ownerFixture;state.coupleId=null;state.couple=null;state.members=[];state.tab='home';render();});
    for(const key of ['prepare-cards','create-couple'])await reachable(page,action(page,key));
    assert.equal(await page.locator('#signup-couple-month').count(),1);assert.equal(await page.locator('#signup-couple-day').count(),1);
    report.push(await capture(page,device,'create-duo'));
    for(const [name,kind] of [['existing-solo','solo'],['existing-duo','duo'],['existing-non-owner','non-owner'],['association-error','error'],['association-pending','pending']]){
     await page.evaluate(kind=>{const {state,render}=window.__ownerFixture;
      sessionStorage.setItem('pendingInviteId','72aa640b-2644-4d0d-bcf7-575587d27f31');state.inviteAccepted=true;state.showDiscover=false;
      const existing=['solo','duo','non-owner'].includes(kind);
      state.coupleId=existing?'c':null;state.couple=existing?{owner_user_id:kind==='non-owner'?'someone-else':state.user.id}:null;
      state.members=existing?[{user_id:state.user.id,name:'Camille'}]:[];
      if(kind==='duo')state.members.push({user_id:'fixture-partner',name:'Noémie'});
      state.inviteError=kind==='error'?'Cette invitation est destinée à une autre adresse courriel.':null;render();
     },kind);
     assert.equal(await page.locator('.nav').count(),0,name+' must stay in invitation verification');
     assert.equal(await action(page,'join-invite-from-solo').count(),kind==='solo'?1:0,name+' joining requires the solo owner');
     if(kind==='solo')assert.match(await page.locator('.invitation-notice-archive').innerText(),/archivés avant le changement/);
     for(const control of await page.locator('.invitation-notice-card button').all())await reachable(page,control);
     if(kind==='error')assert.equal(await page.locator('.entry-auth-feedback[role=alert]').count(),1);
     report.push(await capture(page,device,'invitation-'+name,{allowVertical:true}));
    }
    await page.evaluate(()=>{const {state,render}=window.__ownerFixture;sessionStorage.removeItem('pendingInviteId');state.inviteError=null;state.inviteWelcome=true;render();});
    assert.equal(await page.locator('.invitation-notice-card[role=status]').count(),1);
    report.push(await capture(page,device,'welcome',{allowVertical:true}));
    assert(!world.calls.some(call=>['create_love_match','join_love_invitation_from_solo','cancel_pair_invite','mark_pair_invite_sent'].includes(call.name)),'visual checks must not perform invitation mutations');
    assert.deepEqual(errors,[],device+' page errors');
    console.log('OWNER_INVITATION_OK',device,'waiting + preparation + invitation + duo + 6 statuses + manual copy + preview + creation + 5 account states + welcome');
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
