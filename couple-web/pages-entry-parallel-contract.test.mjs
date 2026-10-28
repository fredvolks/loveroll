// Keep every original Pages gate when splitting a slow Chromium lane.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/deploy-couple-web.yml',import.meta.url),'utf8');
const block=(heading,next)=>workflow.split('      - name: '+heading+'\n')[1]?.split('      - name: '+next+'\n')[0]||'';
const core=block('Validate entry interaction before publication','Validate entry layout before publication');
const layout=block('Validate entry layout before publication','Validate evening before publication');
test('Pages entry is parallel but both lanes are required before deployment',()=>{
 assert.match(workflow,/group: \[entry-interaction, entry-layout, evening, experience\]/);
 assert.match(core,/if: matrix\.group == 'entry-interaction'/);
 assert.match(layout,/if: matrix\.group == 'entry-layout'/);
 assert.match(workflow,/needs: \[static-tests, browser-tests\]/);
 assert.match(workflow,/fail-fast: false/);
 assert.match(core,/set -euo pipefail/);
 assert.match(layout,/set -euo pipefail/);
});
test('No formerly mandatory entry functional checks are skipped or duplicated',()=>{
 const commands=[
 'boot-smoke.cjs','android-ruby-browser-check.cjs',
 'home-ruby-interaction-browser-check.cjs','ruby-controls-browser-check.cjs',
 'home-duo-browser-check.cjs','soiree-home-template-browser-check.cjs',
 'surprise-minimal-browser-check.cjs','checkout-one-screen-browser-check.cjs',
 'loveroll-splash-browser-check.cjs','surprise-desktop-v86-check.cjs'
 ];
 for(const command of commands){
  const count=[core,layout].reduce((n,src)=>n+src.split('node couple-web/'+command).length-1,0);
  assert.equal(count,1,'Pages entry check missing or duplicated: '+command);
 }
 assert.match(layout,/if ! node couple-web\/mobile-entry-visual-check\.cjs/);
 assert.doesNotMatch(core,/if ! node couple-web/);
 // The optional layout-only diagnostic does NOT mask other functional failures.
 assert.equal(layout.split('if ! node couple-web/').length-1,1);
});
