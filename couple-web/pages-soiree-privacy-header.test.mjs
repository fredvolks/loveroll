import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const evening=read('./premium-evening.mjs');
const app=read('./app.js');
const templateCss=read('./soiree-home-template.css');
const privacyCss=read('./privacy-screen.css');
const ci=read('../.github/workflows/couple-web-check.yml');

test('LR-025: Soirée entry header must never display the floating Masquer button',()=>{
 assert.doesNotMatch(evening,/data-lr-privacy-hide|lr-privacy-quick-button|Masquer temporairement le jeu/);
 assert.doesNotMatch(templateCss,/\.evening-toolbar[^\n]*\[data-lr-privacy-hide\]/);
 assert.doesNotMatch(templateCss,/\.evening-toolbar[^\n]*\.lr-privacy-quick-button/);
 assert.doesNotMatch(privacyCss,/\.evening-premium-view \.evening-toolbar button\.lr-privacy-quick-button/);
 assert.match(ci,/node --test couple-web\/pages-soiree-privacy-header\.test\.mjs/);
});

test('LR-025: challenge cards no longer expose the obsolete Masquer control',()=>{
 assert.doesNotMatch(app,/data-lr-privacy-hide|lr-privacy-challenge-button/);
 assert.doesNotMatch(read('./index.html'),/privacy-screen\.(?:mjs|css)\?v=/);
});
