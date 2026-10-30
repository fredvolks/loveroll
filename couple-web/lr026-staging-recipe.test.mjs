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
      const isPlayFlagsRead = url.searchParams.get('select') === 'id,paired_turns,self_draws';
      return response([{id: isPlayFlagsRead && opts.wrongPlaySessionIdB && who === 'b' ?
        couple : session, couple_id: couple,
        finished_at: opts.finishedSession ? '2026-10-29T20:00:00Z' : null,
        paired_turns: Boolean(isPlayFlagsRead && opts.pairedTurnsForB && who === 'b'),
        self_draws: Boolean(isPlayFlagsRead && opts.selfDrawsForB && who === 'b')}]);
    }
    if (path === '/rest/v1/couple_members') {
      if (opts.hideMemberB && who === 'b') return response([]);
      if (opts.hidePartnerFromA && who === 'a')
        return response([{couple_id: couple, user_id: a}]);
      const members = [{couple_id: couple, user_id: a},
        {couple_id: couple, user_id: b}];
      if (opts.extraThirdMember) members.push({couple_id: couple,
        user_id: 'cccccccc-1111-4111-8111-cccccccccccc'});
      return response(members);
    }
    if (path === '/rest/v1/couple_personal_rolls') {
      const valid = [
        {session_id: session, user_id: a, face: 2},
        {session_id: session, user_id: b, face: 4}
      ];
      // All three mutations preserve a valid two-roll snapshot under both
      // users; only its timing is corrupt and must fail at the right gate.
      if ((opts.d6MutatedAfterDraw && drawCount === 1) ||
          (opts.d6MutatedAfterFirstPass && passCount === 1) ||
          (opts.d6MutatedAfterReplay && passCount === 2))
        return response([valid[0], {...valid[1], face: 5}]);
      if (opts.d6DifferentFaceAfterDrawForB && drawCount === 1 && who === 'b')
        return response([valid[0], {...valid[1], face: 5}]);
      if (opts.d6HiddenFromB && who === 'b') return response([]);
      if (opts.d6DifferentFaceForB && who === 'b')
        return response([valid[0], {...valid[1], face: 5}]);
      if (opts.d6SwappedFacesForB && who === 'b')
        return response([{...valid[0], face: 4}, {...valid[1], face: 2}]);
      if (opts.d6ReorderedForB && who === 'b') return response([...valid].reverse());
      if (opts.missingSecondD6) return response(valid.slice(0, 1));
      if (opts.duplicateD6) return response([valid[0], {...valid[0]}]);
      if (opts.d6WrongOwner) return response([
        valid[0], {...valid[1], user_id: couple}
      ]);
      if (opts.d6WrongSession) return response([
        valid[0], {...valid[1], session_id: couple}
      ]);
      if (opts.d6InvalidFace) return response([
        valid[0], {...valid[1], face: 7}
      ]);
      if (opts.d6FractionalFace) return response([
        valid[0], {...valid[1], face: 2.5}
      ]);
      return response(valid);
    }
    if (path === '/rest/v1/couple_challenges') {
      if (opts.existingChallengeForB) {
        return response(who === 'b' ? [{id: drawnId, recipient: b, status: 'proposed'}] : []);
      }
      if (opts.existingChallenge) return response([{id: drawnId}]);
      if (!lastDraw) return response([]);
      // The first persisted draw must be a single proposed card BEFORE Passer.
      // Later corruption is injected only after the Passer RPC to exercise
      // both independent checkpoints rather than failing at the first one.
      const beforePass = passCount === 0;
      if (who === 'a') {
        if ((beforePass && opts.firstCardForA) ||
            (passCount === 1 && opts.firstPassCardForA) ||
            (!beforePass && opts.unexpectedCardForA)) return response([{
          id: '99999999-1111-4111-8111-999999999999', session_id: session,
          offered_by: b, status: 'proposed', recipient: a, category: 'SENSUEL'
        }]);
        if (beforePass || !opts.leaksPartnerRowsToA) return response([]);
      }
      const original = {
        id: beforePass && opts.firstWrongId ? replacedId : drawnId,
        session_id: beforePass && opts.firstWrongSession ? couple : session,
        offered_by: beforePass && opts.firstWrongOfferer ? b : a,
        recipient: beforePass && opts.firstWrongRecipient ? a :
          !beforePass && opts.wrongOriginalRecipient ? a : b,
        category: beforePass && opts.firstWrongCategory ? 'SEXUEL' :
          !beforePass && opts.wrongOriginalCategory ? 'SEXUEL' : 'SENSUEL',
        status: beforePass && !opts.firstWrongStatus ? 'proposed' : 'passed',
        replaces_challenge_id: beforePass && opts.firstReplacesCard ? replacedId : null
      };
      if (beforePass) {
        if (opts.firstMissingCard) return response([]);
        if (opts.firstExtraCard) return response([original, {...original,id:replacedId}]);
        return response([original]);
      }
      if (passCount === 1 && opts.firstPassMissingReplacement)
        return response([original]);
      const replacement = {
        id: replacedId,
        session_id: passCount === 1 && opts.firstPassWrongSession ? couple : session,
        offered_by: (passCount === 1 && opts.firstPassWrongReplacementOfferer) ||
          (passCount > 1 && opts.replayMutatesReplacementOfferer) ? b : a,
        status: 'proposed', recipient: b,
        category: passCount === 1 && opts.firstPassWrongCategory ? 'SEXUEL' : 'SENSUEL',
        replaces_challenge_id: passCount === 1 && opts.firstPassWrongReference ?
          null : drawnId
      };
      if (passCount === 1 && opts.firstPassWrongStatus)
        return response([{...original, status: 'proposed'}, replacement]);
      const rows = [original, replacement];
      return response(passCount > 1 && opts.replayReordersRows ? rows.reverse() : rows);
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
        action: passCount > 1 && opts.replayWrongAction ? 'declined' : 'pass',
        already_processed: passCount > 1});
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
  const d6Reads = mock.calls.filter(x => x.path === '/rest/v1/couple_personal_rolls');
  assert.deepEqual(d6Reads.map(x => x.actorToken), Array(4).fill([
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
  ]).flat(), 'The same pair of D6 rolls is read before, during and after gameplay');
  const finalViews = mock.calls.filter(x => x.path === '/rest/v1/couple_challenges');
  assert.deepEqual(finalViews.map(x => x.actorToken), [
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test',
    'Bearer auth-token-for-b-test', 'Bearer auth-token-for-a-test',
    'Bearer auth-token-for-b-test', 'Bearer auth-token-for-a-test',
    'Bearer auth-token-for-b-test', 'Bearer auth-token-for-a-test'
  ]);
  const firstRead = mock.calls.findIndex(x => x.path === '/rest/v1/couple_challenges' &&
    finalViews.indexOf(x) === 2);
  const passCall = mock.calls.findIndex(x => x.path === '/rest/v1/rpc/love_respond_and_redraw');
  assert(firstRead !== -1 && firstRead < passCall, 'The persisted first draw must be checked before Passer');
  const passCalls = mock.calls.map((call, index) =>
    call.path === '/rest/v1/rpc/love_respond_and_redraw' ? index : -1
  ).filter(index => index !== -1);
  const challengeReads = mock.calls.map((call, index) =>
    call.path === '/rest/v1/couple_challenges' ? index : -1
  ).filter(index => index !== -1);
  assert(challengeReads[4] < passCalls[1] && challengeReads[5] < passCalls[1],
    'The first Passer persistence must be checked before idempotent replay');
  assert(challengeReads[6] > passCalls[1] && challengeReads[7] > passCalls[1],
    'The replay must be followed by a new persisted-state comparison');
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
  assert(!JSON.stringify(out).includes('fake-password'));
  assert(!JSON.stringify(out).includes('auth-token'));
});
for (const options of [
  {d6DifferentFaceForB: true},
  {d6SwappedFacesForB: true}
]) {
  test('mismatched D6 owner/face snapshot blocks any D100 or Passer: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn),
      /D6 faces disagree between partner A and B/);
    assert.equal(mock.counters().drawCount, 0);
    assert.equal(mock.counters().passCount, 0);
  });
}

