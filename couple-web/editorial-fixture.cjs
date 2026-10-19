// Safe synthetic API for the production UI. Never connects to real accounts.
const fs=require('node:fs'),path=require('node:path');
const fixtureClient=`export function createClient(){
 const actor=new URL(location.href).searchParams.get('actor')||'a';
 const call=async payload=>(await fetch('/__editorial-api',{method:'POST',body:JSON.stringify({actor,...payload})})).json();
 const auth=(name,args)=>call({auth:name,args});
 return {auth:{getUser:()=>auth('getUser'),onAuthStateChange:cb=>{window.__authChange=cb;return {data:{subscription:{unsubscribe(){}}}}},
 signUp:args=>auth('signUp',args),signInWithPassword:args=>auth('signInWithPassword',args),signInWithOAuth:args=>auth('signInWithOAuth',args),signInWithIdToken:args=>auth('signInWithIdToken',args),
 resetPasswordForEmail:(email,args)=>auth('resetPasswordForEmail',{email,...args}),resend:args=>auth('resend',args),updateUser:args=>auth('updateUser',args),signOut:()=>auth('signOut')},
 from(table){const filters=[];return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},then(ok,fail){return call({table,filters}).then(ok,fail)},upsert:args=>call({write:table,args}),delete(){return this}}},
 rpc:(name,args)=>call({name,args}),channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{}};
}`;
function createWorld(){
 const profiles=[{id:'a',display_name:'Camille',birthday_md:'04-12',gender:'him'},{id:'b',display_name:'Noémie',birthday_md:'04-13',gender:'her'}];
 const calendar={calendar_title:'Notre calendrier de test',year:2026,target_audience:'18+',note:'Texte conservé.',days:Array.from({length:25},(_,i)=>({day:i+1,type:'Romantique',title:'Lettre '+(i+1),description:'Une description exacte, conservée sans reformulation.\nDeuxième ligne.',timer_minutes:i===2?7:null}))};
 const keys=['saint_valentin','anniversaire_de_couple','fete_des_meres','fete_des_peres','mon_anniversaire','anniversaire_de_mon_partenaire'];
 const special={evenements_speciaux:Object.fromEntries(keys.map((k,i)=>[k,{evenement:['Saint-Valentin','Notre anniversaire','Fête des Mères','Fête des Pères','Anniversaire Camille','Anniversaire Noémie'][i],date:'Date personnalisée',D6_activite:Array.from({length:6},(_,j)=>({[j+1]:'Activité préparée '+(j+1)+' pour notre rendez-vous.'})),D6_modificateur:Array.from({length:6},(_,j)=>({[j+1]:'Variante exacte '+(j+1)+' à découvrir à deux.'})),minuteurs:{D6_activite:[null,5,null,null,null,null],D6_modificateur:[null,null,null,null,null,null]}}]))};
 return {profiles,calendar,special,customCards:[],monthly:[],calls:[],sessions:{a:'a',b:'b',p:'p',u:'u',guest:null},users:{a:{id:'a',email:'camille@test.invalid',email_confirmed_at:'2026-01-01'},b:{id:'b',email:'noemie@test.invalid',email_confirmed_at:'2026-01-01'},p:{id:'p',email:'profil@test.invalid',email_confirmed_at:'2026-01-01'},u:{id:'u',email:'attente@test.invalid'}},settings:{couple_id:'c',relationship_started_on:'2020-06-21',anniversary_md:'06-21',birthday_by_user:{a:'04-12',b:'04-13'}},prefs:{user_id:'a',enabled:true,weekly:true,invitation:true,monthly:true,special:true},couple:{id:'c',owner_user_id:'a',journal_salt:'test-only',show_sensuel_button:true,show_sexuel_button:true,no_repeat_challenges:true},rolls:[],history:[{title:'Contenu officiel immuable',timer_minutes:9}]};
}
async function setupEditorial(browser,world,{width=412,height=824,actor='a',query='settings=1',motion='reduce'}={}){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:width<768,hasTouch:width<900,reducedMotion:motion});
 if(process.env.LOVEROLL_LOCAL_FILES)await context.route('http://127.0.0.1:8765/**',async route=>{
  let name=new URL(route.request().url()).pathname;if(name==='/')name='/index.html';const f=path.join(process.cwd(),'couple-web',name);
  if(!fs.existsSync(f))return route.fulfill({status:404,body:''});
  const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
  await route.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
 });
 await context.route('https://esm.sh/@supabase/supabase-js@2.57.0*',r=>r.fulfill({contentType:'application/javascript',body:fixtureClient}));
 await context.route('**/__editorial-api',async route=>{
  const req=JSON.parse(route.request().postData()),uid=world.sessions[req.actor],{name,args={}}=req;let data=[],error=null;
  if(req.auth){
   const method=req.auth;world.calls.push({auth:method,actor:req.actor,args:{...req.args,password:undefined}});
   if(method==='getUser')data={user:world.users[uid]||null};
   if(method==='signOut'){world.sessions[req.actor]=null;data={};}
   if(method==='signUp'){world.users.new={id:'new',email:req.args.email};data={user:world.users.new,session:null};}
   if(method==='signInWithPassword'){
    const user=Object.values(world.users).find(u=>u.email===req.args.email);
    if(!user)error={code:'invalid_credentials',message:'Invalid credentials'};
    else if(!user.email_confirmed_at)error={code:'email_not_confirmed',message:'Email not confirmed'};
    else{world.sessions[req.actor]=user.id;data={user,session:{user}};}
   }
   if(method==='updateUser')data={user:world.users[uid]};
   if(method==='resend'||method==='resetPasswordForEmail')data={};
   if(method==='signInWithOAuth')data={url:'https://example.invalid/oauth-test-only'};
  }else if(req.table){
   const tables={couple_profiles:world.profiles,love_wellbeing:[],couple_members:world.profiles.filter(p=>['a','b'].includes(p.id)).map((p,i)=>({user_id:p.id,couple_id:'c',joined_at:'2026-10-0'+(i+1)})),couples:[world.couple],love_push_preferences:[world.prefs],couple_occasion_settings:[world.settings],love_custom_challenges:uid==='a'?world.customCards:[],love_monthly_activity_overrides:uid==='a'?world.monthly:[],love_advent_2026_config:uid==='a'?[{...world.calendar,couple_id:'c'}]:[],love_advent_2026_days:uid==='a'?world.calendar.days.map(d=>({...d,couple_id:'c'})):[],love_special_event_catalogue:uid==='a'?[{couple_id:'c',events:world.special}]:[],couple_rolls:world.rolls};
   const homeRecords={couple_sessions:world.eveningSessions,couple_challenges:world.challenges,couple_personal_rolls:world.personalRolls};
   data=homeRecords[req.table]||tables[req.table]||[];for(const [k,v] of req.filters)data=data.filter(r=>r[k]===v);
  }else{
   world.calls.push({uid,name,args});
   const ownerOnly=['save_love_card_with_roles','import_love_evening_library','import_love_monthly_library','import_love_advent_2026','import_love_special_events','reset_love_all_dice_admin'];
   if(ownerOnly.includes(name)&&uid!=='a')error={message:'Créateur requis'};
   else{
    if(name==='my_love_evening_card_totals')data=[{sensual:25,sexual:25,total:50}];
    if(name==='love_advent_server_date')data='2026-10-17';
    if(name==='love_evening_reviews_for_couple')data=world.reviews||[];
    if(name==='love_evening_calendar_challenges')data=world.calendarChallenges||[];
    if(name==='my_love_evening_board'&&world.board)data=world.board;
    if(name==='save_love_card_with_roles'){world.customCards=world.customCards.filter(c=>c.category!==args.p_category||c.card_id!==args.p_card_id);world.customCards.push({couple_id:'c',category:args.p_category,card_id:args.p_card_id,title:args.p_title,description:args.p_description,timer_minutes:args.p_timer_minutes,drawer_role:args.p_drawer_role,recipient_role:args.p_recipient_role});data=true;}
    if(name==='import_love_evening_library'){world.customCards=world.customCards.filter(c=>c.category!==args.p_library.category).concat(args.p_library.cards.map(c=>({...c,category:args.p_library.category,couple_id:'c'})));data=true;}
    if(name==='set_love_draw_rule'){world.couple.no_repeat_challenges=args.p_no_repeat;data=true;}
    if(name==='save_love_monthly_activity_with_timer'){world.monthly=world.monthly.filter(x=>x.face!==args.p_face).concat({face:args.p_face,couple_id:'c',title:args.p_title,description:args.p_description,is_restaurant:args.p_is_restaurant,timer_minutes:args.p_timer_minutes});data=true;}
    if(name==='import_love_advent_2026'){world.calendar=structuredClone(args.p_calendar);data=true;}
    if(name==='import_love_special_events'){world.special=structuredClone(args.p_events);data=true;}
    if(name==='save_love_surprise_event'){world.settings.surprise_event_overrides={...world.settings.surprise_event_overrides,[args.p_slot]:{title:args.p_title,month_day:args.p_month_day}};data=true;}
    if(name==='set_love_relationship_date'){world.settings.relationship_started_on=args.p_date;data=true;}
    if(name==='complete_love_registration'){let p=world.profiles.find(p=>p.id===uid);if(!p){p={id:uid};world.profiles.push(p);}p.display_name=args.p_name;p.birthday_md=args.p_birthday_md;data=true;}
    if(name==='save_my_gender'){world.profiles.find(p=>p.id===uid).gender=args.p_gender;data=true;}
    if(name==='accept_love_match_by_id'){data='c';}
    if(name==='save_my_wellbeing')throw Error('The removed questionnaire must never write fabricated answers.');
   }
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify({data,error})});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/?actor='+actor+'&'+query);await page.locator('#app .lr-splash--boot').waitFor({state:'detached'});await page.waitForTimeout(120);
 return {page,context,errors};
}
module.exports={createWorld,setupEditorial};
