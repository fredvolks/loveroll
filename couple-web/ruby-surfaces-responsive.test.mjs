import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const surfaces=readFileSync(new URL('./ruby-surfaces.css',import.meta.url),'utf8');
const controls=readFileSync(new URL('./ruby-controls.css',import.meta.url),'utf8');
const menus=readFileSync(new URL('./settings-menus.css',import.meta.url),'utf8');

test('LR-010 ruby glass tokens are shared across mobile, tablet and desktop',()=>{
 const layer=surfaces.indexOf('@layer loveroll-surfaces{');
 const root=surfaces.indexOf(':root{',layer);
 const mobile=surfaces.indexOf('@media(max-width:767px)',layer);
 assert.ok(layer>=0&&root>layer&&mobile>root,'Tokens must not be mobile-only');
 const theme=surfaces.slice(root,mobile);
 for(const token of ['--lr-surface-radius','--lr-surface-fill','--lr-surface-shadow'])
  assert.ok(theme.includes(token+':'),token+' should be available to desktop components');
 assert.match(theme,/radial-gradient/);
 assert.match(theme,/linear-gradient/);
 assert.match(surfaces.slice(mobile),/\.lr-surface\{/);
});

test('Desktop Settings use the same Home glass tokens rather than an invalid CSS variable',()=>{
 assert.match(menus,/\.settings-submenu-list :is\(button,\.settings-link-row\)/);
 assert.match(menus,/background:var\(--lr-surface-fill\)!important/);
 assert.match(menus,/box-shadow:var\(--lr-surface-shadow\)!important/);
});

test('LR-010 Home Cormorant typography and control tokens are available to iPad and PC',()=>{
 const layer=controls.indexOf('@layer loveroll-ruby-controls{');
 const root=controls.indexOf(':root{',layer);
 const mobile=controls.indexOf('@media(max-width:767px)',layer);
 assert.ok(layer>=0&&root>layer&&mobile>root,
  'Home typography should not fall back to plain Georgia on desktop');
 const theme=controls.slice(root,mobile);
 for(const token of ['--lr-control-font','--lr-control-ink','--lr-control-glass'])
  assert.ok(theme.includes(token+':'),token+' should be global');
 assert.match(theme,/LoveRoll Cormorant/);
 assert.match(controls.slice(mobile),/\.lr-ruby-control\{/);
});

test('LR-AUDIT-GLOBAL: tablet and desktop Home controls reuse ruby materials',()=>{
 const desktop=controls.slice(controls.indexOf('/* LR-AUDIT-GLOBAL-20261028'));
 assert.match(desktop,/@media \(min-width:768px\)/);
 assert.match(desktop,/#app \.lr-ruby-control \{/);
 for(const token of ['--lr-control-glass','--lr-control-ink','--lr-control-font','--lr-control-shadow'])
  assert.ok(desktop.includes('var('+token+')'),token);
 for(const state of [':focus-visible',':disabled',':not(:disabled):active'])
  assert.ok(desktop.includes('.lr-ruby-control'+state),state);
 const shared=surfaces.slice(surfaces.indexOf('/* Use the shared material'));
 assert.match(shared,/#app \.lr-surface:not\(\.lr-ruby-control\)/);
 assert.match(shared,/background:var\(--lr-surface-fill\)/);
});
