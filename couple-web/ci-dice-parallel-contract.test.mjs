import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/couple-web-check.yml',import.meta.url),'utf8');
const expected=new Map([
 ['Diagnose D100 compact header geometry early (no skipped validations)', ['dice-core','evening-d100-template-browser-check.cjs']],
 ['Verify real D100 information dialog on desktop (focus, official odds and no draw)', ['dice-core','evening-d100-desktop-info-browser-check.cjs']],
 ['Verify real iPad Soirée D6 and D100 on the ONE HD photo (portrait and landscape)', ['dice-stage','ipad-romance-scene-browser-check.cjs']],
 ['LR-001 — verify the actual idle Soirée and Surprise D100 projected mesh on Android', ['dice-stage','soiree-home-template-browser-check.cjs']],
 ['Verify real couple Evening and Surprise in WebGL at S25 sizes', ['dice-stage','premium-couple-visual-check.cjs']],
 ['Verify Home D6 stays flat during touch and official result (Pages gate)', ['dice-faces','home-ruby-interaction-browser-check.cjs']],
 ['Validate every real D6 face and representative D100 engravings on phone, tablet and desktop', ['dice-faces','dice-face-readability-browser-check.cjs']],
 ['Verify real D100 across mobile viewports A (320–393px)', ['dice-mobile-a','evening-d100-template-browser-check.cjs']],
 ['Verify real D100 across mobile viewports B (412–430px)', ['dice-mobile-b','evening-d100-template-browser-check.cjs']],
 ['LR-014 — verify category modal on phone and iPad', ['dice-core','evening-category-confirm-browser-check.cjs']],
 ['Verify Soirée responsive Step 1 and unchanged D35 on phones and tablets', ['dice-core','evening-redesign-browser-check.cjs']],
 ['Verify full challenge instructions remain readable on mobile', ['dice-core','evening-instructions-browser-check.cjs']],
 ['Verify category switches never remount live WebGL dice', ['dice-core','evening-category-no-flicker-browser-check.cjs']],
 ['Verify weekly 3D die and photographed marble plinth on iPad', ['dice-faces','home-podium-browser-check.cjs']]
]);
const steps=workflow.split(/(?=^      - name: )/m);
function namedStep(label){
 const matching=steps.filter(s=>s.startsWith('      - name: '+label+'\n'));
 assert.equal(matching.length,1,'Missing/duplicated critical dice check: '+label);
 return matching[0];
}
test('All original D6/D100 checks plus desktop info run exactly once',()=>{
 assert.match(workflow,/group: \\[entry, dice-core, dice-stage, dice-faces, experience, dice-mobile-a, dice-mobile-b\\]/);
 assert.doesNotMatch(workflow,/matrix\.group == 'dice'/);
 for(const [name,[group,command]] of expected){
  const step=namedStep(name);
  assert.ok(step.includes("if: matrix.group == '"+group+"'"),
   'Dice check moved to wrong/skipped lane: '+name);
  assert.ok(step.includes(command),'Original browser command removed: '+name);
 }
});
test('All parallel dice lanes preserve mandatory CI and photo evidence',()=>{
 const matrix=workflow.match(/group: \[([^\]]+)\]/)?.[1].split(', ').map(s=>s.trim());
 assert.deepEqual(matrix,['entry','dice-core','dice-stage','dice-faces','experience','dice-mobile-a','dice-mobile-b']);
 assert.match(workflow,/needs: \[changes, static-tests, browser-tests\]/);
 assert.match(workflow,/test "\$BROWSER_RESULT" = success/);
 assert.match(workflow,/fail-fast: false/);
 const evidence=namedStep('Archive actual iPad Soirée D6 and D100 screenshots for visual review');
 assert.match(evidence,/if: always\(\) && matrix\.group == 'dice-stage'/);
 assert.match(evidence,/path: design-captures\/ipad-romance-\*\.png/);
 assert.match(workflow,/name: LoveRoll-\$\{\{ matrix.group \}\}-D6-D100-face-readability/);
});

test('Seven real WebGL sizes run in two independently mandatory parallel lanes',()=>{
 const a=namedStep('Verify real D100 across mobile viewports A (320–393px)');
 const b=namedStep('Verify real D100 across mobile viewports B (412–430px)');
 assert.match(a,/LOVEROLL_D100_VIEWPORT_LANE: a/);
 assert.match(b,/LOVEROLL_D100_VIEWPORT_LANE: b/);
 const all=workflow.match(/node couple-web\/evening-d100-template-browser-check[.]cjs/g)||[];
 assert.equal(all.length,2,'No viewport size may be duplicated or omitted in CI');
 assert.match(workflow,/node --test couple-web\/evening-d100-viewports[.]test[.]cjs/);
 assert.match(workflow,/needs: \[changes, static-tests, browser-tests\]/);
});
