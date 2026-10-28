import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('admin.html',import.meta.url),'utf8');
const css=readFileSync(new URL('studio-real-sandbox.css',import.meta.url),'utf8');
const js=readFileSync(new URL('platform-admin.js',import.meta.url),'utf8');
test('Studio real sandbox uses existing secure platform gate and no standalone fake dice',()=>{
 assert.match(html,/id="gate"/);
 assert.match(html,/data-panel="realtest"/);
 assert.match(html,/studio-real-frame-A/);
 assert.match(html,/studio-real-frame-B/);
 assert.match(html,/studio-real-delete/);
 assert.match(html,/id="studio-real-reset"/);
 assert.match(html,/id="studio-real-check"/);
 assert.match(html,/id="studio-real-diagnostics"/);
 assert.match(css,/\.studio-real-diagnostics/);
 for(const seat of ['A','B']){
  assert.match(html,new RegExp('id="studio-real-expand-'+seat+'"'));
  assert.match(html,new RegExp('id="studio-real-jump-'+seat+'"'));
 }
 assert.match(css,/\.studio-real-jump/);
 assert.match(js,/createStudioRealSandbox/);
 assert.match(js,/realSandbox\.init/);
 assert.doesNotMatch(html,/id="sim-d100"|id="sim-d6-face-0"/);
});
test('Responsive iPad desktop split and mobile seat switching',()=>{
 assert.match(css,/@media\(min-width:1024px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/\.studio-real-frame\.studio-real-active/);
 assert.match(css,/\.studio-real-frame\.studio-real-maximized/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/studio-real-fullscreen/);
});
