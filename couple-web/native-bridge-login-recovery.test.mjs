import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {safeNativePushToken,safeNativePushConfigured,notificationSettingsMarkup} from './push-notifications.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
test('Old Android 0.13.4 Java exception never prevents login, settings or reload',()=>{
 globalThis.window={LoveRollNativeAuth:{
  nativePushConfigured:()=>true,
  nativePushToken:()=>{throw new Error('Error invoking nativePushToken: Java exception');},
  weeklyReminderEnabled:()=>true
 }};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Android',platform:'Android',maxTouchPoints:1}});
 assert.equal(safeNativePushToken(),'');
 assert.equal(safeNativePushConfigured(),true);
 const settings=notificationSettingsMarkup({enabled:false});
 assert.match(settings,/data-notification-state="inactive"/);
 assert.match(settings,/data-action="push-enable"/);
 assert.doesNotMatch(settings,/Error invoking nativePushToken/);
});
test('Broken Android nativePushConfigured also fails closed',()=>{
 globalThis.window={LoveRollNativeAuth:{nativePushConfigured:()=>{throw Error('Java exception');},nativePushToken:()=>''}};
 assert.equal(safeNativePushConfigured(),false);
});
test('Supabase account data never directly invokes dangerous Java getter',()=>{
 assert.match(app,/const nativeToken=safeNativePushToken\(\)/);
 assert.doesNotMatch(app,/window\.LoveRollNativeAuth\?\.nativePushToken\?\.\(\)/);
 assert.match(app,/if\(verb==='google'&&window\.LoveRollNativeAuth\?\.googleSignIn\)/);
 assert.match(app,/window\.LoveRollNativeAuth\.googleSignIn\(\)/);
 assert.match(app,/signInWithIdToken\(\{provider:'google',token,nonce\}\)/);
});

function nativeGoogleAuthFixture(state,signInWithIdToken){
 const start=app.indexOf('let currentNativeGoogleLoginRequest=null;');
 const end=app.indexOf('\n// Keep background status reads single-flight per auth session.',start);
 assert.ok(start>0&&end>start,'real native Google callback required');
 const calls={messages:[],adopts:[],reloads:0,failures:0,warnings:0};
 let callback;
 const fixture=runInNewContext(
  'let authFeedbackGeneration=0;'+
  'function adoptAuthenticatedIdentity(user){authFeedbackGeneration++;'+
  'state.user=user;calls.adopts.push(user.id)};'+
  app.slice(start,end)+
  ';({bump:()=>authFeedbackGeneration++})',{
   state,calls,
   window:{addEventListener:(event,handler)=>{
    assert.equal(event,'loveroll-native-google-result');callback=handler;
   }},
   client:{auth:{signInWithIdToken}},
   reload:async()=>{calls.reloads++;},
   fail:()=>{calls.failures++;},
   authMessage:message=>calls.messages.push(message),
   console:{warn:()=>{calls.warnings++;}}
  });
 return {...fixture,calls,receive:detail=>callback({detail})};
}

test('LR-026: Android Google success adopts its account through the private boundary',async()=>{
 const state={user:null,showAuth:true};
 const f=nativeGoogleAuthFixture(state,async()=>({data:{user:{id:'alice'}},error:null}));
 await f.receive({token:'test-id-token',nonce:'test-nonce'});
 assert.equal(state.user.id,'alice');
 assert.equal(state.showAuth,false);
 assert.deepEqual(f.calls.adopts,['alice']);
 assert.equal(f.calls.reloads,1);
});

test('LR-026: obsolete native Google response cannot replace a newer account',async()=>{
 let resolveOld;
 const old=new Promise(resolve=>{resolveOld=resolve;});
 const state={user:null,showAuth:true};
 const f=nativeGoogleAuthFixture(state,()=>old);
 const pending=f.receive({token:'old-token'});
 state.user={id:'bob'};f.bump(); // SIGNED_IN was received from another login.
 resolveOld({data:{user:{id:'alice'}},error:null});
 await pending;
 assert.equal(state.user.id,'bob');
 assert.deepEqual(f.calls.adopts,[]);
 assert.equal(f.calls.reloads,0);
});

test('LR-026: obsolete Android Google failure cannot warn a new account',async()=>{
 let rejectOld;
 const pendingAuth=new Promise((_,reject)=>{rejectOld=reject;});
 const state={user:null,showAuth:true};
 const f=nativeGoogleAuthFixture(state,()=>pendingAuth);
 const pending=f.receive({token:'old-token'});
 state.user={id:'bob'};f.bump();
 rejectOld(Error('network unavailable'));
 await pending;
 assert.deepEqual(f.calls.messages,[]);
 assert.equal(f.calls.warnings,0);
});

test('LR-026: two overlapping native Google choices keep only the last response',async()=>{
 let resolveFirst;
 const first=new Promise(resolve=>{resolveFirst=resolve;});
 const state={user:null,showAuth:true};
 const f=nativeGoogleAuthFixture(state,({token})=>token==='first'?
  first:Promise.resolve({data:{user:{id:'bob'}},error:null}));
 const old=f.receive({token:'first'});
 await f.receive({token:'second'});
 resolveFirst({data:{user:{id:'alice'}},error:null});
 await old;
 assert.equal(state.user.id,'bob');
 assert.deepEqual(f.calls.adopts,['bob']);
 assert.equal(f.calls.reloads,1);
});
