import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioSeat,studioAuthOptions,startStudioSeatLogin} from './studio-seat-auth.mjs';
const src=readFileSync(new URL('studio-real-sandbox.mjs',import.meta.url),'utf8');
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
 await listener({source:parent,origin,data:{
  type:'loveroll-studio-venice',seat:'A',action:'get_latest_preview'
 }});
 assert.equal(bridgeCalls,1);
 const response=messages.find(x=>x.m.type==='loveroll-studio-venice-result');
 assert.ok(response,'parent receives only the resulting drafts');
 assert.equal(response.at,origin);
 assert.equal(response.m.data.result.preview.cards[0].title,'Only draft');
 assert.ok(!JSON.stringify(response).includes('access_token'));
 await listener({source:parent,origin:'https://attacker.invalid',data:{
  type:'loveroll-studio-venice',seat:'A',action:'preview_three'
 }});
 await listener({source:parent,origin,data:{
  type:'loveroll-studio-venice',seat:'A',action:'delete_everyone'
 }});
 assert.equal(bridgeCalls,1,'foreign and unapproved actions never access paid provider');
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
