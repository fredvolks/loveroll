import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const e2e=read('./studio-authenticated-e2e.cjs');
const actions=read('./app.js');
const evening=read('./premium-evening.mjs');
const home=read('./premium-home.mjs');
const surprise=read('./premium-surprise.mjs');
const confirmation=read('./evening-category-confirm.mjs');
const workflow=read('../.github/workflows/studio-authenticated-staging.yml');
test('staging browser test HARD REFUSES production before importing any browser package',()=>{
 const base={
  LOVEROLL_STUDIO_E2E_REF:'ejsrqfpkgwraorrznjpm',
  LOVEROLL_STUDIO_E2E_URL:'https://ejsrqfpkgwraorrznjpm.supabase.co',
  LOVEROLL_STUDIO_E2E_PUBLISHABLE_KEY:'not-a-key',
  LOVEROLL_STUDIO_E2E_ADMIN_EMAIL:'admin@example.invalid',
  LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD:'not-a-password'
 };
 const run=(overrides={})=>spawnSync(process.execPath,
  [new URL('./studio-authenticated-e2e.cjs',import.meta.url).pathname],{
  env:{...process.env,...base,...overrides},encoding:'utf8',timeout:6000
 });
 const real=run();
 assert.notEqual(real.status,0);
 assert.match(real.stderr,/REFUSED: staging ref/);
 assert.doesNotMatch(real.stderr,/Cannot find module|playwright/);
 const wrongURL=run({LOVEROLL_STUDIO_E2E_REF:'stmjchenrzelypcncvks'});
 assert.notEqual(wrongURL.status,0);
 assert.match(wrongURL.stderr,/REFUSED: staging ref/);
 assert.match(e2e,/params\.ref===productionRef/);
 assert.match(e2e,/params\.url!==`https:\/\/${params.ref}\.supabase\.co`/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/pull_request:/);
 assert.doesNotMatch(workflow,/push:/);
});
test('actual manual browser steps target official production markup, not guesses',()=>{
 for(const action of ['roll:weekly'])assert.ok(home.includes('data-action="'+action+'"'));
 for(const action of ['roll:monthly_activity'])assert.ok(surprise.includes(action));
 for(const action of ['new-session','my-d6','new-challenge','category:SENSUEL'])
  assert.ok(actions.includes(action)||evening.includes(action),action);
 assert.match(confirmation,/data-confirm-action="yes"/);
 assert.match(e2e,/Promise\.any\(candidates\.map/);
 assert.match(e2e,/category:SENSUEL/);
 assert.match(e2e,/new-challenge/);
 assert.match(e2e,/studio-real-delete/);
 assert.match(e2e,/cleanupSuccessful/);
});
test('manual test uses a real signed-in app, not just a splash or fake locally drawn cards',()=>{
 assert.match(e2e,/button\[data-action="tab:home"\]/);
 assert.match(e2e,/studio-real-progress-list li:nth-child/);
 assert.match(e2e,/official-rolled-dice-and-cards\.png/);
 assert.doesNotMatch(e2e,/Math\.random\(/);
 assert.doesNotMatch(e2e,/page\.evaluate\([^)]*roll_couple_once/);
 assert.match(workflow,/LOVEROLL_STUDIO_E2E_ADMIN_EMAIL/);
 assert.match(workflow,/LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD/);
});
