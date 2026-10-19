import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
const app=read('app.js'),html=read('index.html'),sw=read('service-worker.js');
const boot=read('boot-recovery.js'),preflight=read('check-shipped-js.cjs');
const workflow=read('../.github/workflows/deploy-couple-web.yml');
test('Advent editor uses the shared form without the obsolete malformed inline cancel string',()=>{
 const editors=read('editorial-editors.mjs');
 assert.match(editors,/export function adventEditorHtml/);
 assert.match(editors,/editorButton\('save-advent-day'/);
 assert.ok(!app.includes(`button('close-advent-day','Annuler','class="subtle")+'</section>'`));
});
test('Google OAuth explicitly uses official Google account chooser',()=>{
 assert.match(app,/queryParams:\{prompt:'select_account'\}/);
 assert.match(app,/signInWithOAuth\(\{provider:verb,options\}\)/);
 assert.doesNotMatch(app,/google\.com\/logout|auth\.signOut\(\).*google/);
});
test('Reliable PWA boot has a standalone module failure fallback and user-visible retry',()=>{
 assert.match(html,/script defer src="\.\/boot-recovery\.js\?v=20261017-glass123"/);
 assert.match(boot,/addEventListener\('error'/);
 assert.match(boot,/\[data-lr-boot\]/);
 assert.match(html,/data-lr-boot/);
 assert.doesNotMatch(html,/Ouverture de votre espace privé/);
 assert.match(boot,/Réessayer/);
 assert.match(boot,/serviceWorker\.getRegistration\(\)/);
 assert.match(boot,/location\.replace\(url\.href\)/);
 assert.doesNotMatch(boot,/localStorage\.clear|sessionStorage\.clear|caches\.delete/);
 assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
 assert.match(sw,/\.\/boot-recovery\.js/);
});
test('Pages publishing refuses any JS syntax error and a failed real Chromium boot',()=>{
 assert.match(preflight,/walk\(root\)/);
 assert.match(preflight,/--check/);
 assert.match(workflow,/node couple-web\/check-shipped-js\.cjs/);
 assert.match(workflow,/node couple-web\/boot-smoke\.cjs/);
 assert.match(workflow,/npx playwright install chromium/);
});
