import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromeIntentForInvite,messengerExternalBrowserHtml} from './messenger-browser.mjs';
import {discoverHtml} from './discover.mjs';

const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');

test('Android Chrome intent preserves the exact invitation ID and query parameters',()=>{
 const invite='https://fredvolks.github.io/mon-wallet-android/?invite_id=8a6689bd-7b5d-45a9-8948-3f36c2809df7&v=20261014-messenger-v4';
 const intent=chromeIntentForInvite(invite);
 assert.ok(intent.startsWith('intent://fredvolks.github.io/mon-wallet-android/?invite_id='));
 assert.match(intent,/package=com\.android\.chrome/);
 assert.match(intent,/action=android\.intent\.action\.VIEW/);
 assert.match(intent,/S\.browser_fallback_url=https%3A%2F%2Ffredvolks\.github\.io/);
 assert.equal(decodeURIComponent(intent.split('S.browser_fallback_url=')[1].split(';end')[0]),invite);
});
test('Legacy token invitation uses clipboard fallback rather than dropping its hash in Android Intent',()=>{
 const legacy='https://fredvolks.github.io/mon-wallet-android/?v=old#invite=secure-token';
 assert.equal(chromeIntentForInvite(legacy),null);
 assert.equal(chromeIntentForInvite('javascript:alert(1)'),null);
 assert.equal(chromeIntentForInvite('http://fredvolks.github.io'),null);
 assert.match(messengerExternalBrowserHtml(legacy),/Copier le lien/);
});
test('iPhone CTA says copy for Safari, never falsely promises automatic Safari launch',()=>{
 const url='https://fredvolks.github.io/mon-wallet-android/?invite_id=abcd';
 const html=messengerExternalBrowserHtml(url,{ios:true});
 assert.match(html,/Copier pour Safari/);
 assert.match(html,/Safari ne peut pas être ouvert automatiquement/);
 assert.doesNotMatch(html,/intent:\/\//);
 assert.doesNotMatch(html,/Ouvrir dans Safari/);
});
test('Messenger invitation landing shows Chrome link with visible manual fallback',()=>{
 const url='https://fredvolks.github.io/mon-wallet-android/?invite_id=abcd';
 const html=messengerExternalBrowserHtml(url,{ios:false});
 assert.match(html,/href="intent:\/\//);
 assert.match(html,/Ouvrir dans Chrome/);
 assert.match(html,/data-action="copy-invite-for-browser"/);
 assert.match(discoverHtml(true,html),/Ouvrir dans Chrome/);
 assert.doesNotMatch(discoverHtml(false,html),/Ouvrir dans Chrome/);
 const app=read('app.js');
 assert.match(app,/discoverHtml\(!!pendingInvite,inviteBrowserHelp\(\)\)/);
 assert.match(app,/messengerExternalBrowserHtml\(href,\{ios:isIos\(\)\}\)/);
});
