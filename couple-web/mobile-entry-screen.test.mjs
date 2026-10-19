import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverHtml} from './discover.mjs';
import {authHtml} from './onboarding.mjs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
test('Invitation and public welcome retain their actual separate actions',()=>{
 const invited=discoverHtml(true),publicPage=discoverHtml(false);
 assert.match(invited,/data-action="invite-start"/);
 assert.match(invited,/discover-editorial-die/);
 assert.match(invited,/discover-editorial-list/);
 assert.match(invited,/loveroll-invitation-scene-v139\.webp/);
 assert.doesNotMatch(invited,/data-action="show-auth:signup"/);
 assert.match(publicPage,/data-action="show-auth:signup"/);
 assert.match(publicPage,/data-action="show-auth:signin"/);
});
test('Login, signup and reset preserve all authentication actions',()=>{
 for(const [mode,action] of [['signin','auth-signin-password'],['signup','auth-signup-password'],
  ['request-reset','auth-send-reset'],['recover','auth-update-password']]){
  const html=authHtml(true,mode);
  assert.match(html,new RegExp('data-action="'+action+'"'));
  assert.match(html,/entry-auth-card/);
  assert.match(html,mode==='recover'||mode==='request-reset'?/data-action="auth-mode:signin"/:/data-action="invite-return"/);
  if(mode==='signin'||mode==='signup')assert.match(html,/data-action="google"/);
 }
 assert.match(authHtml(true,'signin','', '',true),/data-action="auth-resend-confirmation"/);
});
test('v79 fixes both invitation visual and registration without full-page scaling',()=>{
 const css=read('mobile-entry-v79.css'),html=read('index.html'),sw=read('service-worker.js');
 assert.match(css,/PAGE 1: the invitation/);
 assert.match(css,/PAGE 2: the account/);
 assert.match(css,/\.discover-editorial-stage\{/);
 assert.match(css,/\.discover-editorial-die>img\{/);
 assert.match(css,/flex:1 1 0%!important/);
 assert.match(css,/\.invite-auth-card\{/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/transform:none!important/);
 assert.match(html,/mobile-entry-v79\.css\?v=20261017-entry118/);
 assert.doesNotMatch(html,/entry-viewport-v78\.js/);
 assert.doesNotMatch(html,/mobile-entry-v76\.css|mobile-entry-v77\.css|mobile-entry-v78\.css/);
 assert.doesNotMatch(html,/loveroll-entry-viewport-safety/);
 assert.ok(read('app.js').includes("const WEB_RELEASE='"+JSON.parse(read('web-version.json')).build+"'"));
 assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
 assert.match(sw,/\.\/mobile-entry-v79\.css/);
 assert.doesNotMatch(sw,/entry-viewport-v78\.js/);
});
