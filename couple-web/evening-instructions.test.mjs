import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const style=readFileSync(new URL('./evening-queue-fixed-v102.css',import.meta.url),'utf8');

test('LR-012: actual recipient instructions remain complete and keyboard reachable',()=>{
 assert.match(source,/<p class="evening-challenge-instructions" role="region" aria-label="Consigne du défi" tabindex="0">/);
 assert.match(source,/safe\(resolvedCard\(view\)\.description\)/);
 const rule=style.match(/\.evening-queue-content\.is-detail \.evening-queue-detail>p\{[\s\S]*?\n \}/)?.[0];
 assert.ok(rule,'Actual challenge-description CSS must exist');
 assert.match(rule,/overflow-y:auto!important/);
 assert.doesNotMatch(rule,/overflow:hidden!important/);
 assert.match(style,/\.evening-challenge-instructions:focus-visible/);
});

test('LR-012: completion and pass buttons remain true interactive actions',()=>{
 assert.match(source,/button\('answer:'\+view\.id\+':completed','✓ Défi réalisé'/);
 assert.match(source,/button\('answer:'\+view\.id\+':passed','Passer ce défi'/);
 assert.match(source,/button\('evening-open:'\+mineCards\[idx\+1\]\.id,'Suivant →'/);
});
