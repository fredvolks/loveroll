import test from 'node:test';
import assert from 'node:assert/strict';
import {runStage, validateStage} from './lr026-staging-recipe.mjs';

const ref = 'zzzzzzzzzzzzzzzzzzzz';
const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const B = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const C = 'cccccccc-1111-4111-8111-cccccccccccc';
const AB_COUPLE = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa';
const AB_SESSION = 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa';
const C_COUPLE = 'cccccccc-2222-4222-8222-cccccccccccc';
const C_SESSION = 'cccccccc-3333-4333-8333-cccccccccccc';

function config() {
  return {
    LR026_STAGING_REF: ref,
    LR026_CONFIRM_STAGING_REF: ref,
    LR026_STAGING_PUBLISHABLE_KEY: 'sb_publishable_test_key',
    LR026_STAGING_A_EMAIL: 'a@example.invalid',
    LR026_STAGING_A_PASSWORD: 'A-private',
    LR026_STAGING_A_ID: A,
    LR026_STAGING_B_EMAIL: 'b@example.invalid',
    LR026_STAGING_B_PASSWORD: 'B-private',
    LR026_STAGING_B_ID: B,
    LR026_STAGING_C_EMAIL: 'c@example.invalid',
    LR026_STAGING_C_PASSWORD: 'C-private',
    LR026_STAGING_C_ID: C,
    LR026_STAGING_COUPLE_ID: AB_COUPLE,
    LR026_STAGING_SESSION_ID: AB_SESSION,
    LR026_STAGING_OTHER_COUPLE_ID: C_COUPLE,
    LR026_STAGING_OTHER_SESSION_ID: C_SESSION
    // Intentionally NO writing acknowledgements.
  };
}
function fakeStage({leak, hideCOwnSession, hideCOwnMember,
  hideCOwnChallenge, hideABOwnChallenge, leakPartnerChallenge} = {}) {
  const calls = [];
  const transport = async (urlString, options) => {
    const url = new URL(urlString);
    const endpoint = url.pathname;
    const payload = options.body && JSON.parse(options.body);
    const bearer = options.headers.Authorization;
    const actor = bearer?.replace('Bearer test-session-', '');
    const data = value => new Response(JSON.stringify(value), {status: 200});
    calls.push({endpoint, method: options.method, actor, redirect: options.redirect});
    assert.equal(url.origin, 'https://' + ref + '.supabase.co');
    assert.equal(options.redirect, 'error', 'Do not follow redirects with a token');
    assert.equal(options.cache, 'no-store', 'Do not cache personal staging data');

    if (endpoint === '/auth/v1/token') {
      const login = payload?.email?.slice(0, 1);
      if (!['a', 'b', 'c'].includes(login)) throw new Error('Unexpected login in test');
      return data({access_token: 'test-session-' + login});
    }
    if (endpoint === '/auth/v1/user') {
      return data({id: ({a: A, b: B, c: C})[actor],
        email: actor + '@example.invalid',
        email_confirmed_at: '2026-10-29T00:00:00Z'});
    }
    if (endpoint === '/rest/v1/couple_sessions') {
      const requested = url.searchParams.get('id')?.slice(3);
      if (requested === AB_SESSION) {
        if (actor === 'c' && leak !== 'c-ab-session') return data([]);
        return data([{id: AB_SESSION, couple_id: AB_COUPLE, finished_at: null}]);
      }
      if (requested === C_SESSION) {
        if (actor === 'c' && hideCOwnSession) return data([]);
        if (actor !== 'c' && leak !== 'ab-c-session') return data([]);
        return data([{id: C_SESSION, couple_id: C_COUPLE, finished_at: null}]);
      }
    }
    if (endpoint === '/rest/v1/couple_members') {
      const pair = url.searchParams.get('couple_id')?.slice(3);
      if (pair === AB_COUPLE) {
        if (actor === 'c' && leak !== 'c-ab-member') return data([]);
        return data([{couple_id: AB_COUPLE, user_id: A},
          {couple_id: AB_COUPLE, user_id: B}]);
      }
      if (pair === C_COUPLE) {
        if (actor === 'c' && hideCOwnMember) return data([]);
        if (actor !== 'c' && leak !== 'ab-c-member') return data([]);
        return data([{couple_id: C_COUPLE, user_id: C}]);
      }
    }
    if (endpoint === '/rest/v1/couple_challenges') {
      const session = url.searchParams.get('session_id')?.slice(3);
      const aCard = {id:'dddddddd-4444-4444-8444-dddddddddddd',
        recipient:A,session_id:AB_SESSION};
      const bCard = {id:'ffffffff-4444-4444-8444-ffffffffffff',
        recipient:B,session_id:AB_SESSION};
      const cCard = {id:'eeeeeeee-4444-4444-8444-eeeeeeeeeeee',
        recipient:C,session_id:C_SESSION};
      if (session === AB_SESSION) {
        if (actor === 'c')
          return data(leak === 'c-ab-card' ? [aCard] : []);
        if (hideABOwnChallenge === actor) return data([]);
        const own = actor === 'a' ? aCard : bCard;
        const partner = actor === 'a' ? bCard : aCard;
        return data(leakPartnerChallenge === actor ? [own,partner] : [own]);
      }
      if (session === C_SESSION) {
        if (actor === 'c')
          return data(hideCOwnChallenge ? [] : [cCard]);
        return data(leak === 'ab-c-card' ? [cCard] : []);
      }
      return data([]);
    }
    throw new Error('Unexpected staging request: ' + endpoint);
  };
  return {transport, calls};
}

