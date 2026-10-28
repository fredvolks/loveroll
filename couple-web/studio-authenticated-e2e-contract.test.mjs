import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('studio-authenticated-e2e.cjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/studio-authenticated-staging.yml',import.meta.url),'utf8');
test('real A/B E2E cannot use production, requires a manual isolated staging project',()=>{
 assert.match(script,/const productionRef='ejsrqfpkgwraorrznjpm'/);
 assert.match(script,/params\.ref===productionRef/);
 assert.ok(script.includes("!/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(params.key)"),
  'the browser must never receive a secret or service-role key');
 assert.ok(script.includes('params.url!==`https://${params.ref}.supabase.co`'),
  'staging host must match the isolated project reference');
 assert.match(workflow,/workflow_dispatch/);
 assert.doesNotMatch(workflow,/pull_request:|push:/);
 assert.match(workflow,/test "\$STAGING_REF" != "ejsrqfpkgwraorrznjpm"/);
 assert.match(workflow,/LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD.*secrets\./);
});
test('staging checks actual read-only gameplay RPCs before creating any Auth A/B user',()=>{
 const tests=['love_eclat_status','love_test_mode_allowed'];
 for(const name of tests)assert.ok(script.includes("name:'"+name+"'"));
 assert.ok(script.includes("localStorage.getItem('sb-'+probe.ref+'-auth-token')"));
 assert.ok(script.includes("'Authorization:'")===false);
 assert.ok(script.includes("Authorization:'Bearer '+session.access_token"));
 assert.ok(script.includes("response.ok&&rpc.valid(data)"));
 assert.ok(script.includes("assert.equal(rpcReadiness.length,2"));
 assert.ok(script.indexOf("const rpcReadiness=await page.evaluate")<
  script.indexOf("await page.locator('#studio-real-create').click()"));
 assert.ok(!script.includes("console.log(session.access_token)"));
});

test('real game clicks official D6 D100 and waits for official server milestones',()=>{
 for(const action of ['roll:weekly','new-session','my-d6','new-challenge','roll:monthly_activity']){
  assert.ok(script.includes(`[data-action="${action}"]`),action);
 }
 for(const milestone of [3,4,5,6,7,8])assert.ok(script.includes(`verified(${milestone})`),milestone);
 assert.match(script,/data-action="new-challenge"/);
 assert.match(script,/new-challenge.*not\(\[disabled\]\)/s);
 assert.match(script,/data-confirm-action="yes"/);
 assert.match(script,/studio-real-seat-state-.*data-state=connected/);
 assert.doesNotMatch(script,/Math\.random|fakeFace|fakeCard|mockAuth|service_role_key/);
});
test('9/9 server milestones and all 12 real coffrets are browsed with BOTH genuine Auth seats',()=>{
 assert.ok(script.includes('await verified(9).waitFor'));
 assert.ok(script.includes("'9/9'"));
 assert.ok(script.includes("for(const [seat,frame] of [['A',a],['B',b]])"));
 assert.ok(script.includes('button[data-action^="eclat:detail:"]'));
 assert.ok(script.includes('assert.equal(await tiles.count(),12'));
 assert.ok(script.includes('for(let id=1;id<=12;id++)'));
 assert.ok(script.includes('eclat:start:'));
 assert.ok(script.includes('eclat:library'));
 assert.ok(script.includes('real-eclat-twelve-coffrets.png'));
 assert.ok(script.includes('#studio-real-eclat-grid button[data-seat="A"][data-coffret-id="2"]'));
 assert.ok(script.includes('#studio-real-eclat-grid button[data-seat="B"][data-coffret-id="3"]'));
 assert.ok(script.includes("Direct A/B coffret shortcuts opened genuine authenticated game details"));
 assert.ok(script.includes('button[data-action="eclat:start:1"]'));
 assert.ok(script.includes('.studio-real-eclat-coffret[data-state="active"]'));
 assert.ok(script.includes('real-eclat-started.png'));
 assert.ok(!script.includes('love_eclat_grant'));
});

test('technical account cleanup is mandatory even when a genuine E2E step fails',()=>{
 assert.match(script,/\}finally\{/);
 assert.match(script,/if\(page&&created\)/);
 assert.match(script,/studio-real-delete/);
 assert.ok(script.includes('Suppression du duo terminée'));
 assert.ok(script.includes("studio-real-frame-A iframe"));
 assert.ok(script.includes("studio-real-frame-B iframe"));
 assert.ok(script.includes("studio-real-progress-count"));
 assert.ok(script.includes("cleanupSuccessful=true;"));
 assert.match(script,/if\(created&&!cleanupSuccessful\)throw/);
 assert.match(script,/real-ipad-portrait\.png|real-'\+viewport\.name/);
 assert.doesNotMatch(script,/preview_three\s*\)/);
});

test('real A and B JWTs are denied Super Admin Edge access while parent stays signed in',()=>{
 assert.ok(script.includes('/functions/v1/love-studio-sandbox'));
 assert.ok(script.includes("body:JSON.stringify({action:'status'})"));
 assert.ok(script.includes("for(const seat of ['A','B'])"));
 assert.ok(script.includes('assert.equal(denial.status,403'));
 assert.ok(script.includes('the parent platform admin must remain authenticated'));
 assert.ok(!script.includes('console.log(session.access_token)'));
});

test('real Éclat stage cannot advance without BOTH signed-in partner choices and confirmations',()=>{
 assert.ok(script.includes('const guidedA=a.locator'));
 assert.ok(script.includes('const guidedB=b.locator'));
 assert.ok(script.includes("await page.selectOption('#studio-real-jump-B','eclat')"));
 assert.ok(script.includes("guidedA.locator('[data-action=\"eclat:choose:0\"]')"));
 assert.ok(script.includes("guidedB.locator('[data-action=\"eclat:choose:0\"]')"));
 assert.ok(script.includes(".eclat-guided[data-eclat-coffret=\"1\"][data-eclat-phase=\"reveal\"]"));
 assert.ok(script.includes("guidedA.locator('[data-action=\"eclat:next\"][disabled]')"));
 assert.ok(script.includes("guidedB.locator('[data-action=\"eclat:next\"]:not([disabled])')"));
 assert.ok(script.includes('real-eclat-two-player-stage-2.png'));
 assert.ok(script.includes('for(let chapter=2;chapter<=4;chapter++)'));
 assert.ok(script.includes('real-eclat-complete-server-verified.png'));
 assert.ok(script.includes("const completedCoffret=page.locator("));
 assert.ok(script.includes("1/12 terminés"));
 assert.ok(script.includes('One complete real Éclat coffret skip-path with both Auth users'));
 assert.ok(script.includes('Both authentic A/B Éclat seats skipped by choice'));
 assert.doesNotMatch(script,/admin\.rpc\('love_eclat_(choose|next)'/);
});
