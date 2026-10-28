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