test('audit mode is read-only, checks 3 real simulated Auth users and denies 9 cross-duo reads', async () => {
  const {transport, calls} = fakeStage();
  const result = await runStage(config(), 'audit', transport);
  assert.equal(result.mode, 'audit');
  assert.equal(result.real_auth_accounts, 3);
  assert.equal(result.rls_cross_duo_denials, 9);
  assert.equal(result.game_writes, 0);
  assert.equal(calls.filter(x => x.endpoint === '/auth/v1/user').length, 3);
  assert.equal(result.rls_positive_challenge_reads, 3);
  assert.equal(calls.filter(x => x.endpoint === '/rest/v1/couple_challenges').length, 6);
  assert.equal(calls.filter(x => x.endpoint.includes('/rest/v1/rpc/')).length, 0);
  assert(calls.filter(x => x.method === 'POST').every(x => x.endpoint === '/auth/v1/token'));
  assert(!JSON.stringify(result).includes('A-private'));
  assert(!JSON.stringify(result).includes('test-session-'));
});
for (const leak of ['c-ab-session','c-ab-member','c-ab-card',
  'ab-c-session','ab-c-member','ab-c-card']) {
  test('RLS audit fails closed when a foreign row leaks: ' + leak, async () => {
    const {transport, calls} = fakeStage({leak});
    await assert.rejects(runStage(config(), 'audit', transport),
      /RLS isolation failed/);
    assert(calls.every(x => !x.endpoint.includes('/rest/v1/rpc/')));
  });
}
for (const missing of ['hideCOwnSession','hideCOwnMember']) {
  test('RLS audit requires outsider to have own readable records: ' + missing, async () => {
    const {transport, calls} = fakeStage({[missing]: true});
    await assert.rejects(runStage(config(), 'audit', transport),
      /Outsider C must/);
    assert(calls.every(x => !x.endpoint.includes('/rest/v1/rpc/')));
  });
}
test('RLS audit fails before network for repeated third identity or fixtures', async () => {
  const mutations = [
    {LR026_STAGING_C_ID: A},
    {LR026_STAGING_C_ID: B},
    {LR026_STAGING_C_EMAIL: 'a@example.invalid'},
    {LR026_STAGING_C_EMAIL: 'b@example.invalid'},
    {LR026_STAGING_OTHER_COUPLE_ID: AB_COUPLE},
    {LR026_STAGING_OTHER_SESSION_ID: AB_SESSION},
    {LR026_STAGING_C_PASSWORD: ''}
  ];
  for (const fields of mutations) {
    const mock = fakeStage();
    await assert.rejects(runStage({...config(),...fields}, 'audit', mock.transport));
    assert.equal(mock.calls.length, 0);
  }
});
test('audit cannot target known production project even with three real actors', () => {
  assert.throws(() => validateStage({
    ...config(), LR026_STAGING_REF:'ejsrqfpkgwraorrznjpm',
    LR026_CONFIRM_STAGING_REF:'ejsrqfpkgwraorrznjpm'
  }, 'audit'), /Production Supabase project/);
});

for (const options of [
  {hideABOwnChallenge:'a'}, {hideABOwnChallenge:'b'},
  {hideCOwnChallenge:true}, {leakPartnerChallenge:'a'},
  {leakPartnerChallenge:'b'}
]) {
  test('RLS audit refuses missing recipient proof or visible partner card: ' +
    JSON.stringify(options), async () => {
    const {transport, calls} = fakeStage(options);
    await assert.rejects(runStage(config(), 'audit', transport),
      /RLS audit needs/);
    assert(calls.every(x => !x.endpoint.includes('/rest/v1/rpc/')));
  });
}
