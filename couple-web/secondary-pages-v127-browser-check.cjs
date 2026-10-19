// Follow the production navigation into the current calendar and occasion
// details. Every account/RPC response is synthetic and remains in this process.
process.env.LOVEROLL_LOCAL_FILES='1';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const now='2026-10-17T16:00:00Z';
const layouts=[['S25',412,824],['small',360,640],['tablet',820,1180],['PC',1440,900]];
const metrics=[];
async function setup(browser,width,height,solo=false){
 const world=createWorld();
 if(solo)world.profiles=world.profiles.filter(profile=>profile.id==='a');
 world.settings.anniversary_md='10-17';
 world.occasionRolls=[];world.specialKeys=[];world.audit=[];
 const value=await setupEditorial(browser,world,{width,height,query:'settings=1'});
 value.page.on('requestfailed',request=>{
  if(request.url().startsWith('https://esm.sh/three'))
   console.warn('SECONDARY_THREE_LOAD_FAILED',request.url(),request.failure()?.errorText);
 });
 value.page.on('console',message=>{
  if(message.type()==='warning'&&/3D indisponible|WebGL non disponible/.test(message.text()))
   console.warn('SECONDARY_RENDERER_WARNING',message.text());
 });
 await value.page.clock.setFixedTime(new Date(now));
 await value.context.route('**/__editorial-api',async route=>{
  const req=JSON.parse(route.request().postData());
  world.audit.push(req);
  let data;
  if(req.table==='couple_occasion_rolls')data=world.occasionRolls;
  else if(req.name==='my_love_special_event_keys')data=world.specialKeys;
  else if(req.name==='roll_love_occasion_once'){
   assert.equal(req.args.p_couple,'c');
   assert.equal(req.args.p_kind,'anniversary');
   assert.equal(req.args.p_owner,null);
   const type=req.args.p_roll;
   assert.ok(['surprise','activity','modifier'].includes(type));
   data=world.occasionRolls.find(roll=>roll.roll_type===type);
   if(!data){
    data={id:'fixture-'+type,couple_id:'c',occasion_key:'anniversary',event_year:2026,
     roll_type:type,face:type==='surprise'?17:type==='activity'?2:5,actor:'a',
     ...(type==='activity'?{special_description:'Activité préparée 2 pour notre rendez-vous.',timer_minutes:5}:{}),
     ...(type==='modifier'?{modifier_title:'Notre variante',modifier_text:'Variante exacte 5 à découvrir à deux.'}:{})};
    world.occasionRolls.push(data);
   }
  }else return route.fallback();
  await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error:null})});
 });
 await value.page.reload();
 await value.page.locator('.settings-editorial').waitFor();
 return {...value,world};
}
async function snapshot(page,name,scroller){
 if(await page.locator('.occasion-premium-card canvas').count()){
  await page.waitForFunction(()=>[...document.querySelectorAll('.occasion-premium-card canvas')]
   .every(canvas=>canvas.dataset.webglReady==='true'&&canvas.loveRollDie),null,{timeout:20000});
 }
 const measurement=await page.evaluate(selector=>{
  const rect=element=>{
   const r=element.getBoundingClientRect();
   return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
  };
  const scroll=document.querySelector(selector);
  return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,
   pageHeight:document.documentElement.scrollHeight,nav:rect(document.querySelector('.nav')),
   scroll:{...rect(scroll),scrollHeight:scroll.scrollHeight,overflow:getComputedStyle(scroll).overflowY},
   title:document.querySelector('.editorial-title h1,.evening-cal-head h2')?.textContent,
   dice:[...document.querySelectorAll('.occasion-premium-card canvas')].map(canvas=>({
    sides:Number(canvas.dataset.diceSides),face:Number(canvas.dataset.face),
    renderer:canvas.loveRollDie?.readState(),...rect(canvas)}))};
 },scroller);
 await page.screenshot({path:'design-captures/secondary127-'+name+'.png'});
 metrics.push({name,...measurement});
 assert.ok(measurement.pageWidth<=measurement.width+1,'No horizontal overflow: '+JSON.stringify({name,measurement}));
 assert.ok(measurement.scroll.width>0&&measurement.scroll.height>0,'The actual content panel must have room: '+name);
 if(scroller==='.occasion-detail-scroll'){
  assert.ok(measurement.pageHeight<=measurement.height+1,'Occasion content must scroll inside its page: '+JSON.stringify({name,measurement}));
  assert.ok(measurement.scroll.left>=-1&&measurement.scroll.right<=measurement.width+1);
 }
 return measurement;
}
async function actionable(page,selector,minimum=44){
 const control=page.locator(selector);
 assert.equal(await control.count(),1,'One action is expected: '+selector);
 await control.scrollIntoViewIfNeeded();
 await control.click({trial:true});
 const fit=await control.evaluate(element=>{
  const r=element.getBoundingClientRect();
  const owner=element.closest('.occasion-detail-scroll,.evening-calendar-shell');
  const clip=owner&&['auto','scroll','hidden'].includes(getComputedStyle(owner).overflowY)?owner.getBoundingClientRect():{top:0,bottom:innerHeight};
  return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,
   viewport:innerWidth,clipTop:Math.max(0,clip.top),clipBottom:Math.min(innerHeight,clip.bottom),
   name:element.getAttribute('aria-label')||element.textContent.trim()};
 });
 assert.ok(fit.name,'The action must have an accessible name: '+selector);
 assert.ok(fit.width>=minimum&&fit.height>=minimum,'Touch target: '+JSON.stringify({selector,fit}));
 assert.ok(fit.left>=-1&&fit.right<=fit.viewport+1&&fit.top>=fit.clipTop-1&&fit.bottom<=fit.clipBottom+1,
  'The complete action must be reachable: '+JSON.stringify({selector,fit}));
}
async function calendar(page,label,{solo=false}={}){
 if(solo){
  await actionable(page,'.nav [data-action="tab:personal-journal"]');
  await page.locator('.nav [data-action="tab:personal-journal"]').click();
 }else{
  await page.locator('[data-action="settings-page:confidentialite"]').click();
  await actionable(page,'[data-action="evening-calendar:settings"]');
  await page.locator('[data-action="evening-calendar:settings"]').click();
 }
 await page.locator('#app.loveroll-evening-calendar-page').waitFor();
 assert.equal(await page.locator('.evening-cal-head h2').innerText(),'Notre calendrier');
 assert.match(await page.locator('.evening-cal-toolbar h3').innerText(),/octobre 2026/i);
 assert.equal(await page.locator('.evening-cal-day').count(),31);
 assert.doesNotMatch(await page.locator('#app').innerText(),/phrase secrète|Déverrouiller|Définir ma phrase/i);
 assert.equal(await page.locator('input[type="password"],#personal-pass,#journal-pass').count(),0);
 await snapshot(page,label+(solo?'-solo-calendar':'-settings-calendar'),'.evening-calendar-shell');
 await actionable(page,'[data-action="evening-month-next"]',24);
 await page.locator('[data-action="evening-month-next"]').click();
 assert.match(await page.locator('.evening-cal-toolbar h3').innerText(),/novembre 2026/i);
 await page.locator('[data-action="evening-month-prev"]').click();
 await actionable(page,'[data-action="evening-date:2026-10-17"]',24);
 await page.locator('[data-action="evening-date:2026-10-17"]').click();
 assert.equal(await page.locator('[data-action="evening-date:2026-10-17"]').getAttribute('aria-pressed'),'true');
 const back='.evening-cal-return[data-action="settings-page:confidentialite"]';
 await actionable(page,back);
 await page.locator(back).click();
 assert.match(await page.locator('.editorial-title h1').innerText(),/confidentialité/i);
 assert.equal(await page.locator('[data-action="evening-calendar:settings"]').count(),1);
 console.log('SECONDARY_CALENDAR_OK',label,solo?'solo alias':'settings entry and return');
}
async function openOccasion(page,kind='anniversary'){
 await page.locator('.nav [data-action="tab:special"]').click();
 await page.locator('[data-action="edit-surprise-event:'+kind+':-"]').click();
 const open='[data-action="open-occasion:'+kind+':-"]';
 await actionable(page,open);
 await page.locator(open).click();
 await page.locator('#app.loveroll-occasion-details').waitFor();
 assert.equal(await page.locator('.surprise-edit-modal').count(),0,'The event editor must give way to one details page');
 assert.equal(await page.locator('.nav button.active').innerText(),'Surprise');
}
async function roll(page,type){
 const action='[data-action="occasion-roll:anniversary:-:'+type+'"]';
 await actionable(page,action);
 await page.locator(action).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.occasion-premium-card canvas')]
  .every(canvas=>canvas.dataset.spinning==='false')&&!document.querySelector('.nav button:disabled'));
 await page.locator(action).waitFor({state:'detached'});
}
async function officialFace(page,sides,face){
 const canvas=page.locator('.occasion-premium-card canvas[data-dice-sides="'+sides+'"][data-face="'+face+'"]');
 assert.equal(await canvas.count(),1);
 const state=await canvas.evaluate(element=>element.loveRollDie.readState());
 assert.equal(state.frontFace,face,'The visible 3D face must match the synthetic official result');
 assert.equal(state.spinning,false);
}
(async()=>{
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,
  ...(process.env.LOVEROLL_BROWSER_EXECUTABLE?{executablePath:process.env.LOVEROLL_BROWSER_EXECUTABLE}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const [label,width,height] of layouts){
   const {page,context,world,errors}=await setup(browser,width,height);
   try{
    await calendar(page,label);
    assert.ok(!world.audit.some(req=>req.write||/^(save_|roll_|set_|delete_|import_|reset_)/.test(req.name||'')),'Calendar navigation must never write');
    await openOccasion(page);
    assert.match(await page.locator('.occasion-date').innerText(),/17 octobre 2026 · Disponible aujourd’hui/);
    assert.equal(await page.locator('.occasion-premium-card canvas[data-dice-sides="20"]').count(),1);
    await snapshot(page,label+'-occasion-D20-ready','.occasion-detail-scroll');
    await roll(page,'surprise');
    assert.equal(await page.locator('.occasion-premium-card canvas[data-dice-sides="20"][data-face="17"]').count(),1);
    assert.match(await page.locator('.occasion-premium-card').innerText(),/L’enveloppe rouge/);
    await snapshot(page,label+'-occasion-D20-result','.occasion-detail-scroll');
    await officialFace(page,20,17);
    await actionable(page,'[data-action="occasion-back"]');
    await page.locator('[data-action="occasion-back"]').click();
    await page.locator('.surprise-ecrin').waitFor();
    await openOccasion(page,'valentine');
    assert.equal(await page.locator('.occasion-availability').count(),1);
    assert.equal(await page.locator('[data-action^="occasion-roll:"]').count(),0);
    await snapshot(page,label+'-occasion-upcoming','.occasion-detail-scroll');

    // Switch only synthetic fixture rows, then reload through the actual app.
    world.occasionRolls=[];world.specialKeys=['anniversaire_de_couple'];
    await page.reload();await page.locator('.settings-editorial').waitFor();
    await openOccasion(page);
    assert.equal(await page.locator('.occasion-premium-card canvas[data-dice-sides="6"]').count(),1);
    await snapshot(page,label+'-occasion-D6-ready','.occasion-detail-scroll');
    await roll(page,'activity');
    assert.match(await page.locator('.occasion-premium-card').innerText(),/Activité préparée 2 pour notre rendez-vous/);
    assert.equal(await page.locator('.occasion-premium-card canvas[data-dice-sides="6"][data-face="2"]').count(),1);
    await snapshot(page,label+'-occasion-D6-activity','.occasion-detail-scroll');
    await officialFace(page,6,2);
    await roll(page,'modifier');
    assert.match(await page.locator('.occasion-premium-card').innerText(),/Variante exacte 5 à découvrir à deux/);
    assert.equal(await page.locator('.occasion-premium-card canvas[data-dice-sides="6"][data-face="5"]').count(),1);
    assert.equal(await page.locator('[data-action^="occasion-roll:"]').count(),0);
    await snapshot(page,label+'-occasion-D6-complete','.occasion-detail-scroll');
    await officialFace(page,6,2);await officialFace(page,6,5);
    await actionable(page,'.occasion-detail-scroll>.editorial-row');
    await snapshot(page,label+'-occasion-D6-modifier-visible','.occasion-detail-scroll');
    const simulatedRolls=world.audit.filter(req=>req.name==='roll_love_occasion_once');
    assert.deepEqual(simulatedRolls.map(req=>req.args.p_roll),['surprise','activity','modifier']);
    assert.ok(!world.audit.some(req=>req.write||/^(save_|set_|delete_|import_|reset_)/.test(req.name||'')),'Only the three explicitly simulated rolls may write');
    assert.deepEqual(errors,[]);
    console.log('SECONDARY_OCCASIONS_OK',label,'D20, upcoming, D6 activity and modifier, accessible actions');
   }finally{await context.close();}
   const solo=await setup(browser,width,height,true);
   try{await calendar(solo.page,label,{solo:true});assert.deepEqual(solo.errors,[]);}
   finally{await solo.context.close();}
  }
 }finally{
  fs.writeFileSync('design-captures/secondary127-metrics.json',JSON.stringify(metrics,null,2));
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
