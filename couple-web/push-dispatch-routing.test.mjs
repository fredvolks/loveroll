import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/love-push-dispatch/index.ts',import.meta.url),'utf8');
const native=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/LoveRollFcmService.java',import.meta.url),'utf8');
const sql=readFileSync(new URL('./migrations/20261028_lr028_evening_invitation.sql',import.meta.url),'utf8');

test('production dispatcher baseline selects event_key needed for native invitation routing',()=>{
 assert.match(source,/select\('id,user_id,kind,title,body,event_key,attempts'\)/);
 assert.match(source,/data:\{kind:alert\.kind,event_key:/);
 assert.match(source,/startsWith\('evening-invite:'\)/);
 assert.match(source,/startsWith\('evening-reply:'\)/);
 assert.match(native,/eventKey\.startsWith\("evening-invite:"\)/);
 assert.match(native,/eventKey\.startsWith\("evening-reply:"\)/);
});
test('no exact invitation UUID, card text or secret material goes into FCM data',()=>{
 assert.match(source,/\?'evening-invite:'\s*:/);
 assert.match(source,/\?'evening-reply:'\s*:/);
 assert.doesNotMatch(source,/data:\{kind:alert\.kind,event_key:alert\.event_key\}/);
 assert.doesNotMatch(source,/-----BEGIN (?:RSA )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}|sk_[A-Za-z0-9]{20}/);
 assert.doesNotMatch(source,/data:\{[^}]*?(?:title|body|card|description):alert\./);
 assert.match(sql,/'evening-invite:'\|\|row_inv\.id/);
 assert.match(sql,/'evening-reply:'\|\|row_inv\.id/);
});
test('versioned backend retains existing opt-in and dispatch authentication',()=>{
 assert.match(source,/x-loveroll-dispatch/);
 assert.match(source,/love_push_verify_dispatch/);
 assert.match(source,/love_push_preferences/);
 assert.match(source,/pref\?\.enabled/);
 assert.match(source,/pref\[alert\.kind\]!==true/);
 assert.match(source,/tag:alert\.kind==='invitation'/);
 assert.match(source,/\?'evening-invite':/);
 assert.match(source,/\?'evening-reply':/);
 assert.match(source,/love_push_native_devices/);
 assert.match(source,/love_push_subscriptions/);
 assert.match(source,/fcm\.googleapis\.com\/v1\/projects/);
});
