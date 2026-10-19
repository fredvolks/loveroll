// Production application, two isolated identities; all user writes stay in a simulated API.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const client=`export function createClient(){
 const uid=new URL(location.href).searchParams.get('actor')||'a',user={id:uid,email:uid+'@test.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'};
 const call=async(body)=>{const r=await fetch('/__advent-fixture',{method:'POST',body:JSON.stringify({...body,uid})});return r.json()};
 return {auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from(table){const filters=[];return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},then(ok,fail){return call({table,filters}).then(ok,fail)}}},
 rpc:(name,args)=>call({name,args}),channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{}};
}`;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const world={date:'2026-11-30',openings:[],calls:[],openDelay:0},members=[{user_id:'a',name:'Camille'},{user_id:'b',name:'Noémie'}];
 const record=(day,year=2026)=>({couple_id:'c',year,day,opened_by:'a',opened_at:'2026-12-10T18:05:00Z',advent_title:'Lettre officielle '+day,advent_type:'Romantique',advent_description:'Texte officiel '+day+'.\n  Cette ligne reste inchangée. ',advent_timer_minutes:day%2===1?7:null});
 const errors=[],contexts=[];fs.mkdirSync('design-captures',{recursive:true});
 async function setup(width,height,uid='a',motion='reduce'){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:width<768,hasTouch:width<900,reducedMotion:motion});contexts.push(context);
  // Local executor option: serve the same files through interception if sockets are isolated.
  if(process.env.LOVEROLL_LOCAL_FILES)await context.route('http://127.0.0.1:8765/**',async route=>{
   let name=new URL(route.request().url()).pathname;if(name==='/')name='/index.html';
   const file=path.join(process.cwd(),'couple-web',name),types={'.html':'text/html','.css':'text/css','.mjs':'application/javascript','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await context.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:client}));
  await context.route('**/__advent-fixture',async route=>{
   const req=JSON.parse(route.request().postData()),{uid,name,args={}}=req;let data=[],error=null;
   if(req.table){const tables={couple_profiles:members.map(m=>({id:m.user_id,display_name:m.name,birthday_md:'04-12',gender:m.user_id==='a'?'him':'her'})),love_wellbeing:[{user_id:uid,relationship:'well',intimacy:'well'}],couple_members:members.map((m,i)=>({...m,couple_id:'c',joined_at:'2026-10-0'+(i+1)+'T00:00:00Z'})),couples:[{id:'c',owner_user_id:'a',journal_salt:'test-only',show_sensuel_button:true,show_sexuel_button:true}],couple_advent:world.openings};data=tables[req.table]||[];for(const [k,v] of req.filters)data=data.filter(r=>r[k]===v);}
   else{
    if(name==='get_love_guidance')data='gentle';
    if(name==='love_advent_server_date')data=world.date;
    if(name==='my_love_evening_card_totals')data=[{sensual:100,sexual:100,total:200}];
    if(name==='open_advent_day'){
     world.calls.push({uid,...args});const d=args.p_year+'-12-'+String(args.p_day).padStart(2,'0');
     if(d>world.date)error={message:'Cette lettre sera disponible plus tard',code:'22023'};
     else{data=world.openings.find(r=>r.year===args.p_year&&r.day===args.p_day);if(!data){data={...record(args.p_day,args.p_year),opened_by:uid};world.openings.push(data);}}
     if(world.openDelay)await new Promise(r=>setTimeout(r,world.openDelay));
    }
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error})});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/?open=advent&actor='+uid);await page.locator('.advent-letters').waitFor();return page;
 }
 try{
  for(const [name,w,h] of [['small',360,640],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['PC',1366,768],['wide',1440,900]]){
   world.date='2026-12-10';world.openings=[record(1)];const page=await setup(w,h);
   const g=await page.evaluate(()=>{
    const rect=e=>e.getBoundingClientRect(),nav=rect(document.querySelector('.nav')),tiles=[...document.querySelectorAll('.advent-box')].map(rect);
    const primary=rect(document.querySelector('.advent-primary')),footer=rect(document.querySelector('.advent-footer'));
    return {scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,nav:nav.bottom,primary:primary.bottom,footer:footer.bottom,navTop:nav.top,
     columns:new Set(tiles.map(r=>Math.round(r.left))).size,rows:new Set(tiles.map(r=>Math.round(r.top))).size,
     minWidth:Math.min(...tiles.map(r=>r.width)),minHeight:Math.min(...tiles.map(r=>r.height)),last:Math.max(...tiles.map(r=>r.bottom)),
     textFits:[...document.querySelectorAll('.advent-state-label')].every(e=>e.scrollWidth<=e.clientWidth+1),
     labelSize:parseFloat(getComputedStyle(document.querySelector('.advent-state-label')).fontSize)};
   });
   assert.equal(await page.locator('.advent-box').count(),25);assert.equal(g.columns,5);assert.equal(g.rows,5);
   assert.ok(g.scroll<=2&&g.horizontal<=1&&g.nav<=h+1,JSON.stringify({name,...g}));
   assert.ok(g.minWidth>=44&&g.minHeight>=44&&g.labelSize>=11,JSON.stringify({name,...g}));
   assert.ok(g.primary<=g.navTop&&g.footer<=g.navTop&&g.last<=g.navTop&&g.textFits,JSON.stringify({name,...g}));
   assert.equal(await page.locator('.nav button.active').innerText(),'Avent');assert.equal(await page.locator('.nav [data-action="tab:settings"] svg').count(),1);
   assert.equal(await page.locator('.advent-box.overdue').count(),8);assert.equal(await page.locator('.advent-box.locked').count(),15);
   assert.equal(await page.locator('[data-action="advent-locked:11"]').isDisabled(),true);
   await page.screenshot({path:'design-captures/advent-letters-'+name+'.png'});console.log('ADVENT_LETTERS_VIEWPORT_OK',name,JSON.stringify(g));
   await page.context().close();
  }
  world.date='2026-11-30';world.openings=[];const a=await setup(412,824,'a','no-preference'),b=await setup(393,852,'b','reduce');
  assert.equal(await a.locator('.advent-box.locked').count(),25);assert.ok(await a.locator('.advent-primary').isDisabled());
  world.date='2026-12-10';world.openings=[record(1)];await Promise.all([a.reload(),b.reload()]);
  await a.locator('.advent-box.available').waitFor();await b.locator('.advent-box.available').waitFor();
  await a.bringToFront();world.openDelay=300;
  await a.locator('[data-action="advent-open:3"]').evaluate(e=>{e.click();e.click()});
  await a.locator('.opening-pending').waitFor();assert.equal(await a.locator('.advent-reveal').count(),0);
  await a.waitForFunction(()=>{
   const e=document.querySelector('.advent-box.opening .advent-letter-paper');
   return e&&parseFloat(getComputedStyle(e).opacity)>0;
  },null,{timeout:5000});
  await a.screenshot({path:'design-captures/advent-letters-opening.png'});
  await a.locator('.advent-reveal').waitFor();assert.equal(world.calls.filter(c=>c.p_day===3).length,1,'Double tap sent two RPCs');
  assert.equal(await a.locator('#advent-letter-title').textContent(),'Lettre officielle 3');
  assert.equal(await a.locator('.advent-description').textContent(),'Texte officiel 3.\n  Cette ligne reste inchangée. ');
  await a.locator('#challenge-timer-toggle').click();await a.waitForFunction(()=>document.querySelector('#challenge-timer-status')?.textContent==='En cours');
  await a.screenshot({path:'design-captures/advent-letters-reveal-timer.png'});
  await a.locator('#challenge-timer-toggle').click();await a.locator('[data-action="advent-close"]').click();
  // No websocket callback: the real fallback probe must bring the other account up to date.
  await b.locator('[data-action="advent-view:3"]').waitFor({timeout:20000});
  await b.locator('[data-action="advent-view:3"]').click();assert.equal(await b.locator('#advent-letter-title').textContent(),'Lettre officielle 3');
  await b.locator('[data-action="advent-close"]').click();world.openDelay=0;
  for(const day of [2,4]){
   await a.locator('[data-action="advent-open:'+day+'"]').click();await a.locator('.advent-reveal').waitFor();
   assert.equal(await a.locator('.timer-panel').count(),0);await a.screenshot({path:'design-captures/advent-letters-reveal-no-timer.png'});
   await a.locator('[data-action="advent-close"]').click();
  }
  await a.locator('.advent-primary').click();await a.locator('.advent-reveal').waitFor();
  assert.equal(await a.locator('#advent-letter-title').textContent(),'Lettre officielle 10');await a.locator('[data-action="advent-close"]').click();
  assert.equal(await a.locator('.advent-primary').textContent(),'Relire notre surprise du jour');
  const before=world.calls.length;await a.locator('.advent-primary').click();await a.locator('.advent-reveal').waitFor();assert.equal(world.calls.length,before);await a.locator('[data-action="advent-close"]').click();
  await b.reload();await b.locator('[data-action="advent-open:7"]').waitFor();
  await Promise.all([a.locator('[data-action="advent-open:7"]').click(),b.locator('[data-action="advent-open:7"]').click()]);
  await Promise.all([a.locator('.advent-reveal').waitFor(),b.locator('.advent-reveal').waitFor()]);
  assert.equal(world.openings.filter(r=>r.day===7).length,1);assert.equal(await a.locator('.advent-opened-by').textContent(),await b.locator('.advent-opened-by').textContent());
  await a.locator('[data-action="advent-close"]').click();world.date='2026-12-26';await a.reload();
  await a.locator('[data-action="advent-open:25"]').click();await a.locator('.advent-reveal').waitFor();await a.locator('[data-action="advent-close"]').click();
  world.date='2027-01-10';await a.reload();await a.locator('[data-action="advent-open:24"]').click();await a.locator('.advent-reveal').waitFor();
  assert.equal(world.calls.at(-1).p_year,2026);assert.match(await a.locator('.advent-reveal-heading').textContent(),/2026/);
  assert.deepEqual(errors,[]);console.log('ADVENT_TWO_IDENTITIES_OK before/current/catch-up/multiple/future/reopen/after25/nextyear/concurrent/timers/reduced-motion/fallback-sync');
 }finally{await Promise.all(contexts.map(c=>c.close().catch(()=>{})));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
