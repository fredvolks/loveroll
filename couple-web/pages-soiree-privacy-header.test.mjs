import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('./soiree-home-template.css');
const privacyCss=read('./privacy-screen.css');
const evening=read('./premium-evening.mjs');
const app=read('./app.js');
const ci=read('../.github/workflows/couple-web-check.yml');

test('LR-025: inactive Soirée hero never has floating Masquer',()=>{
 assert.match(evening,/class="evening-header-balance" aria-hidden="true"/);
 assert.doesNotMatch(evening,/data-lr-privacy-hide|lr-privacy-quick-button|Masquer temporairement le jeu/);
 assert.doesNotMatch(css,/\.evening-premium-view\.has-home-soiree-template \.evening-toolbar(?:>| )[^{}\n]*(?:lr-privacy-quick-button|data-lr-privacy-hide)/);
 assert.doesNotMatch(privacyCss,/#app\.loveroll-evening-page \.evening-premium-view \.evening-toolbar button\.lr-privacy-quick-button/);
});

test('LR-025: Masquer is still available on sensitive challenge cards',()=>{
 assert.match(app,/class="lr-privacy-challenge-button" data-lr-privacy-hide/);
 assert.match(privacyCss,/#app\.loveroll-evening-page \.evening-queue-modal button\.lr-privacy-challenge-button/);
});

test('Header regression is executed in normal web CI',()=>{
 assert.match(ci,/node --test couple-web\/pages-soiree-privacy-header\.test\.mjs/);
});