for (const [options, expectedPasses, message] of [
  [{d6MutatedAfterDraw: true}, 0, /D6 snapshot changed after D100/],
  [{d6DifferentFaceAfterDrawForB: true}, 0, /D6 faces disagree between partner A and B/],
  [{d6MutatedAfterFirstPass: true}, 1, /D6 snapshot changed after the first Passer/],
  [{d6MutatedAfterReplay: true}, 2, /D6 snapshot changed after idempotent Passer replay/]
]) {
  test('D6 mutation is detected at the correct replay safety gate: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn), message);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, expectedPasses,
      'Unexpected downstream Passer RPC after D6 mutation');
  });
}

test('D6 order differs across authenticated views without invalidating faces', async () => {
  const mock = mockSupabase({d6ReorderedForB: true});
  const out = await runStage(env(), 'play', mock.fetchFn);
  assert.equal(out.pass_replay_idempotent, true);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});

for (const options of [
  {pairedTurnsForB: true},
  {selfDrawsForB: true},
  {wrongPlaySessionIdB: true}
]) {
  test('B must also see correct partner-draw session flags before D100: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn),
      /Mutating recipe requires both partners/);
    assert.equal(mock.counters().drawCount, 0);
    assert.equal(mock.counters().passCount, 0);
  });
}
test('normal play validates feature flags under both authenticated accounts', async () => {
  const mock = mockSupabase();
  await runStage(env(), 'play', mock.fetchFn);
  const specific = mock.calls.filter(c => c.path === '/rest/v1/couple_sessions');
  assert.deepEqual(specific.map(c => c.actorToken), [
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test',
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
  ]);
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
    await assert.rejects(runStage(env(), 'play', mock.fetchFn), /Active staging session|exactly A and B/);
    assert.equal(mock.counters().drawCount, 0);
    assert.equal(mock.counters().passCount, 0);
  }
});
for (const options of [
  {missingSecondD6: true},
  {d6HiddenFromB: true},
  {duplicateD6: true},
  {d6WrongOwner: true},
  {d6WrongSession: true},
  {d6InvalidFace: true},
  {d6FractionalFace: true}
]) {
  test('malformed or B-invisible D6 blocks all gameplay writes: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn),
      /Two valid D6 rolls for this session/);
    assert.equal(mock.counters().drawCount, 0);
    assert.equal(mock.counters().passCount, 0);
    assert.equal(mock.calls.filter(x =>
      x.path === '/rest/v1/rpc/draw_for_partner' ||
      x.path === '/rest/v1/rpc/love_respond_and_redraw').length, 0);
  });
}

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
    'Bearer auth-token-for-b-test', 'Bearer auth-token-for-a-test',
    'Bearer auth-token-for-b-test', 'Bearer auth-token-for-a-test',
    'Bearer auth-token-for-b-test', 'Bearer auth-token-for-a-test'
  ]);
});

