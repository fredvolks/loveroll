import test from 'node:test';
import assert from 'node:assert/strict';
import {runStage, validateStage, KNOWN_PRODUCTION_REFS} from './lr026-staging-recipe.mjs';

const ref = 'zzzzzzzzzzzzzzzzzzzz';
const a = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const b = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const couple = 'cccccccc-1111-4111-8111-cccccccccccc';
const session = 'dddddddd-1111-4111-8111-dddddddddddd';
const drawnId = 'eeeeeeee-1111-4111-8111-eeeeeeeeeeee';
const replacedId = 'ffffffff-1111-4111-8111-ffffffffffff';

function env() {
  return {
    LR026_STAGING_REF: ref, LR026_CONFIRM_STAGING_REF: ref,
    LR026_STAGING_URL: 'https://' + ref + '.supabase.co',
    LR026_STAGING_PUBLISHABLE_KEY: 'sb_publishable_fake_test_key_123',
    LR026_STAGING_A_EMAIL: 'a@example.invalid',
    LR026_STAGING_A_PASSWORD: 'fake-password-a',
    LR026_STAGING_A_ID: a,
    LR026_STAGING_B_EMAIL: 'b@example.invalid',
    LR026_STAGING_B_PASSWORD: 'fake-password-b',
    LR026_STAGING_B_ID: b,
    LR026_STAGING_COUPLE_ID: couple,
    LR026_STAGING_SESSION_ID: session,
    LR026_STAGING_ALLOW_WRITES: 'I_ACCEPT_TEST_PROJECT_WRITES_ONLY',
    LR026_STAGING_WRITE_CONFIRM_REF: ref
  };
}
function mockSupabase(opts = {}) {
  let count = 0;
  let drawCount = 0;
  let passCount = 0;
  let lastDraw = null;
  const calls = [];
  const fetchFn = async (uri, init) => {
    count++;
    const url = new URL(uri);
    assert.equal(url.origin, 'https://' + ref + '.supabase.co');
    assert.equal(init.headers.apikey, env().LR026_STAGING_PUBLISHABLE_KEY);
    const path = url.pathname;
    const actorToken = init.headers.Authorization;
    calls.push({method: init.method, path, actorToken});
    const payload = init.body ? JSON.parse(init.body) : undefined;
    const response = (data, status = 200) => new Response(JSON.stringify(data), {status});
    if (path === '/auth/v1/token') {
      const who = payload.email === 'a@example.invalid' ? 'a' : 'b';
      return response({access_token: 'auth-token-for-' + who + '-test'});
    }
    const who = actorToken === 'Bearer auth-token-for-a-test' ? 'a' : 'b';
    const uid = who === 'a' ? a : b;
    if (path === '/auth/v1/user') {
      return response({id: opts.wrongUser && who === 'a' ? b : uid,
        email: who + '@example.invalid',
        email_confirmed_at: '2026-10-10T00:00:00Z'});
    }
    if (path === '/rest/v1/couple_sessions') {
      if (opts.hideSessionB && who === 'b') return response([]);
      return response([{id: session, couple_id: couple,
        finished_at: opts.finishedSession ? '2026-10-29T20:00:00Z' : null,
        paired_turns: false, self_draws: false}]);
    }
    if (path === '/rest/v1/couple_members') {
      if (opts.hideMemberB && who === 'b') return response([]);
      return response([{couple_id: couple, user_id: uid}]);
    }
    if (path === '/rest/v1/couple_personal_rolls') {
      if (opts.missingSecondD6) return response([{user_id: a, face: 2}]);
      return response([{user_id: a, face: 2}, {user_id: b, face: 2}]);
    }
    if (path === '/rest/v1/couple_challenges') {
      if (opts.existingChallengeForB) {
        return response(who === 'b' ? [{id: drawnId, recipient: b, status: 'proposed'}] : []);
      }
      if (opts.existingChallenge) return response([{id: drawnId}]);
      if (!lastDraw || (opts.recipientOnlyRls && who === 'a')) return response([]);
      return response([
        {id: drawnId, status: 'passed', recipient: b, category: 'SENSUEL'},
        {id: replacedId, status: 'proposed', recipient: b,
          category: 'SENSUEL', replaces_challenge_id: drawnId}
      ]);
    }
    if (path === '/rest/v1/rpc/draw_for_partner') {
      assert.equal(who, 'a');
      assert.equal(payload.p_session, session);
      drawCount++;
      lastDraw = {id: drawnId, offered_by: a, recipient: b, category: 'SENSUEL'};
      return response(lastDraw);
    }
    if (path === '/rest/v1/rpc/love_respond_and_redraw') {
      assert.equal(who, 'b');
      assert.equal(payload.p_action, 'pass');
      assert.equal(payload.p_challenge, drawnId);
      passCount++;
      return response({original_id: drawnId, replacement_id: replacedId,
        action: 'pass', already_processed: passCount > 1});
    }
    throw new Error('Unexpected mocked endpoint ' + path);
  };
  return {fetchFn, calls, counters: () => ({count, drawCount, passCount})};
}

