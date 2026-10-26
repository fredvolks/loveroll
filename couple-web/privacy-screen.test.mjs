import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldRestorePrivacy,PRIVACY_STORAGE_KEY} from './privacy-screen.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const index=read('./index.html'),app=read('./app.js'),evening=read('./premium-evening.mjs');
const sw=read('./service-worker.js'),code=read('./privacy-screen.mjs');

test('LR-025 only stores a local visual masking preference',()=>{
 const bag=new Map();const storage={getItem:k=>bag.get(k)??null};
 assert.equal(shouldRestorePrivacy(storage),false);
 bag.set(PRIVACY_STORAGE_KEY,'1');
 assert.equal(shouldRestorePrivacy(storage),true);
 bag.set(PRIVACY_STORAGE_KEY,'0');
 assert.equal(shouldRestorePrivacy(storage),false);
 assert.equal(shouldRestorePrivacy({getItem(){throw Error('blocked');}}),false);
 assert.match(code,/const html=doc\.documentElement/);
 assert.match(code,/html\.classList\.toggle\('lr-privacy-active',masked\)/);
 assert.match(code,/app\.inert=true/);
 assert.doesNotMatch(code,/\brpc\s*\(|answer_challenge|finish_couple_session|timer\.start/i);
});
test('LR-025 mask is reachable in Soirée and personal challenge list',()=>{
 assert.match(evening,/data-lr-privacy-hide/);
 assert.match(evening,/Masquer temporairement le jeu/);
 assert.match(app,/class="lr-privacy-challenge-button" data-lr-privacy-hide/);
 assert.match(code,/event\.stopImmediatePropagation\(\)/);
 assert.match(code,/data-lr-privacy-reveal/);
});
test('LR-025 first paint and offline PWA use the privacy shield',()=>{
 assert.match(index,/localStorage\.getItem\('loveroll-privacy-mask-v1'\)/);
 assert.match(index,/privacy-screen\.mjs\?v=/);
 assert.match(index,/privacy-screen\.css\?v=/);
 assert.match(sw,/\.\/privacy-screen\.mjs/);
 assert.match(sw,/\.\/privacy-screen\.css/);
 assert.match(code,/doc\.title='LoveRoll'/);
});