for (const options of [
  {firstMissingCard: true},
  {firstExtraCard: true},
  {firstWrongId: true},
  {firstWrongSession: true},
  {firstWrongOfferer: true},
  {firstWrongRecipient: true},
  {firstWrongCategory: true},
  {firstWrongStatus: true},
  {firstReplacesCard: true},
  {firstCardForA: true}
]) {
  test('first D100 persisted state blocks Passer when invalid: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn),
      /First D100 must/);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 0,
      'Passer MUST NOT run when the first draw is corrupt');
  });
}

for (const options of [
  {unexpectedCardForA: true},
  {leaksPartnerRowsToA: true},
  {wrongOriginalCategory: true},
  {wrongOriginalRecipient: true},
  {firstPassMissingReplacement: true},
  {firstPassWrongStatus: true},
  {firstPassWrongReference: true},
  {firstPassWrongSession: true},
  {firstPassWrongCategory: true},
  {firstPassWrongReplacementOfferer: true},
  {firstPassCardForA: true}
]) {
  test('invalid first Passer state is never replayed: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn),
      /Unexpected challenge addressed to A|Only the two correct-category B challenges|Only one original passed|Exactly one same-category replacement/);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 1,
      'A malformed persisted Passer must stop BEFORE a second RPC');
  });
}

test('idempotent replay can reorder rows but must not mutate their contents', async () => {
  const mock = mockSupabase({replayReordersRows: true});
  const out = await runStage(env(), 'play', mock.fetchFn);
  assert.equal(out.pass_replay_idempotent, true);
  assert.equal(mock.counters().passCount, 2);
});
test('idempotent replay cannot alter persisted replacement even when returning same ID', async () => {
  const mock = mockSupabase({replayMutatesReplacementOfferer: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated Passer must not change any persisted challenge field|Exactly one same-category replacement offered by A/);
  assert.equal(mock.counters().passCount, 2);
});
test('idempotent replay must keep official Passer action', async () => {
  const mock = mockSupabase({replayWrongAction: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated Passer must return the exact persisted replacement/);
  assert.equal(mock.counters().passCount, 2);
});

test('a third member or incomplete RLS membership view blocks every D100 before writes', async () => {
  for (const options of [{extraThirdMember: true}, {hidePartnerFromA: true}]) {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn), /exactly A and B/);
    assert.equal(mock.counters().drawCount, 0);
    assert.equal(mock.counters().passCount, 0);
  }
});
test('real member policy exposes the same exact two-person duo to both accounts', async () => {
  const mock = mockSupabase();
  const out = await runStage(env(), 'auth', mock.fetchFn);
  assert.equal(out.rls_membership_reads, 2);
  const memberRequests = mock.calls.filter(x => x.path === '/rest/v1/couple_members');
  assert.deepEqual(memberRequests.map(x => x.actorToken), [
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
  ]);
});
