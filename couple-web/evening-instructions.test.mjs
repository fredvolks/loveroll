import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('./app.js'),style=read('./soiree-home-template.css');
const html=read('./index.html');

test('LR-012: recipient instructions stay escaped and keyboard reachable',()=>{
 assert.match(source,/<p class="evening-challenge-instructions" role="region" aria-label="Consigne du défi" tabindex="0">/);
 assert.match(source,/safe\(adapted\?\.proposed_description\|\|resolvedCard\(view\)\.description\)/);
 assert.match(source,/acceptedAdaptation\(state\.adaptations,view\.id\)/);
 assert.match(style,/\.evening-queue-modal\.is-detail \.evening-queue-detail>\.evening-challenge-instructions\{/);
 assert.match(style,/max-height:min\(32dvh,240px\)!important/);
 assert.match(style,/overflow-x:hidden!important;overflow-y:auto!important/);
 assert.match(style,/\.evening-challenge-instructions:focus-visible/);
});
test('LR-012: old queue skin stays intentionally absent and D100 unclipped',()=>{
 assert.match(html,/soiree-home-template\.css\?v=/);
 assert.doesNotMatch(html,/evening-queue-fixed-v102\.css|evening-private-queue\.css/);
 assert.match(style,/old queue-v102 files/);
});
test('LR-012: genuine completion, pass and next actions remain intact',()=>{
 assert.match(source,/button\('answer:'\+view\.id\+':completed','✓ Défi réalisé'/);
 assert.match(source,/button\('evening-pass:'\+view\.id,'Passer ce défi'/);
 assert.match(source,/love_respond_and_redraw/);
 assert.match(source,/button\('evening-open:'\+mineCards\[idx\+1\]\.id,'Suivant →'/);
});