test('known live Supabase ref is permanently denied', () => {
  assert(KNOWN_PRODUCTION_REFS.includes('ejsrqfpkgwraorrznjpm'));
  for (const mode of ['check', 'auth', 'play']) {
    assert.throws(() => validateStage({...env(),
      LR026_STAGING_REF: 'ejsrqfpkgwraorrznjpm',
      LR026_CONFIRM_STAGING_REF: 'ejsrqfpkgwraorrznjpm'}, mode),
      /Production Supabase project/);
  }
});
test('offline check returns no network and no secret', async () => {
  const mock = mockSupabase();
  const result = await runStage(env(), 'check', mock.fetchFn);
  assert.deepEqual(result, {stage_ref: ref, mode: 'check', safe: true, network_requests: 0});
  assert.equal(mock.counters().count, 0);
  assert(!JSON.stringify(result).includes('fake-password'));
  assert(!JSON.stringify(result).includes('sb_publishable'));
});
test('mismatched HTTPS endpoint, exact staging confirmation and fake URL are denied', () => {
  assert.throws(() => validateStage({...env(), LR026_STAGING_URL: 'http://' + ref + '.supabase.co'}, 'check'), /exact HTTPS/);
  assert.throws(() => validateStage({...env(), LR026_STAGING_URL: 'https://other.supabase.co'}, 'check'), /exact HTTPS/);
  assert.throws(() => validateStage({...env(), LR026_CONFIRM_STAGING_REF: 'yyyyyyyyyyyyyyyyyyyy'}, 'check'), /not explicitly confirmed/);
  assert.throws(() => validateStage({...env(), LR026_PRODUCTION_REF: ref}, 'check'), /production Supabase/);
});
test('reject privileged service keys, service JWT and extra service role env', () => {
  assert.throws(() => validateStage({...env(), LR026_STAGING_PUBLISHABLE_KEY: 'sb_secret_fake'}, 'check'), /Secret Supabase/);
  const payload = Buffer.from(JSON.stringify({role: 'service_role'})).toString('base64url');
  assert.throws(() => validateStage({...env(), LR026_STAGING_PUBLISHABLE_KEY: 'aaa.' + payload + '.bbb'}, 'check'), /not role anon/);
  assert.throws(() => validateStage({...env(), SUPABASE_SERVICE_ROLE_KEY: 'do-not-use'}, 'check'), /Privileged credential/);
  assert.throws(() => validateStage({...env(), LR026_STAGING_SERVICE_ROLE_KEY: 'do-not-use'}, 'check'), /Privileged credential/);
});
test('writes are blocked before transport unless both independent acknowledgements match', async () => {
  for (const altered of [
    {LR026_STAGING_ALLOW_WRITES: ''},
    {LR026_STAGING_ALLOW_WRITES: 'true'},
    {LR026_STAGING_WRITE_CONFIRM_REF: 'yyyyyyyyyyyyyyyyyyyy'},
    {LR026_STAGING_WRITE_CONFIRM_REF: ''}
  ]) {
    const mock = mockSupabase();
    await assert.rejects(runStage({...env(), ...altered}, 'play', mock.fetchFn), /write acknowledgement/);
    assert.equal(mock.counters().count, 0);
  }
});
test('two independent accounts and valid UUIDs are required before network', async () => {
  for (const altered of [
    {LR026_STAGING_B_ID: a}, {LR026_STAGING_B_EMAIL: 'a@example.invalid'},
    {LR026_STAGING_SESSION_ID: 'not-a-uuid'},
    {LR026_STAGING_A_PASSWORD: ''}
  ]) {
    const mock = mockSupabase();
    await assert.rejects(runStage({...env(), ...altered}, 'auth', mock.fetchFn));
    assert.equal(mock.counters().count, 0);
  }
});
test('Auth mode verifies both real GoTrue sessions plus RLS reads, without RPC writes', async () => {
  const mock = mockSupabase();
  const output = await runStage(env(), 'auth', mock.fetchFn);
  assert.equal(output.real_auth_accounts, 2);
  assert.equal(output.rls_membership_reads, 2);
  assert.equal(output.rls_session_reads, 2);
  assert.equal(mock.counters().drawCount, 0);
  assert.equal(mock.counters().passCount, 0);
  assert.equal(mock.calls.filter(x => x.path === '/auth/v1/user').length, 2);
  assert.equal(mock.calls.filter(x => x.path === '/rest/v1/couple_members').length, 2);
  assert(!JSON.stringify(output).includes('auth-token'));
});
test('a mismatched account identity fails authentication/RLS recipe early', async () => {
  const mock = mockSupabase({wrongUser: true});
  await assert.rejects(runStage(env(), 'auth', mock.fetchFn), /Authenticated user ID/);
  assert.equal(mock.counters().drawCount, 0);
});
test('play mode runs exactly one normal D100 plus one pass and one idempotent replay', async () => {
  const mock = mockSupabase();
  const out = await runStage(env(), 'play', mock.fetchFn);
  assert.equal(out.draw_id, drawnId);
  assert.equal(out.replacement_id, replacedId);
  assert.equal(out.persisted_challenges, 2);
  assert.equal(out.pass_replay_idempotent, true);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
  assert(!JSON.stringify(out).includes('fake-password'));
  assert(!JSON.stringify(out).includes('auth-token'));
});
test('preexisting staged challenge prevents ANY additional D100 draw', async () => {
  const mock = mockSupabase({existingChallenge: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn), /clean session/);
  assert.equal(mock.counters().drawCount, 0);
  assert.equal(mock.counters().passCount, 0);
});

