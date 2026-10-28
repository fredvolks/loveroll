import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioSeat,studioAuthOptions,startStudioSeatLogin} from './studio-seat-auth.mjs';
const src=readFileSync(new URL('studio-real-sandbox.mjs',import.meta.url),'utf8');
const server=readFileSync(new URL('../supabase/functions/love-studio-sandbox/index.ts',import.meta.url),'utf8');
test('seat must be an embedded A/B viewer',()=>{
 assert.equal(studioSeat('?studio_seat=A',true),'A');
 assert.equal(studioSeat('?studio_seat=B',true),'B');
 assert.equal(studioSeat('?studio_seat=real',true),null);
 assert.equal(studioSeat('?studio_seat=A',false),null);
});
test('each seat has a distinct Supabase storage, never the real-admin key',()=>{
 const opts={auth:{persistSession:true,flowType:'pkce'}};
 const a=studioAuthOptions(opts,'A',{});
 const b=studioAuthOptions(opts,'B',{});
 assert.notEqual(a.auth.storageKey,b.auth.storageKey);
 assert.equal(a.auth.detectSessionInUrl,false);
 assert.equal(studioAuthOptions(opts,null),opts);
});
test('two actual full-app iframes, distinct Auth OTP and no fake server dice',()=>{
 assert.match(src,/createElement\('iframe'\)/);
 assert.match(src,/new URL\('\.\/\?studio_seat='/);
 assert.match(src,/request\('seat_login',seat\)/);
 for(const route of ['journal','personal-journal','occasions'])
  assert.ok(src.includes("'"+route+"'"),route+' stays inside the official route allow-list');
 assert.match(src,/loveroll-studio-login/);
 assert.doesNotMatch(src,/Math\.random|randomFace|fakeDie|drawFakeCard/);
 assert.match(src,/request\('create'\)/);
 assert.match(src,/request\('delete'\)/);
 assert.match(src,/studio-real-reset/);
 assert.match(src,/function toggleExpandedSeat\(seat\)/);
 assert.match(src,/function collapseSeat\(\)/);
 assert.match(src,/studio-real-maximized/);
 assert.match(src,/querySelector\('iframe'\)\?\.remove\(\)/);
 assert.doesNotMatch(src,/host\.replaceChildren\(\)/);
 assert.match(src,/event\.key==='Escape'/);
 assert.match(src,/await request\('delete'\);[\s\S]*?await request\('create'\);/);
 assert.match(src,/if\(busy\|\|!status\?\.ready\)return/);
});

test('OTP mismatch and nontechnical accounts never remain signed in as Studio seats',async()=>{
 const origin='https://fredvolks.github.io';
 for(const badUser of [
  {id:'wrong-user',app_metadata:{love_studio_test:true}},
  {id:'expected-user',app_metadata:{love_studio_test:false}}
 ]){
  let listener,logoutCount=0,reloadCount=0;
  const messages=[],parent={postMessage:(message,target)=>messages.push({message,target})};
  const selfWindow={
   parent,location:{reload:()=>{reloadCount++}},
   addEventListener:(name,fn)=>{if(name==='message')listener=fn},
   removeEventListener:()=>{}
  };
  const client={auth:{
   getSession:async()=>({data:{session:null}}),
   verifyOtp:async()=>({data:{session:{user:badUser}},error:null}),
   signOut:async({scope})=>{assert.equal(scope,'local');logoutCount++}
  }};
  const dispose=startStudioSeatLogin(client,'A',{selfWindow,origin});
  await listener({source:parent,origin,data:{
   type:'loveroll-studio-login',seat:'A',user_id:'expected-user',
   token_hash:'a'.repeat(64)
  }});
  assert.equal(logoutCount,1,'unexpected Auth session must be revoked locally');
  assert.equal(reloadCount,0,'unexpected Auth session must never display the real game');
  assert.ok(messages.some(x=>x.message.type==='loveroll-studio-seat-error'));
  dispose();
 }
});

test('real Auth SIGNED_OUT immediately updates the A/B connection indicator and unsubscribes safely',async()=>{
 let authListener,unsubscribeCount=0,handler;
 const events=[],parent={postMessage:(message,origin)=>events.push({message,origin})};
 const selfWindow={
  parent,location:{reload(){}},
  addEventListener:(_,fn)=>{handler=fn},
  removeEventListener:()=>{}
 };
 const client={auth:{
  getSession:async()=>({data:{session:null}}),
  onAuthStateChange:fn=>{
   authListener=fn;
   return {data:{subscription:{unsubscribe(){unsubscribeCount++}}}};
  }
 }};
 const done=startStudioSeatLogin(client,'B',{selfWindow,origin:'https://fredvolks.github.io'});
 const technical={user:{id:'technical-b',app_metadata:{love_studio_test:true}}};
 authListener('SIGNED_IN',technical);
 assert.equal(events.at(-1).message.authenticated,true);
 assert.equal(events.at(-1).message.user_id,'technical-b');
 authListener('SIGNED_OUT',null);
 assert.equal(events.at(-1).message.authenticated,false);
 assert.equal(events.at(-1).message.user_id,null);
 authListener('SIGNED_IN',{user:{id:'customer',app_metadata:{}}});
 assert.equal(events.at(-1).message.authenticated,false,'real customer session is never counted as a technical seat');
 done();
 assert.equal(unsubscribeCount,1);
 const size=events.length;
 authListener('SIGNED_IN',technical);
 assert.equal(events.length,size,'disposed Studio never leaks Auth state to parent');
});

test('Venice workshop uses only real tagged owner seat A and official bridge, never shares JWT',async()=>{
 const origin='https://fredvolks.github.io',messages=[];
 const parent={postMessage:(m,at)=>messages.push({m,at})};
 let listener,bridgeCalls=0;
 const selfWindow={
  parent,location:{reload(){}},
  addEventListener:(type,fn)=>{if(type==='message')listener=fn},
  removeEventListener(){}
 };
 const client={
  auth:{
   getSession:async()=>({data:{session:null}}),
   getUser:async()=>({data:{user:{
    id:'test-owner-a',app_metadata:{love_studio_test:true,love_studio_admin:'admin'}
   }},error:null})
  },
  from:table=>{
   assert.equal(table,'couple_members');
   return {select:()=>{
    return {eq:()=>({maybeSingle:async()=>({
     data:{couple_id:'real-technical-pair'},error:null
    })})};
   }};
  },
  functions:{invoke:async(fn,args)=>{
   bridgeCalls++;
   assert.equal(fn,'love-venice-bridge');
   assert.deepEqual(args.body,{
    action:'get_latest_preview',couple_id:'real-technical-pair'
   });
   return {data:{saved:true,preview:{cards:[{title:'Only draft'}]}},error:null};
  }}
 };
 const unsub=startStudioSeatLogin(client,'A',{selfWindow,origin});
 const requestId='11111111-1111-4111-8111-111111111111';
 await listener({source:parent,origin,data:{
  type:'loveroll-studio-venice',seat:'A',action:'get_latest_preview',request_id:requestId
 }});
 assert.equal(bridgeCalls,1);
 const response=messages.find(x=>x.m.type==='loveroll-studio-venice-result');
 assert.ok(response,'parent receives only the resulting drafts');
 assert.equal(response.at,origin);
 assert.equal(response.m.request_id,requestId);
 assert.equal(response.m.data.result.preview.cards[0].title,'Only draft');
 assert.ok(!JSON.stringify(response).includes('access_token'));
 await listener({source:parent,origin:'https://attacker.invalid',data:{
  type:'loveroll-studio-venice',seat:'A',action:'preview_three'
 }});
 await listener({source:parent,origin,data:{
  type:'loveroll-studio-venice',seat:'A',action:'delete_everyone'
 }});
 await listener({source:parent,origin,data:{
  type:'loveroll-studio-venice',seat:'A',action:'preview_three',
  request_id:'invalid-request-id'
 }});
 assert.equal(bridgeCalls,1,'foreign, malformed and unapproved actions never access paid provider');
 unsub();
});
test('nonowner seat B cannot invoke the couple-owned Venice provider',async()=>{
 let listener,called=false;
 const parent={postMessage(){}};
 const client={auth:{
  getSession:async()=>({data:{session:null}}),
  getUser:async()=>{called=true;return {data:{user:{id:'B'}}}}
 }};
 const selfWindow={parent,addEventListener:(_,fn)=>listener=fn,removeEventListener(){},location:{reload(){}}};
 startStudioSeatLogin(client,'B',{selfWindow,origin:'https://fredvolks.github.io'});
 await listener({source:parent,origin:'https://fredvolks.github.io',data:{
  type:'loveroll-studio-venice',seat:'B',action:'preview_three'
 }});
 assert.equal(called,false);
});

test('Studio Éclat progress comes from the real technical couple, not local browser state',()=>{
 const queryStart=server.indexOf(".select('coffret_id,minutes,chapter_index,chapter_plan,started_at')");
 assert.ok(queryStart>0,'official active Éclat columns must be queried');
 const query=server.slice(queryStart,queryStart+300);
 assert.ok(query.includes(".eq('couple_id',pool.couple_id)"));
 assert.ok(query.includes(".eq('cancelled',false)"));
 assert.ok(query.includes(".is('ended_at',null)"));
 assert.ok(server.includes('eclat_active:eclatActive?'));
 assert.ok(server.includes('eclatActive.chapter_plan.length'));
 assert.ok(src.includes("studioEclatOverview(status,ECLAT_COFFRETS)"));
 assert.ok(src.includes("item.dataset.state=coffret.state"));
 assert.ok(!src.includes("localStorage.getItem('studio-eclat-progress'"));
});


test('full QA challenge history is scoped to the verified technical pair and paginated safely',()=>{
 const index=server.indexOf("if(action==='challenge_history')");
 assert.ok(index>0,'private history action exists');
 const end=server.indexOf("if(action==='seat_login')",index);
 assert.ok(end>index);
 const route=server.slice(index,end);
 assert.ok(server.includes("'status','challenge_history','create'"));
 assert.ok(route.includes("Number.isSafeInteger(page)")&&route.includes("Number(page)>999"));
 assert.ok(route.includes(".eq('admin_id',adminId).maybeSingle()"));
 assert.ok(route.includes("await validRegisteredPair(pool.couple_id,seats||null)"));
 assert.ok(route.includes("service.from('couple_challenges')"));
 assert.ok(route.includes(".eq('couple_id',pool.couple_id)"));
 assert.ok(route.includes("query=query.eq('recipient',target)"));
 assert.ok(route.includes("body.seat!=='A'&&body.seat!=='B'"));
 assert.ok(route.includes("filter:seat||'all'"));
 assert.ok(route.includes(".range(Number(page)*limit,Number(page)*limit+limit-1)"));
 assert.ok(route.includes("{count:'exact'}"));
 assert.ok(route.includes("limit=10"));
 assert.ok(!route.includes("body.couple_id"));
 assert.ok(!route.includes("body.user_id"));
 assert.ok(!route.includes("recipient:row.recipient"),
  'authenticated customer UUID never crosses the admin history response');
 assert.ok(!route.includes("service.auth.admin.deleteUser"));
 assert.ok(!route.includes("roll_couple_once"));
});

test('history inspector fetches real server cards, rejects stale responses and clears private data on logout',()=>{
 assert.ok(src.includes("await request('challenge_history',historySeat==='all'?null:historySeat,{page})"));
 assert.ok(src.includes("result?.page!==page||result?.limit!==10"));
 assert.ok(src.includes("requestGeneration!==historyGeneration"));
 assert.ok(src.includes("if(!active||tearingDown||!status?.ready||historyBusy"));
 assert.ok(src.includes("historyGeneration++"));
 assert.ok(src.includes("function closeFrames(){\n  resetHistory();"));
 assert.ok(src.includes("function deactivate(){"));
 assert.ok(src.includes("historyCards=null"));
 assert.ok(src.includes("title.textContent=String(card.title||'Défi')"));
 assert.ok(src.includes("description.textContent=String(card.description||'Aucune consigne enregistrée')"));
 assert.ok(!src.includes("article.innerHTML"));
});
