import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./settings-menus.css',import.meta.url),'utf8');
const menus=readFileSync(new URL('./settings-menus.mjs',import.meta.url),'utf8');
const block=app.slice(app.indexOf(' const items=[[',app.indexOf('function renderSettings()')),app.indexOf(' const menu=',app.indexOf('function renderSettings()')));
test('LR-044 shows exactly five primary destinations while keeping the profile entry',()=>{
 assert.equal((block.match(/^  \['/gm)||[]).length,5);
 for(const key of ['couple','jeu','preferences','avantages','application'])assert.match(block,new RegExp("\\['"+key+"'"));
 assert.match(app,/settings-profile-row/);
});
test('LR-044 retains all existing settings routes, roles, referrals and game controls',()=>{
 for(const key of ['compte','couple','jeu','notifications','sonneries','confidentialite','monde','parrainage','admin'])assert.ok(app.includes("'"+key+"'"));
 assert.match(app,/section==='admin'&&!isLoveAdmin\(\)/);
 assert.match(app,/state\.referral\?\.enabled===true/);
 assert.match(app,/settings-page:notifications/);
 assert.match(app,/settings-page:sonneries/);
 assert.match(app,/settings-page:monde/);
 assert.match(app,/settings-page:confidentialite/);
});
test('LR-044 keeps live form nodes and does not force settings viewport clipping',()=>{
 assert.match(menus,/Form nodes stay mounted/);
 assert.match(css,/LR-044: legible, touch-friendly settings/);
 assert.match(css,/height:auto!important;min-height:100dvh!important;overflow-x:clip!important;overflow-y:auto!important/);
 assert.match(css,/min-height:44px!important/);
});
