import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
