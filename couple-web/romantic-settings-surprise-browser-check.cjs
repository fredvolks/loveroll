// Real production application, safe synthetic API, no live account writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const client=`export function createClient(){
 const uid=new URL(location.href).searchParams.get('actor')||'a',user={id:uid,email:uid+'@test.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'};
 const call=async(body)=>{const r=await fetch('/__romantic-fixture',{method:'POST',body:JSON.stringify({...body,uid})});return r.json()};
 return {auth:{getUser:async()=>({data:{user},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from(table){const filters=[];return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},then(ok,fail){return call({table,filters}).then(ok,fail)}}},
 rpc:(name,args)=>call({name,args}),channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{}};
}`;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).slice(0,7);
 const world={rolls:[],calls:[],profiles:[{id:'a',display_name:'Camille',birthday_md:'04-12',gender:'him'},{id:'b',display_name:'Noémie',birthday_md:'04-13',gender:'her'}],couple:{id:'c',owner_user_id:'a',show_sensuel_button:true,show_sexuel_button:true},settings:{couple_id:'c',anniversary_md:'10-20',birthday_by_user:{a:'04-12',b:'04-13'}}};
 const roll=(kind,face)=>({id:kind+'-test',couple_id:'c',key:month,kind,face,actor:'a',created_at:new Date().toISOString(),activity_title:kind==='monthly_activity'?'Le rendez-vous officiel':null,activity_description:'Description intégrale enregistrée.\nCette ligne est conservée.',activity_timer_minutes:7});
 const errors=[],contexts=[];fs.mkdirSync('design-captures',{recursive:true});
 async function setup(width,height,uid='a',motion='reduce',tab='special'){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:width<768,hasTouch:width<900,reducedMotion:motion});contexts.push(context);
  if(process.env.LOVEROLL_LOCAL_FILES)await context.route('http://127.0.0.1:8765/**',async route=>{
   let name=new URL(route.request().url()).pathname;if(name==='/')name='/index.html';
   const file=path.join(process.cwd(),'couple-web',name),types={'.html':'text/html','.css':'text/css','.mjs':'application/javascript','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   if(process.env.LOVEROLL_LAYOUT_ONLY&&name==='/dice3d.js')return route.fulfill({contentType:'application/javascript',body:'export function dieOn(){return ()=>{}}'});
   await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await context.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:client}));
  await context.route('**/__romantic-fixture',async route=>{
   const req=JSON.parse(route.request().postData()),{uid,name,args={}}=req;let data=[],error=null;
   if(req.table){const tables={couple_profiles:world.profiles,love_wellbeing:[{user_id:uid,relationship:'well',intimacy:'well'}],couple_members:world.profiles.map((p,i)=>({user_id:p.id,couple_id:'c',joined_at:'2026-10-0'+(i+1)+'T00:00:00Z'})),couples:[world.couple],couple_rolls:world.rolls,couple_occasion_settings:[world.settings]};data=tables[req.table]||[];for(const [k,v] of req.filters)data=data.filter(r=>r[k]===v);}
   else{
    world.calls.push({uid,name,args});
    if(name==='get_love_guidance')data='gentle';
    if(name==='love_advent_server_date')data='2026-10-17';
    if(name==='my_love_evening_card_totals')data=[{sensual:100,sexual:100,total:200}];
    if(name==='roll_couple_once'){data=world.rolls.find(r=>r.kind===args.p_kind);if(!data){data=roll(args.p_kind,args.p_kind==='monthly_activity'?19:4);world.rolls.push(data);}await new Promise(r=>setTimeout(r,200));}
    if(name==='complete_love_registration'){const p=world.profiles.find(p=>p.id===uid);p.display_name=args.p_name;p.birthday_md=args.p_birthday_md;data=p;}
    if(name==='save_my_gender'){world.profiles.find(p=>p.id===uid).gender=args.p_gender;data=true;}
    if(name==='save_love_evening_buttons'){world.couple.show_sensuel_button=args.p_sensuel;world.couple.show_sexuel_button=args.p_sexuel;data=true;}
    if(name==='save_love_surprise_event'){world.settings.surprise_event_overrides={...world.settings.surprise_event_overrides,[args.p_slot]:{title:args.p_title,month_day:args.p_month_day}};data=true;}
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error})});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/?'+(tab==='settings'?'settings=1':'open='+tab)+'&actor='+uid);
  await page.locator(tab==='settings'?'.settings-editorial':'.surprise-ecrin').waitFor();
  if(!process.env.LOVEROLL_LAYOUT_ONLY&&tab==='special')await page.waitForFunction(()=>document.querySelector('.surprise-main-die-scene canvas')?.loveRollDie);
  await page.waitForTimeout(200);return page;
 }
 const geometry=page=>page.evaluate(()=>{
  const rect=e=>e.getBoundingClientRect(),nav=rect(document.querySelector('.nav'));
  const rows=[...document.querySelectorAll('.surprise-event-card,.settings-section-row')];
  return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,
   navBottom:nav.bottom,navTop:nav.top,columns:new Set(rows.map(e=>Math.round(rect(e).left))).size,rows:new Set(rows.map(e=>Math.round(rect(e).top))).size,
   bottom:Math.max(...rows.map(e=>rect(e).bottom)),touch:Math.min(...rows.map(e=>rect(e).height)),
   textFits:[...document.querySelectorAll('.surprise-event-title,.surprise-event-days,.settings-section-row strong,.settings-section-row small')].every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),
   bad:rows.flatMap(e=>[...e.querySelectorAll('span')].filter(c=>rect(c).bottom>rect(e).bottom+1).map(c=>({cls:c.className,text:c.textContent,bottom:rect(c).bottom,parent:rect(e).bottom}))),
   contentFits:rows.every(e=>[...e.querySelectorAll('span')].every(c=>rect(c).bottom<=rect(e).bottom+1)),
   buttonBottom:document.querySelector('.surprise-month>.surprise-primary')?rect(document.querySelector('.surprise-month>.surprise-primary')).bottom:0,
   sceneHeight:document.querySelector('.surprise-main-die-scene')?rect(document.querySelector('.surprise-main-die-scene')).height:0};
 });
 try{
  for(const [name,w,h] of [['small',360,640],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['PC',1366,768]]){
   for(const phase of (process.env.LOVEROLL_SETTINGS_ONLY?[]:['before','host','done'])){
    world.rolls=phase==='before'?[]:[roll('monthly_activity',19),...(phase==='done'?[roll('monthly_host',4)]:[])];
    const page=await setup(w,h);const g=await geometry(page);
    assert.ok(g.scroll<=2&&g.horizontal<=1&&g.navBottom<=h+1&&g.bottom<=g.navTop&&g.buttonBottom<=g.navTop,JSON.stringify({name,phase,...g}));
    assert.ok(g.textFits&&g.contentFits&&g.touch>=44&&g.sceneHeight>=70,JSON.stringify({name,phase,...g}));
    assert.equal(g.columns,3);assert.equal(g.rows,2);assert.equal(await page.locator('.surprise-event-card').count(),6);
    assert.equal(await page.locator('.surprise-main-die-scene canvas').count(),1);
    assert.equal(await page.locator('.surprise-month-title,.surprise-ecrin-note,.surprise-events-heading p').count(),0);
    assert.equal(await page.locator('.surprise-main-die-scene .surprise-month-label').count(),1);
    const frame=await page.locator('.surprise-main-die-scene').evaluate(e=>{const r=e.getBoundingClientRect(),gallery=e.closest('.surprise-gallery').getBoundingClientRect(),s=getComputedStyle(e);return {border:parseFloat(s.borderTopWidth),radius:parseFloat(s.borderTopLeftRadius),top:r.top,outerTop:gallery.top};});
    assert.equal(frame.border,1);assert.equal(frame.radius,20);assert.ok(Math.abs(frame.top-frame.outerTop)<=1,'Photo must begin at the top of the shared gallery '+JSON.stringify(frame));
    assert.equal(await page.locator('.nav button.active').innerText(),'Surprise');
    await page.screenshot({path:'design-captures/ecrin-'+name+'-'+phase+'.png'});console.log('ECRIN_VIEWPORT_OK',name,phase,JSON.stringify(g));await page.context().close();
   }
   const page=await setup(w,h,'a','reduce','settings'),g=await geometry(page);
   assert.ok(g.scroll<=2&&g.horizontal<=1&&g.bottom<=g.navTop&&g.touch>=44&&g.textFits,JSON.stringify({name,...g}));
   assert.equal(await page.locator('.settings-profile-row').count(),1);assert.equal(await page.locator('.settings-section-row').count(),5);
   assert.equal(await page.locator('.settings-profile-row strong').innerText(),'Camille');
   assert.equal(await page.locator('.settings-sections [data-action="settings-page:compte"]').count(),0);
   await page.screenshot({path:'design-captures/settings-editorial-'+name+'.png'});await page.context().close();
  }
  if(process.env.LOVEROLL_LAYOUT_ONLY&&!process.env.LOVEROLL_SETTINGS_ONLY){console.log('LAYOUT_ONLY_OK');return;}
  world.rolls=[];const startTab=process.env.LOVEROLL_SETTINGS_ONLY?'settings':'special';
  const a=await setup(412,824,'a','no-preference',startTab),b=await setup(393,852,'b','reduce',startTab);
  if(!process.env.LOVEROLL_SETTINGS_ONLY){
  await a.waitForFunction(()=>document.querySelector('.surprise-main-die-scene canvas')?.loveRollDie);
  await a.evaluate(()=>window.__firstCanvas=document.querySelector('.surprise-main-die-scene canvas'));
  await a.locator('[data-action="roll:monthly_activity"]').evaluate(e=>{e.click();e.click()});
  await a.waitForFunction(()=>window.__firstCanvas?.dataset.spinning==='true');
  assert.ok(await a.evaluate(()=>window.__firstCanvas.isConnected));assert.equal(await a.locator('.nav [data-action="tab:home"]').isDisabled(),true);assert.equal(world.calls.filter(c=>c.name==='roll_couple_once'&&c.args.p_kind==='monthly_activity').length,1);
  await a.waitForFunction(()=>window.__firstCanvas?.loveRollDie?.readState().spinning===false);
  assert.equal(await a.locator('[aria-label="Notre activité du mois"]').count(),0);
  assert.equal(await a.evaluate(()=>window.__firstCanvas.loveRollDie.readState().frontFace),19);
  await a.locator('[aria-label="Notre activité du mois"]').waitFor();assert.ok(await a.evaluate(()=>window.__firstCanvas.isConnected));
  await a.locator('[aria-label="Notre activité du mois"] [data-action="surprise-activity"]').click();
  await a.waitForFunction(()=>document.querySelector('.surprise-main-die-scene canvas')?.loveRollDie&&document.querySelector('.surprise-main-die-scene canvas').dataset.diceSides==='6');
  await a.evaluate(()=>window.__hostCanvas=document.querySelector('.surprise-main-die-scene canvas'));
  await a.locator('[data-action="roll:monthly_host"]').evaluate(e=>{e.click();e.click()});
  await a.waitForFunction(()=>window.__hostCanvas?.dataset.spinning==='true');assert.ok(await a.evaluate(()=>window.__hostCanvas.isConnected));
  await a.waitForFunction(()=>window.__hostCanvas?.loveRollDie?.readState().spinning===false);
  assert.ok(await a.evaluate(()=>window.__hostCanvas.isConnected));assert.equal(await a.evaluate(()=>window.__hostCanvas.loveRollDie.readState().frontFace),4);
  await a.locator('.surprise-host-winner').waitFor();assert.equal(await a.locator('.nav [data-action="tab:home"]').isDisabled(),false);assert.match(await a.locator('.surprise-host-winner').innerText(),/Camille invite/);
  assert.equal(world.calls.filter(c=>c.name==='roll_couple_once'&&c.args.p_kind==='monthly_host').length,1);
  await a.waitForFunction(()=>document.querySelector('.surprise-main-die-scene canvas')?.loveRollDie?.readState().frontFace===19);
  const q=await a.evaluate(()=>document.querySelector('.surprise-main-die-scene canvas').loveRollDie.readState().quaternion);await a.waitForTimeout(700);
  assert.deepEqual(await a.evaluate(()=>document.querySelector('.surprise-main-die-scene canvas').loveRollDie.readState().quaternion),q);
  await b.reload();await b.locator('.surprise-host-winner').waitFor();assert.match(await b.locator('.surprise-host-winner').innerText(),/Camille invite/);
  await a.locator('[data-action="edit-surprise-event:anniversary:-"]').click();await a.locator('#surprise-event-name').fill('Notre date personnalisée');await a.locator('#surprise-event-date').fill('20/11/2026');
  await a.locator('[data-action="save-surprise-event"]').click();await a.locator('.surprise-edit-modal').waitFor({state:'detached'});assert.match(await a.locator('.surprise-special-grid').innerText(),/Notre date personnalisée/);
  }
  await a.locator('.nav [data-action="tab:settings"]').click();
  await a.locator('[data-action="settings-page:compte"]').click();assert.equal(await a.locator('#profile-gender').inputValue(),'him');assert.equal(await a.locator('input[readonly]').inputValue(),'a@test.invalid');
  await a.locator('#profile-name').fill('Camille André');await a.locator('#profile-gender').selectOption('her');await a.locator('[data-action="profile"]').click();
  await a.waitForFunction(()=>document.querySelector('#profile-name')?.defaultValue==='Camille André');
  assert.ok(!world.calls.some(c=>c.name==='save_my_wellbeing'));
  await a.locator('[data-action="settings-page:"]').click();await a.locator('[data-action="settings-page:jeu"]').click();
  assert.equal(await a.locator('.settings-link-row[data-action^="tab:"]').count(),4);
  await a.locator('#show-sensuel-button').uncheck();await a.locator('#show-sexuel-button').uncheck();await a.locator('[data-action="save-evening-buttons"]').click();
  await a.waitForFunction(()=>document.querySelector('#show-sensuel-button')?.defaultChecked===false);
  assert.equal(world.couple.show_sexuel_button,false);await a.locator('[data-action="settings-page:admin"]').click();assert.equal(await a.locator('[data-action="admin-reset-all-dice"]').count(),1);
  await a.locator('[data-action="settings-page:jeu"]').click();await a.locator('[data-action="settings-page:"]').click();
  for(const key of ['couple','notifications','confidentialite','application']){
   await a.locator('[data-action="settings-page:'+key+'"]').click();assert.equal(await a.locator('.nav button.active').innerText(),'Réglages');
   assert.doesNotMatch(await a.locator('.settings-detail-body').innerText(),/Mon ressenti|Comment va votre sexualité|Comment vivez-vous votre relation/);
   if(key==='notifications')assert.equal(await a.locator('.push-option').count(),4);
   await a.locator('[data-action="settings-page:"]').click();
  }
  await b.locator('.nav [data-action="tab:settings"]').click();await b.locator('[data-action="settings-page:jeu"]').click();
  assert.equal(await b.locator('[data-action="settings-page:admin"]').count(),0);assert.equal(await b.locator('#show-sensuel-button').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log(process.env.LOVEROLL_SETTINGS_ONLY?'SETTINGS_ROUTES_OK profile, five routes, permissions, categories, no questionnaire':'ROMANTIC_FLOW_OK D20/D6 official faces, pause, persistent canvas, parity, shared result, event editor, profile, five routes, permissions, categories, no questionnaire');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
