// Production app + two independent browser identities against a shared simulated
// RPC boundary. Real Supabase auth/RLS are not replaced or written by this test.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const client=`export function createClient(){
 const uid=new URL(location.href).searchParams.get('actor')||'a';
 const user={id:uid,email:uid+'@test.invalid',email_confirmed_at:'2026-10-01T00:00:00Z'};
 const call=async(body)=>{const r=await fetch('/__loveroll-fixture',{method:'POST',body:JSON.stringify({...body,uid})});return r.json()};
 return {auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from(table){const filters=[];return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},then(ok,fail){return call({table,filters}).then(ok,fail)}}},
 rpc:(name,args)=>call({name,args}),channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{}};
}`;
(async()=>{
 const {sharedEveningTurns}=await import('./evening-turns.mjs');
 const members=[{user_id:'a',name:'Camille'},{user_id:'b',name:'Noémie'}],now=new Date();
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const mon=new Date(local+'T12:00:00Z');mon.setUTCDate(mon.getUTCDate()-((mon.getUTCDay()+6)%7));
 const world={sessions:[],rolls:[],cards:[],gifts:[],reviews:[],calls:[]};let serial=0;
 const board=()=>{const b=sharedEveningTurns(world.sessions[0],members,world.rolls,world.cards,world.gifts);return {...b,pending:null};};
 const stats=()=>members.map(m=>({session_id:'s',user_id:m.user_id,target:board().targets?.[m.user_id]||0,drawn:world.cards.filter(c=>c.recipient===m.user_id).length,completed:world.cards.filter(c=>c.recipient===m.user_id&&c.status==='completed').length}));
 const tables=uid=>({
  couple_profiles:members.map(m=>({id:m.user_id,display_name:m.name,birthday_md:'04-12',gender:m.user_id==='a'?'him':'her'})),
  love_wellbeing:[{user_id:uid,relationship:'well',intimacy:'well'}],
  couple_members:members.map((m,i)=>({...m,couple_id:'c',joined_at:'2026-10-0'+(i+1)+'T00:00:00Z'})),
  couples:[{id:'c',owner_user_id:'a',journal_salt:'safe-test',show_sensuel_button:true,show_sexuel_button:true}],
  couple_rolls:[{id:'w',couple_id:'c',kind:'weekly',key:mon.toISOString().slice(0,10),face:2,actor:'a',created_at:now.toISOString()}],
  couple_sessions:world.sessions,couple_personal_rolls:world.rolls,
  couple_challenges:world.cards.filter(c=>c.recipient===uid),couple_challenge_gifts:world.gifts
 });
 async function serve(route){
  const req=JSON.parse(route.request().postData()),{uid,name,args={}}=req;let data=[];
  if(req.table){data=tables(uid)[req.table]||[];for(const [k,v] of req.filters)data=data.filter(r=>r[k]===v);}
  else{
   world.calls.push({uid,name,args});
   if(name==='get_love_guidance')data='gentle';
   if(name==='love_advent_server_date')data=local;
   if(name==='my_love_evening_card_totals')data=[{sensual:100,sexual:100,total:200}];
   if(name==='ensure_couple_session'){
    if(!world.sessions.length)world.sessions.push({id:'s',couple_id:'c',started_at:new Date().toISOString(),finished_at:null,paired_turns:true,self_draws:true,starting_user_id:'a',opened_by:'a'});
    data=world.sessions[0];
   }
   if(name==='roll_my_evening_d6'){
    data=world.rolls.find(r=>r.user_id===uid);
    if(!data){data={id:'d6-'+uid,session_id:'s',user_id:uid,face:uid==='a'?4:1};world.rolls.push(data);}
   }
   if(name==='my_love_roll_status')data=[{my_rolled:world.rolls.some(r=>r.user_id===uid),partner_rolled:world.rolls.some(r=>r.user_id!==uid),both_ready:world.rolls.length===2}];
   if(name==='my_love_evening_board')data=board();
   if(name==='give_love_challenge'){
    assert.ok(world.gifts.filter(g=>g.donor_user_id===uid).length<3);assert.ok(board().remaining[uid]>0);
    data={id:'g'+world.gifts.length,session_id:'s',couple_id:'c',donor_user_id:uid,receiver_user_id:uid==='a'?'b':'a',month_key:local.slice(0,7)};world.gifts.push(data);
   }
   if(['draw_for_partner','draw_for_partner_random'].includes(name)){
    assert.equal(board().next,uid);const face=[47,100,1,27,50][world.cards.length];
    data={id:'card-'+(++serial),session_id:'s',couple_id:'c',recipient:uid,offered_by:uid,face,category:args.p_preference==='SEXUEL'?'SEXUEL':'SENSUEL',card_title:'Défi privé '+uid+' '+face,card_description:'Consigne officielle du défi '+face+'. Prenez le temps de partager ce moment à deux.',card_timer_minutes:1,status:'proposed',created_at:new Date(Date.now()+serial*1000).toISOString()};world.cards.push(data);
   }
   if(name==='answer_challenge'){const c=world.cards.find(c=>c.id===args.p_id&&c.recipient===uid);assert.ok(c);c.status=args.p_status;data=c;}
   if(['finish_couple_session','close_love_evening_preserve'].includes(name)){world.sessions[0].finished_at=new Date().toISOString();world.sessions[0].counted=true;data=world.sessions[0];}
   if(name==='love_evening_session_stats')data=world.sessions[0]?.finished_at?stats():[];
   if(name==='love_evening_calendar_challenges')data=world.sessions[0]?.finished_at?world.cards:[];
   if(name==='love_evening_reviews_for_couple')data=world.reviews;
   if(name==='save_love_evening_review'){
    const r={session_id:'s',author_id:uid,overall:args.p_overall,connection:args.p_connection,appreciation:args.p_appreciation,again:args.p_again,comment:args.p_comment};world.reviews=world.reviews.filter(x=>x.author_id!==uid);world.reviews.push(r);data=r;
   }
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error:null})});
 }
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const pages=[];
  for(const uid of ['a','b']){
   const context=await browser.newContext({viewport:{width:412,height:824},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
   await page.route('**/__loveroll-fixture',serve);
   await page.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:client}));
   await page.goto('http://127.0.0.1:8765/?actor='+uid);await page.locator('.real-home-shell').waitFor();pages.push(page);
  }
  const [a,b]=pages;
  const diceReady=async p=>{await p.waitForFunction(()=>[...document.querySelectorAll('canvas[data-dice-sides]')].filter(c=>c.getBoundingClientRect().width>0&&c.getBoundingClientRect().height>0).every(c=>c.loveRollDie?.readState().renderedFrames>0));await p.waitForTimeout(250);};
  const session=async p=>{await p.reload();await p.locator('.real-home-shell').waitFor();await p.locator('[data-action="tab:session"]').click();};
  fs.mkdirSync('design-captures',{recursive:true});
  await a.locator('[data-action="tab:session"]').click();await diceReady(a);await a.screenshot({path:'design-captures/S25-editorial-intro.png'});
  await a.locator('[data-action="new-session"]').click();await a.locator('.is-waiting').waitFor();await diceReady(a);await a.screenshot({path:'design-captures/S25-editorial-step1.png'});
  assert.ok(await a.locator('[data-action="new-challenge"]').isDisabled());
  await a.locator('[data-action="my-d6"]').click();await a.locator('.evening-face-result strong').waitFor();
  assert.equal(await a.locator('.evening-face-result strong').textContent(),'4');
  await session(b);assert.ok((await b.locator('.evening-partner-mobile-status').textContent()).includes('Camille a obtenu 4 défis'));
  await b.locator('[data-action="my-d6"]').click();await b.locator('.evening-premium-view.is-ready').waitFor();
  await session(a);assert.equal(world.rolls.length,2);
  for(let i=0;i<3;i++){
   await a.locator('[data-action="give-challenge"]').click();await a.locator('.lr-dialog-accept').click();
   await a.waitForFunction(count=>document.querySelector('.evening-gift p')?.textContent.includes(count+'/3'),i+1);
  }
  assert.equal(world.gifts.length,3);assert.ok(await a.locator('[data-action="give-challenge"]').isDisabled());
  fs.mkdirSync('design-captures',{recursive:true});await a.screenshot({path:'design-captures/S25-editorial-step2.png'});
  for(const uid of ['a','b','b','b','b']){
   const page=uid==='a'?a:b;await session(page);
   await page.waitForFunction(()=>document.querySelector('.evening-d35-col canvas')?.loveRollDie);
   for(const cat of ['SENSUEL','SEXUEL','HASARD'])await page.locator('[data-action="category:'+cat+'"]').click();
   await page.evaluate(()=>window.__beforeDraw=document.querySelector('.evening-d35-col canvas'));
   await page.locator('[data-action="new-challenge"]').click();
   await page.locator('.evening-queue-detail').waitFor({timeout:20000});
   assert.ok(await page.evaluate(()=>window.__beforeDraw===document.querySelector('.evening-d35-col canvas')),'Draw replaced the live D100 canvas');
   const body=await page.locator('.evening-queue-content').innerText();assert.ok(body.includes('Défi privé '+uid));assert.ok(!body.includes('Défi privé '+(uid==='a'?'b':'a')));
   await page.locator('[data-action="evening-close"]').click();
  }
  assert.equal(world.cards.length,5);assert.equal(world.calls.filter(c=>['draw_for_partner','draw_for_partner_random'].includes(c.name)).length,5,'Double server draw');
  await session(a);await a.locator('[data-action="evening-list"]').click();assert.equal(await a.locator('.evening-queue-item').count(),1);await a.locator('[data-action="evening-close"]').click();
  await session(b);await b.locator('[data-action="evening-list"]').click();assert.equal(await b.locator('.evening-queue-item').count(),4);await b.locator('[data-action="evening-close"]').click();
  for(const uid of ['a','b']){
   const page=uid==='a'?a:b;await session(page);
   for(const c of world.cards.filter(c=>c.recipient===uid)){
    await page.locator('[data-action="evening-list"]').click();await page.locator('[data-action="evening-open:'+c.id+'"]').click();
    await page.locator('[data-action="evening-start:'+c.id+'"]').click();
    await page.waitForFunction(()=>document.querySelector('#challenge-timer-status')?.textContent.includes('En cours'));
    await page.locator('#challenge-timer-toggle').click();
    assert.ok(!(await page.locator('#challenge-timer-status').textContent()).includes('En cours'));
    await page.locator('#challenge-timer-toggle').click();
    await page.waitForFunction(()=>document.querySelector('#challenge-timer-status')?.textContent.includes('En cours'));
    await page.screenshot({path:'design-captures/S25-editorial-challenge-'+uid+'.png'});
    await page.locator('[data-action="answer:'+c.id+':completed"]').click();
    await page.locator('[data-action="answer:'+c.id+':completed"]').waitFor({state:'hidden'});
    if(!world.sessions[0].finished_at)await page.locator('[data-action="evening-close"]').click();
   }
  }
  assert.ok(world.sessions[0].finished_at);assert.ok(world.cards.every(c=>c.status==='completed'));
  for(const [i,page] of pages.entries()){
   if(!await page.locator('.lr-review-modal').count())await page.reload();
   await page.locator('.lr-review-modal').waitFor();
   await page.screenshot({path:'design-captures/S25-editorial-review-'+i+'.png'});
   for(const key of ['overall','connection','appreciation','again'])await page.locator('[data-action="review-rate:'+key+':4"]').click();
   await page.locator('#lr-review-comment').fill(i===0?'Bilan de Camille':'Bilan de Noémie');
   await page.locator('[data-action="review-save"]').click();await page.locator('.lr-review-modal').waitFor({state:'hidden'});
  }
  assert.equal(world.reviews.length,2);await session(a);await a.locator('[data-action="evening-calendar"]').click();
  await a.locator('.evening-calendar-shell').waitFor();
  const groups=a.locator('.evening-cal-person-group');assert.equal(await groups.count(),2);
  await groups.nth(0).locator('summary').click();assert.ok((await groups.nth(0).innerText()).includes('Bilan de Camille'));
  assert.ok(!(await groups.nth(0).innerText()).includes('Bilan de Noémie'));
  await groups.nth(1).locator('summary').click();assert.ok((await groups.nth(1).innerText()).includes('Bilan de Noémie'));
  await a.screenshot({path:'design-captures/S25-editorial-calendar.png'});
  console.log('EDITORIAL_TWO_IDENTITIES_OK create/resume, D6 sync, step lock, categories, private draws, 3 gifts, timers, closure, separate reviews');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
