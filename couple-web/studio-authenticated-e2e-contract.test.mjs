import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('studio-authenticated-e2e.cjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/studio-authenticated-staging.yml',import.meta.url),'utf8');
test('real A/B E2E cannot use production, requires a manual isolated staging project',()=>{
 assert.match(script,/const productionRef='ejsrqfpkgwraorrznjpm'/);
 assert.match(script,/params\.ref===productionRef/);
 assert.ok(script.includes('params.url!==`https://${params.ref}.supabase.co`'),
  'staging host must match the isolated project reference');
 assert.match(workflow,/workflow_dispatch/);
 assert.doesNotMatch(workflow,/pull_request:|push:/);
 assert.match(workflow,/test "\$STAGING_REF" != "ejsrqfpkgwraorrznjpm"/);
 assert.match(workflow,/LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD.*secrets\./);
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
test('technical account cleanup is mandatory even when a genuine E2E step fails',()=>{
 assert.match(script,/\}finally\{/);
 assert.match(script,/if\(page&&created\)/);
 assert.match(script,/studio-real-delete/);
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