test('remote Auth error cannot reveal credentials, arbitrary messages or access tokens', async () => {
  const secret = 'test-password-never-echo';
  const external = async () => new Response(
    JSON.stringify({message: secret, error_description: 'Bearer secret-test-token',
      code: 'invalid_credentials'}), {status: 400});
  await assert.rejects(runStage({...env(),
    LR026_STAGING_A_PASSWORD: secret}, 'auth', external), e => {
    assert.match(e.message, /Supabase API 400/);
    assert.match(e.message, /invalid_credentials/);
    assert(!e.message.includes(secret));
    assert(!e.message.includes('secret-test-token'));
    assert(!e.message.includes('Bearer'));
    return true;
  });
});

test('real RLS session/member denial fails before any gameplay writes', async () => {
  for (const opt of [{hideSessionB: true}, {hideMemberB: true}, {finishedSession: true}]) {
    const mock = mockSupabase(opt);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn), /Active staging session|own membership/);
    assert.equal(mock.counters().drawCount, 0);
    assert.equal(mock.counters().passCount, 0);
  }
});
test('missing second D6 blocks real D100 before gameplay writes', async () => {
  const mock = mockSupabase({missingSecondD6: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn), /Two D6 rolls/);
  assert.equal(mock.counters().drawCount, 0);
  assert.equal(mock.counters().passCount, 0);
});

test('real recipient-only RLS: recipient B already has a card invisible to drawer A, so writes are blocked', async () => {
  const mock = mockSupabase({existingChallengeForB: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn), /clean session/);
  assert.equal(mock.counters().drawCount, 0);
  assert.equal(mock.counters().passCount, 0);
  const challenges = mock.calls.filter(x => x.path === '/rest/v1/couple_challenges');
  assert.deepEqual(challenges.map(x => x.actorToken), [
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
  ]);
});
test('real recipient-only RLS: a clean session can draw even if drawer A cannot read B cards', async () => {
  const mock = mockSupabase({recipientOnlyRls: true});
  const result = await runStage(env(), 'play', mock.fetchFn);
  assert.equal(result.pass_replay_idempotent, true);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
  const challenges = mock.calls.filter(x => x.path === '/rest/v1/couple_challenges');
  assert.deepEqual(challenges.map(x => x.actorToken), [
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test',
    'Bearer auth-token-for-b-test'
  ]);
});
