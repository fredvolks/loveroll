import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('./soiree-home-template.css',import.meta.url),'utf8');
const ci=readFileSync(new URL('../.github/workflows/couple-web-check.yml',import.meta.url),'utf8');
test('Inactive Soirée retains usable Masquer but never shifts brand/logo flow',()=>{
 assert.match(css,/\.evening-premium-view\.has-home-soiree-template \.evening-toolbar\{position:relative!important;\}/);
 assert.match(css,/\.evening-premium-view\.has-home-soiree-template \.evening-toolbar \[data-lr-privacy-hide\]\{/);
 assert.match(css,/position:absolute!important;inset:16px auto auto 0!important/);
 assert.match(css,/min-height:44px!important;touch-action:manipulation/);
});
test('PR CI runs real parity/hero test used by Pages, not a weaker replacement',()=>{
 assert.match(ci,/node couple-web\/soiree-home-template-browser-check\.cjs/);
 assert.match(ci,/node couple-web\/premium-couple-visual-check\.cjs/);
});
