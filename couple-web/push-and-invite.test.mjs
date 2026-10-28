import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeInviteEmail,composeInviteEmail} from './invite-email.mjs';
import {notificationSettingsMarkup} from './push-notifications.mjs';

test('Invitation email accepts real Google account addresses on Hotmail, Outlook and Gmail',()=>{
 for(const addr of ['ee.lemieux@hotmail.com','Partner.Test+love@gmail.com','x_y@outlook.ca']){
  assert.equal(normalizeInviteEmail(' '+addr.toUpperCase()+' '),addr.toLowerCase());
 }
 for(const invalid of ['', 'address without @', 'wrong@@gmail.com','fred@','fred@invalid']){
  assert.throws(()=>normalizeInviteEmail(invalid),/courriel valide/);
 }
 const url=composeInviteEmail('ee.lemieux@hotmail.com','Invitation LoveRoll ❤️','Voici le lien https://love.example/#invite=abc');
 assert.match(url,/^mailto:ee\.lemieux%40hotmail\.com\?/);
 assert.match(decodeURIComponent(url),/Invitation LoveRoll ❤️/);
});
test('UI invokes Android native email composer for invite, otherwise mailto',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const native=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java',import.meta.url),'utf8');
 assert.match(app,/normalizeInviteEmail\(id\('invite-email'\)\?\.value\)/);
 assert.match(app,/LoveRollNativeAuth\?\.openEmail/);
 assert.match(native,/new Intent\(Intent.ACTION_SENDTO\)/);
 assert.match(native,/Intent.EXTRA_EMAIL/);
 assert.match(native,/Intent.EXTRA_SUBJECT/);
 assert.match(native,/Intent.EXTRA_TEXT/);
});
test('Supabase push endpoint requires a server-only dispatcher token',()=>{
 const edge=readFileSync(new URL('./functions/love-push-dispatch/index.ts',import.meta.url),'utf8');
 const db=readFileSync(new URL('./migrations/20261014_web_push.sql',import.meta.url),'utf8');
 const calendar=readFileSync(new URL('./migrations/20261014_push_calendar_test.sql',import.meta.url),'utf8');
 assert.match(edge,/love_push_verify_dispatch/);
 assert.match(edge,/x-loveroll-dispatch/); // Custom server token is verified before any work.
 assert.match(db,/enable row level security/g);
 assert.match(db,/auth\.uid\(\)/);
 assert.match(db,/vault\.create_secret/);
 assert.match(db,/love_push_on_invite_accept/);
 assert.match(db,/love_push_enqueue_weekly/);
 assert.match(calendar,/love_push_enqueue_calendar/);
 assert.match(calendar,/love_push_test_me/);
});
test('PWA push displays generic notification without leaking personal journal',()=>{
 const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(sw,/self\.addEventListener\('push'/);
 assert.match(sw,/self\.addEventListener\('notificationclick'/);
 assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
 assert.match(app,/notificationSettingsMarkup\(state\.pushPrefs\|\|\{\},state\.pushDevice\)/);
 assert.match(app,/sendTestPush\(client\)/);
 assert.match(app,/enablePush\(client,state\.user\.id\)/);
});
test('Native APK uses optional local weekly reminder, not unsupported WebView push',()=>{
 const java=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/LoveRollWeeklyReminderReceiver.java',import.meta.url),'utf8');
 const manifest=readFileSync(new URL('../app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.match(java,/DayOfWeek\.MONDAY/);
 assert.match(java,/America\/Toronto/);
 assert.match(java,/setAndAllowWhileIdle/);
 assert.match(manifest,/android\.permission\.POST_NOTIFICATIONS/);
 assert.match(manifest,/android\.permission\.RECEIVE_BOOT_COMPLETED/);
});


test('A malicious or erroneous push payload cannot expose private cards on lock screens',async()=>{
 const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 const listeners={},shown=[];
 const self={registration:{scope:'https://example.test/loveroll/',
  showNotification:(title,options)=>{shown.push({title,options});return Promise.resolve();}},
  addEventListener:(name,callback)=>{listeners[name]=callback;}};
 vm.runInNewContext(sw,{self,URL});
 for(const [tag,expectedBody] of [
  ['weekly','Votre rituel de la semaine vous attend.'],
  ['monthly','Une surprise à deux vous attend.'],
  ['dangerous-private-tag','Votre espace à deux vous attend.']
 ]){
  let pending;
  listeners.push({data:{json:()=>({tag,title:'Défi privé : valeur 42',
   body:'Instructions sexuelles confidentielles du partenaire'})},waitUntil:promise=>{pending=promise;}});
  await pending;
  const shownPush=shown.at(-1);
  assert.equal(shownPush.title,'LoveRoll ❤️');
  assert.equal(shownPush.options.body,expectedBody);
  assert.ok(!JSON.stringify(shownPush).includes('confidentielles'));
  assert.ok(!JSON.stringify(shownPush).includes('valeur 42'));
  assert.ok(shownPush.options.tag.startsWith('loveroll-'));
 }
});
