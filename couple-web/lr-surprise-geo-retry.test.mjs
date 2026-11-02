import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geoRetryDecision,MAX_GEO_ATTEMPTS,GEO_CLAIM_WAIT_MS,GEO_MANUAL_RETRY_WAIT_MS} from '../supabase/functions/love-geo-surprise/retry-policy.mjs';

const base=Date.parse('2026-11-02T16:00:00Z');
const pending=(count,age)=>({
  state:'pending',geo_attempts:count,claimed_at:new Date(base-age).toISOString()
});

test('first D100 claim is budgeted once; immediate duplicate remains pending',()=>{
  assert.deepEqual(geoRetryDecision(null,{now:base}),{status:'claim',attempt:1});
  assert.deepEqual(geoRetryDecision(pending(1,0),{now:base}),{status:'pending'});
  assert.deepEqual(geoRetryDecision(pending(1,GEO_CLAIM_WAIT_MS-1),{now:base}),{status:'pending'});
});

test('temporary failures allow a maximum of three automatic claims',()=>{
  assert.equal(MAX_GEO_ATTEMPTS,3);
  assert.deepEqual(geoRetryDecision(pending(1,GEO_CLAIM_WAIT_MS),{now:base}),{status:'claim',attempt:2});
  assert.deepEqual(geoRetryDecision(pending(2,GEO_CLAIM_WAIT_MS),{now:base}),{status:'claim',attempt:3});
  assert.deepEqual(geoRetryDecision(pending(3,GEO_CLAIM_WAIT_MS),{now:base}),{status:'retry_exhausted'});
});

test('manual restart requires 15-minute cooldown and restarts bounded budget',()=>{
  assert.deepEqual(geoRetryDecision(pending(3,GEO_MANUAL_RETRY_WAIT_MS-1),{now:base,manual:true}),{status:'retry_exhausted'});
  assert.deepEqual(geoRetryDecision(pending(3,GEO_MANUAL_RETRY_WAIT_MS),{now:base,manual:true}),{status:'claim',attempt:1});
  assert.deepEqual(geoRetryDecision(pending(3,GEO_MANUAL_RETRY_WAIT_MS),{now:base,manual:false}),{status:'retry_exhausted'});
});

test('stored results are never searched again; malformed time never triggers a paid call',()=>{
  assert.deepEqual(geoRetryDecision({state:'ready'},{now:base}),{status:'stored'});
  assert.deepEqual(geoRetryDecision({state:'unavailable'},{now:base}),{status:'stored'});
  assert.deepEqual(geoRetryDecision({state:'pending',geo_attempts:1,claimed_at:'bad'},{now:base}),{status:'pending'});
});

test('Edge function uses atomic attempt CAS and nonterminal outage state',()=>{
  const code=readFileSync(new URL('../supabase/functions/love-geo-surprise/index.ts',import.meta.url),'utf8');
  assert.match(code,/geoRetryDecision\(/);
  assert.match(code,/\.eq\('geo_attempts',previousAttempts\)/);
  assert.match(code,/geo_attempts:decision\.attempt/);
  assert.match(code,/status:'retry_exhausted'/);
  assert.match(code,/status:'pending'/);
  assert.match(code,/matrix\.length!==candidates\.length/);
});


test('stale claims cannot overwrite a newer result and malformed Places are retryable',()=>{
  const code=readFileSync(new URL('../supabase/functions/love-geo-surprise/index.ts',import.meta.url),'utf8');
  assert.match(code,/\.eq\('state','pending'\)\s*\.eq\('geo_attempts',decision\.attempt\)\s*\.eq\('claimed_at',activeClaimedAt\)\.select\('roll_id'\)/);
  assert.match(code,/if\(error\|\|updated\?\.length!==1\)throw Error/);
  assert.match(code,/if\(!Array\.isArray\(placesResp\?\.features\)\)throw Error/);
  assert.match(code,/Résultat Geoapify obsolète/);
});


test('manual reset cannot let an old first attempt overwrite a new first attempt',()=>{
  const edge=readFileSync(new URL('../supabase/functions/love-geo-surprise/index.ts',import.meta.url),'utf8');
  assert.match(edge,/let activeClaimedAt:string\|null=null/);
  assert.match(edge,/activeClaimedAt=inserted\.data\.claimed_at/);
  assert.match(edge,/activeClaimedAt=retry\.data\[0\]\.claimed_at/);
  assert.match(edge,/\.eq\('geo_attempts',decision\.attempt\)\s*\.eq\('claimed_at',activeClaimedAt\)/);
  assert.match(edge,/\.select\('roll_id,claimed_at'\)/);
});
