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
  const loginCounts = {a:0,b:0};
  const sessionReadCounts = {a:0,b:0};
  const memberReadCounts = {a:0,b:0};
  const calls = [];
  const fetchFn = async (uri, init) => {
    count++;
    const url = new URL(uri);
    assert.equal(url.origin, 'https://' + ref + '.supabase.co');
    assert.equal(init.headers.apikey, env().LR026_STAGING_PUBLISHABLE_KEY);
    const path = url.pathname;
    const actorToken = init.headers.Authorization;
    const secondDevice = actorToken?.includes('-device-2');
    const payload = init.body ? JSON.parse(init.body) : undefined;
    calls.push({method: init.method, path, actorToken, payload});
    const response = (data, status = 200) => new Response(JSON.stringify(data), {status});
    if (path === '/auth/v1/token') {
      const who = payload.email === 'a@example.invalid' ? 'a' : 'b';
      loginCounts[who]++;
      const suffix = loginCounts[who] > 1 && !opts.staleReusesToken
        ? '-device-' + loginCounts[who] : '';
      return response({access_token: 'auth-token-for-' + who + '-test' + suffix});
    }
    const who = actorToken?.startsWith('Bearer auth-token-for-a-test') ? 'a' : 'b';
    const uid = who === 'a' ? a : b;
    const drawerWho = opts.drawerB ? 'b' : 'a';
    const recipientWho = opts.drawerB ? 'a' : 'b';
    const giverId = opts.drawerB ? b : a;
    const recipientId = opts.drawerB ? a : b;
    if (path === '/auth/v1/user') {
      return response({id: (opts.wrongUser && who === 'a') ||
        (opts.staleWrongUser && actorToken?.includes('-device-2'))
          ? (who === 'a' ? b : a) : uid,
        email: who + '@example.invalid',
        email_confirmed_at: '2026-10-10T00:00:00Z'});
    }
    if (path === '/rest/v1/couple_sessions') {
      if (secondDevice && opts.staleDeviceHiddenSession) return response([]);
      if (secondDevice && passCount > 2 && opts.staleDeviceClosedSessionAfterConflict)
        return response([{id:session,couple_id:couple,
          finished_at:'2026-10-30T12:00:00Z',
          paired_turns:false,self_draws:false}]);
      const afterDraw = drawCount === 1 && passCount === 0;
      const afterFirstPass = passCount === 1;
      const afterReplay = passCount === 2;
      if (opts.hideSessionB && who === 'b') return response([]);
      if (opts.duetSessionHiddenFromBAfterDraw && afterDraw && who === 'b')
        return response([]);
      // Both initial Auth and game preflight request all lifecycle fields.
      // Inject drift on the second read only, to prove that a previously
      // valid Auth check cannot authorize an unsafe draw later.
      sessionReadCounts[who]++;
      const isPlayFlagsRead = sessionReadCounts[who] === 2 &&
        drawCount === 0 && passCount === 0;
      return response([{
        id: (isPlayFlagsRead && opts.wrongPlaySessionIdB && who === 'b') ||
          (afterDraw && opts.duetWrongSessionAfterDraw) ? couple : session,
        couple_id: (afterDraw && opts.duetWrongCoupleAfterDraw) ||
          (isPlayFlagsRead && opts.preflightWrongCoupleB && who === 'b')
          ? a : couple,
        finished_at: opts.finishedSession ||
          (isPlayFlagsRead && opts.preflightClosedSessionB && who === 'b') ||
          (afterDraw && opts.duetClosedAfterDraw) ||
          (afterFirstPass && opts.duetClosedAfterFirstPass) ||
          (afterReplay && opts.duetClosedAfterReplay)
            ? '2026-10-29T20:00:00Z' : null,
        paired_turns: Boolean((isPlayFlagsRead && opts.pairedTurnsForB && who === 'b') ||
          (afterDraw && opts.duetPairedTurnsAfterDraw)),
        self_draws: Boolean((isPlayFlagsRead && opts.selfDrawsForB && who === 'b') ||
          (afterDraw && opts.duetSelfDrawsAfterDraw))
      }]);
    }
    if (path === '/rest/v1/couple_members') {
      memberReadCounts[who]++;
      const preflightMemberRead = memberReadCounts[who] === 2 &&
        drawCount === 0 && passCount === 0;
      if (preflightMemberRead && who === 'b' && opts.preflightHidesPartnerB)
        return response([{couple_id: couple, user_id: b}]);
      if (secondDevice && opts.staleDeviceMissingMember)
        return response([{couple_id:couple,user_id:uid}]);
      if (opts.hideMemberB && who === 'b') return response([]);
      if (opts.hidePartnerFromA && who === 'a')
        return response([{couple_id: couple, user_id: a}]);
      const members = [{couple_id: couple, user_id: a},
        {couple_id: couple, user_id: b}];
      if (opts.extraThirdMember ||
          (preflightMemberRead && who === 'b' && opts.preflightThirdMemberB) ||
          (opts.duetThirdMemberAfterDraw &&
          drawCount === 1 && passCount === 0))
        members.push({couple_id: couple,
          user_id: 'cccccccc-1111-4111-8111-cccccccccccc'});
      if (opts.duetMemberMissingAfterFirstPass && passCount === 1 && who === 'b')
        return response([members[0]]);
      if (opts.duetMemberMissingAfterReplay && passCount === 2 && who === 'a')
        return response([members[1]]);
      return response(members);
    }
    if (path === '/rest/v1/couple_personal_rolls') {
      if (secondDevice && opts.staleDeviceD6Hidden) return response([]);
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
      if (secondDevice && (opts.staleDeviceD6Mismatch ||
        (opts.staleDeviceD6ChangesAfterConflict && passCount > 2)))
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
      if (secondDevice && opts.staleDeviceHidesCards) return response([]);
      if (opts.existingChallengeForB || opts.existingChallengeForA) {
        const addressedTo = opts.existingChallengeForA ? 'a' : 'b';
        const recipientIdToShow = addressedTo === 'a' ? a : b;
        return response(who === addressedTo ?
          [{id: drawnId, recipient: recipientIdToShow, status: 'proposed'}] : []);
      }
      if (opts.existingChallenge) return response([{id: drawnId}]);
      if (!lastDraw) return response([]);
      // The first persisted draw must be a single proposed card BEFORE Passer.
      // Later corruption is injected only after the Passer RPC to exercise
      // both independent checkpoints rather than failing at the first one.
      const beforePass = passCount === 0;
      if (who === drawerWho) {
        if ((beforePass && opts.firstCardForA) ||
            (passCount === 1 && opts.firstPassCardForA) ||
            (!beforePass && opts.unexpectedCardForA)) return response([{
          id: '99999999-1111-4111-8111-999999999999', session_id: session,
          offered_by: recipientId, status: 'proposed', recipient: giverId, category: 'SENSUEL'
        }]);
        if (beforePass || !opts.leaksPartnerRowsToA) return response([]);
      }
      const category = lastDraw.category;
      const otherCategory = category === 'SEXUEL' ? 'SENSUEL' : 'SEXUEL';
      const original = {
        id: beforePass && opts.firstWrongId ? replacedId : drawnId,
        session_id: beforePass && opts.firstWrongSession ? couple : session,
        couple_id: (beforePass && opts.firstWrongStoredCouple) ||
          (!beforePass && opts.afterResponseWrongOriginalCouple) ? a : couple,
        offered_by: beforePass && opts.firstWrongOfferer ? recipientId : giverId,
        recipient: beforePass && opts.firstWrongRecipient ? giverId :
          !beforePass && opts.wrongOriginalRecipient ? giverId : recipientId,
        category: (beforePass && opts.firstWrongCategory) ||
          (!beforePass && opts.wrongOriginalCategory) ? otherCategory : category,
        status: beforePass ? opts.firstWrongStatus ? 'passed' : 'proposed'
          : (opts.expectedAction === 'refuse' ? 'refused' : 'passed'),
        created_at: beforePass && opts.firstWrongStoredCreatedAt ?
          '2026-10-30T11:30:00Z' : !beforePass && opts.firstPassMutatesOriginalCreatedAt ?
          '2026-10-30T13:30:00Z' : '2026-10-30T12:00:00Z',
        passed_at: beforePass ? (opts.firstUnexpectedPassedAt ? '2026-10-30T12:00:00Z' : null)
          : opts.expectedAction === 'refuse'
            ? (opts.afterRefuseUnexpectedPassStamp ? '2026-10-30T12:00:00Z' : null)
            : opts.afterPassMissingStamp ? null
              : opts.afterPassInvalidStamp ? 'invalid-stamp'
                : passCount > 1 && (opts.replayMutatesPassedAt ||
                    (passCount > 2 && opts.staleMutatesPassedAt))
                  ? '2026-10-30T13:00:00Z' : '2026-10-30T12:00:00Z',
        refused_at: beforePass ? (opts.firstUnexpectedRefusedAt ? '2026-10-30T12:00:00Z' : null)
          : opts.expectedAction === 'refuse'
            ? (opts.afterRefuseMissingStamp ? null :
                passCount > 2 && opts.staleMutatesRefusedAt
                  ? '2026-10-30T13:00:00Z' : '2026-10-30T12:00:00Z')
            : (opts.afterPassUnexpectedRefuseStamp ? '2026-10-30T12:00:00Z' : null),
        face: beforePass && opts.firstWrongFace ? 0 :
          !beforePass && opts.firstPassMutatesOriginalFace ? 22 : 14,
        card_id: beforePass && opts.firstWrongCardId ? 0 :
          !beforePass && opts.firstPassMutatesOriginalCardId ? 22 : 3,
        card_title: beforePass && opts.firstWrongStoredTitle ? 'Incorrect title' :
          !beforePass && opts.firstPassMutatesOriginalTitle ? 'Changed title' : 'First card',
        card_description: beforePass && opts.firstWrongStoredDescription ?
          'Incorrect description' : 'First description',
        card_timer_minutes: beforePass && opts.firstWrongStoredTimer ? 6 :
          !beforePass && opts.firstPassMutatesOriginalTimer ? 5 : 3,
        is_gifted: Boolean(beforePass && opts.firstWrongStoredGift),
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
        couple_id: (passCount === 1 && opts.afterResponseWrongReplacementCouple) ||
          (passCount > 1 && opts.replayMutatesReplacementCouple) ? a : couple,
        offered_by: (passCount === 1 && opts.firstPassWrongReplacementOfferer) ||
          (passCount > 1 && opts.replayMutatesReplacementOfferer) ||
          (passCount > 2 && opts.staleMutatesReplacementOfferer)
            ? recipientId : giverId,
        status: 'proposed', recipient: recipientId,
        created_at: passCount === 1 && opts.firstPassInvalidReplacementCreatedAt ?
          'invalid-stamp' : passCount > 1 &&
          (opts.replayMutatesReplacementCreatedAt ||
            (passCount > 2 && opts.staleMutatesReplacementCreatedAt)) ?
          '2026-10-30T13:30:00Z' : '2026-10-30T12:10:00Z',
        passed_at: opts.replacementUnexpectedPassedAt ? '2026-10-30T12:00:00Z' : null,
        refused_at: opts.replacementUnexpectedRefusedAt ? '2026-10-30T12:00:00Z' : null,
        face: (passCount === 1 && opts.firstPassDuplicateFace) ? 14 :
          (passCount === 1 && opts.firstPassInvalidFace) ? 101 : 53,
        card_id: (passCount === 1 && opts.firstPassDuplicateCard) ? 3 :
          (passCount === 1 && opts.firstPassInvalidCardId) ? 0 : 8,
        card_title: passCount === 1 && opts.firstPassBlankReplacementTitle ?
          '' : 'Replacement card',
        card_description: passCount > 1 && opts.replayMutatesReplacementDescription ?
          'Changed description' : 'Replacement description',
        card_timer_minutes: passCount === 1 && opts.firstPassInvalidReplacementTimer ? -5 : 4,
        is_gifted: Boolean(passCount === 1 && opts.firstPassWrongReplacementGift),
        category: (passCount === 1 && opts.firstPassWrongCategory) ||
          (passCount > 1 && opts.replayMutatesReplacementCategory) ?
            otherCategory : category,
        replaces_challenge_id: passCount === 1 && opts.firstPassWrongReference ?
          null : drawnId
      };
      if (passCount === 1 && opts.firstPassWrongStatus)
        return response([{...original, status: 'proposed'}, replacement]);
      const rows = [original, replacement];
      if (secondDevice && opts.staleDeviceMisroutesCard)
        return response([original,{...replacement,recipient:giverId}]);
      return response(passCount > 1 && opts.replayReordersRows ? rows.reverse() : rows);
    }
    if (path === '/rest/v1/rpc/draw_for_partner') {
      assert.equal(who, drawerWho);
      assert.equal(payload.p_session, session);
      drawCount++;
      assert.equal(payload.p_preference, opts.expectedPreference ?? 'SENSUEL');
      assert.equal(payload.p_random, opts.expectedRandom ?? false);
      lastDraw = {id: drawnId, session_id: session, couple_id: couple,
        offered_by: giverId, recipient: recipientId, face: 14, card_id: 3,
        card_title: opts.drawEmptyTitle ? '' : 'First card',
        card_description: 'First description',
        card_timer_minutes: 3, is_gifted: false,
        created_at: opts.drawInvalidCreatedAt ? 'broken-date' : '2026-10-30T12:00:00Z',
        category: opts.drawUnknownCategory ? 'INVALID' :
          opts.drawSexuel ? 'SEXUEL' : 'SENSUEL'};
      return response({
        ...lastDraw,
        session_id: opts.drawRpcWrongSession ? couple : lastDraw.session_id,
        couple_id: opts.drawRpcWrongCouple ? a : lastDraw.couple_id,
        face: opts.drawRpcInvalidFace ? 0 : opts.drawRpcWrongFace ? 54 : lastDraw.face,
        card_id: opts.drawRpcInvalidCardId ? 0 :
          opts.drawRpcWrongCardId ? 9 : lastDraw.card_id
      });
    }
    if (path === '/rest/v1/rpc/love_respond_and_redraw') {
      assert.equal(who, recipientWho);
      const action = opts.expectedAction ?? 'pass';
      const excluded = opts.expectedExclude ?? false;
      let wanted = {action,exclude:excluded};
      if (passCount >= 2 && opts.expectStaleReplay) {
        const alternatives = action === 'pass'
          ? [{action:'refuse',exclude:true}]
          : [{action:'pass',exclude:false},{action:'refuse',exclude:!excluded}];
        wanted = alternatives[passCount-2];
        assert.ok(wanted,'the staging recipe may not issue extra RPC requests');
      }
      assert.equal(payload.p_action, wanted.action);
      assert.equal(payload.p_exclude, wanted.exclude);
      assert.equal(payload.p_challenge, drawnId);
      passCount++;
      const stale = passCount > 2;
      return response({
        original_id: drawnId,
        replacement_id: stale && opts.staleWrongReplacement ? drawnId : replacedId,
        action: (stale && opts.staleWrongAction) ||
          (passCount > 1 && opts.replayWrongAction) ? 'declined' : action,
        excluded: (stale && opts.staleWrongExclusion) ||
          (passCount > 1 && opts.replayWrongExclusion) ? !excluded : excluded,
        // Official SQL returns this field only on first processing;
        // subsequent already_processed receipts omit it entirely.
        replacement_unavailable: passCount === 1
          ? Boolean(opts.firstResponseUnavailableFlag)
          : ((passCount === 2 && opts.replayUnavailableFlag) ||
             (passCount > 2 && opts.staleUnavailableFlag) ? true : undefined),
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
test('read-only --ready proves both A/B identities, D6 and an empty evening before gameplay', async () => {
 const mock=mockSupabase();
 const readOnlyEnv={...env(),LR026_STAGING_ALLOW_WRITES:'',
  LR026_STAGING_WRITE_CONFIRM_REF:''};
 const out=await runStage(readOnlyEnv,'ready',mock.fetchFn);
 assert.equal(out.mode,'ready');
 assert.equal(out.game_writes,0);
 assert.equal(out.preflight,'fresh_legacy_duo_verified');
 assert.equal(out.real_auth_accounts,2);
 assert.equal(out.rls_d6_views,2);
 assert.equal(out.rls_empty_challenge_views,2);
 assert.equal(mock.counters().drawCount,0);
 assert.equal(mock.counters().passCount,0);
 const rpc=mock.calls.filter(c=>c.path.startsWith('/rest/v1/rpc/'));
 assert.deepEqual(rpc,[],'ready must never call a game RPC');
 const d6=mock.calls.filter(c=>c.path==='/rest/v1/couple_personal_rolls');
 const cards=mock.calls.filter(c=>c.path==='/rest/v1/couple_challenges');
 for(const reads of [d6,cards]){
  assert.deepEqual(reads.map(c=>c.actorToken),
   ['Bearer auth-token-for-a-test','Bearer auth-token-for-b-test']);
  assert(reads.every(c=>c.method==='GET'));
 }
});

for(const [name,opts,error] of [
 ['session flags hidden on B',{pairedTurnsForB:true},/fresh legacy partner-draw/],
 ['session closes after Auth',{preflightClosedSessionB:true},/same active, fresh legacy partner-draw/],
 ['session changes couple after Auth',{preflightWrongCoupleB:true},/same active, fresh legacy partner-draw/],
 ['session self mode on B',{selfDrawsForB:true},/fresh legacy partner-draw/],
 ['one D6 missing',{missingSecondD6:true},/Two valid D6 rolls/],
 ['different D6 on B',{d6DifferentFaceForB:true},/D6 faces disagree/],
 ['existing card for A',{existingChallengeForA:true},/Play recipe requires a clean session/],
 ['existing card for B',{existingChallengeForB:true},/Play recipe requires a clean session/],
 ['missing membership view',{hidePartnerFromA:true},/exactly A and B/],
 ['new third member since Auth',{preflightThirdMemberB:true},/still see exactly A and B/],
 ['partner hidden since Auth',{preflightHidesPartnerB:true},/still see exactly A and B/]
]){
 test('read-only ready fails closed on '+name,async()=>{
  const mock=mockSupabase(opts);
  await assert.rejects(runStage({...env(),LR026_STAGING_ALLOW_WRITES:''},
   'ready',mock.fetchFn),error);
  assert.equal(mock.counters().drawCount,0);
  assert.equal(mock.counters().passCount,0);
  assert(!mock.calls.some(c=>c.path.startsWith('/rest/v1/rpc/')));
 });
}

for (const [name,opts] of [
  ['session closes between Auth and first D100', {preflightClosedSessionB:true}],
  ['session changes couple between Auth and first D100', {preflightWrongCoupleB:true}]
]) {
  for (const drawer of ['A','B']) {
    test('play fails before any RPC when '+name+' (drawer '+drawer+')', async () => {
      const mock = mockSupabase({...opts,drawerB:drawer==='B'});
      await assert.rejects(runStage({...env(),LR026_STAGING_DRAWER:drawer},
        'play',mock.fetchFn),/same active, fresh legacy partner-draw/);
      assert.equal(mock.counters().drawCount,0);
      assert.equal(mock.counters().passCount,0);
      assert.deepEqual(mock.calls.filter(c=>c.path.startsWith('/rest/v1/rpc/')),[]);
      const reads=mock.calls.filter(c=>c.path==='/rest/v1/couple_sessions');
      assert.equal(reads.length,4,
        'both accounts must complete initial Auth checks before detecting preflight drift');
    });
  }
}

for (const [name,opts] of [
  ['a third member joins the couple after Auth',{preflightThirdMemberB:true}],
  ['B loses visibility of A after Auth',{preflightHidesPartnerB:true}]
]) {
  for (const drawer of ['A','B']) {
    test('D100 refuses changed membership before writes: '+name+' (drawer '+drawer+')',
      async () => {
        const mock=mockSupabase({...opts,drawerB:drawer==='B'});
        await assert.rejects(runStage({...env(),LR026_STAGING_DRAWER:drawer},
          'play',mock.fetchFn),/still see exactly A and B/);
        assert.equal(mock.counters().drawCount,0);
        assert.equal(mock.counters().passCount,0);
        assert.equal(mock.calls.filter(c=>c.path.startsWith('/rest/v1/rpc/')).length,0);
        const memberReads=mock.calls.filter(c=>c.path==='/rest/v1/couple_members');
        assert.equal(memberReads.length,4,
          'the drift must be discovered at fresh preflight, not initial Auth');
      });
  }
}

test('read-only --ready rejects the production project before any network',async()=>{
 const mock=mockSupabase();
 await assert.rejects(runStage({...env(),
  LR026_STAGING_REF:'ejsrqfpkgwraorrznjpm',
  LR026_CONFIRM_STAGING_REF:'ejsrqfpkgwraorrznjpm'},
  'ready',mock.fetchFn),/Production Supabase project/);
 assert.equal(mock.counters().count,0);
});

test('a mismatched account identity fails authentication/RLS recipe early', async () => {
  const mock = mockSupabase({wrongUser: true});
  await assert.rejects(runStage(env(), 'auth', mock.fetchFn), /Authenticated user ID/);
  assert.equal(mock.counters().drawCount, 0);
});
test('both supported staging D100 preferences preserve the server category through Passer', async () => {
  for (const preference of ['SENSUEL', 'SEXUEL']) {
    const mock = mockSupabase({expectedPreference: preference, drawSexuel: true});
    const out = await runStage({...env(), LR026_STAGING_PREFERENCE: preference},
      'play', mock.fetchFn);
    assert.equal(out.replacement_same_category, true);
    assert.equal(out.pass_replay_idempotent, true);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 2);
  }
});

test('unexpected D100 preference is rejected before any request or mutation', async () => {
  for (const preference of ['soft', 'sexuel', 'INTENSE', '', 'SENSUEL ']) {
    const mock = mockSupabase();
    await assert.rejects(runStage({...env(),
      LR026_STAGING_PREFERENCE: preference}, 'play', mock.fetchFn),
    /Staging D100 preference must be SENSUEL or SEXUEL/);
    assert.equal(mock.counters().count, 0);
  }
});

for (const [options, expectedError] of [
  [{drawRpcWrongSession: true}, /Real D100 did not return a valid card/],
  [{drawRpcWrongCouple: true}, /Real D100 did not return a valid card/],
  [{drawRpcInvalidFace: true}, /Real D100 returned an invalid face or library card ID/],
  [{drawRpcInvalidCardId: true}, /Real D100 returned an invalid face or library card ID/],
  [{drawRpcWrongFace: true}, /First D100 must persist/],
  [{drawRpcWrongCardId: true}, /First D100 must persist/]
]) {
  test('D100 RPC response must match the stored challenge before any reply: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn), expectedError);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 0);
  });
}

test('a reported unavailable replacement cannot be accepted as a successful Passer', async () => {
  const mock = mockSupabase({firstResponseUnavailableFlag: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Partner B response must create one new and distinct replacement/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 1);
});

test('a D100 response with an unsupported category cannot call Passer', async () => {
  const mock = mockSupabase({drawUnknownCategory: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Real D100 returned an unknown category/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 0);
});

test('a SEXUEL draw stored as SENSUEL cannot call Passer', async () => {
  const mock = mockSupabase({expectedPreference: 'SEXUEL', drawSexuel: true,
    firstWrongCategory: true});
  await assert.rejects(runStage({...env(), LR026_STAGING_PREFERENCE: 'SEXUEL'},
    'play', mock.fetchFn), /First D100 must persist/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 0);
});

test('a SEXUEL card changing category after Passer is refused before replay', async () => {
  const mock = mockSupabase({expectedPreference: 'SEXUEL', drawSexuel: true,
    firstPassWrongCategory: true});
  await assert.rejects(runStage({...env(), LR026_STAGING_PREFERENCE: 'SEXUEL'},
    'play', mock.fetchFn), /Only the two correct-category recipient challenges/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 1);
});

for (const [action, excluded] of [
  ['pass', false], ['refuse', false], ['refuse', true]
]) {
  test('official D100 response and idempotent replay: ' + action +
    ' exclude=' + excluded, async () => {
    const mock = mockSupabase({expectedAction: action, expectedExclude: excluded,
      expectedPreference: 'SEXUEL', drawSexuel: true});
    const output = await runStage({...env(),
      LR026_STAGING_PREFERENCE: 'SEXUEL',
      LR026_STAGING_ACTION: action,
      LR026_STAGING_EXCLUDE: String(excluded)
    }, 'play', mock.fetchFn);
    assert.equal(output.response_action, action);
    assert.equal(output.response_excluded, excluded);
    assert.equal(output.persisted_challenges, 2);
    assert.equal(mock.counters().passCount, 2);
  });
}

test('invalid action, exclusion and illegal pass+exclude stop before network', async () => {
  for (const [action, exclude] of [
    ['decline', 'false'], ['PASS', 'false'], ['pass', 'true'],
    ['refuse', 'TRUE'], ['refuse', ''], ['', 'false']
  ]) {
    const mock = mockSupabase();
    await assert.rejects(runStage({...env(),
      LR026_STAGING_ACTION: action,
      LR026_STAGING_EXCLUDE: exclude}, 'play', mock.fetchFn),
      /Staging response must be pass without exclusion, or refuse with optional exclusion/);
    assert.equal(mock.counters().count, 0);
  }
});

test('idempotent refuse cannot change the recorded exclusion flag', async () => {
  const mock = mockSupabase({expectedAction: 'refuse', expectedExclude: true,
    replayWrongExclusion: true});
  await assert.rejects(runStage({...env(), LR026_STAGING_ACTION: 'refuse',
    LR026_STAGING_EXCLUDE: 'true'}, 'play', mock.fetchFn),
    /Repeated response must return the exact persisted action, exclusion and replacement/);
  assert.equal(mock.counters().passCount, 2);
});

test('B can draw for A and A can respond with recipient-only RLS', async () => {
  for (const [action, excluded] of [['pass', false], ['refuse', true]]) {
    const mock = mockSupabase({drawerB: true, expectedAction: action,
      expectedExclude: excluded, expectedPreference: 'SEXUEL', drawSexuel: true});
    const out = await runStage({...env(), LR026_STAGING_DRAWER: 'B',
      LR026_STAGING_PREFERENCE: 'SEXUEL',
      LR026_STAGING_ACTION: action,
      LR026_STAGING_EXCLUDE: String(excluded)}, 'play', mock.fetchFn);
    assert.equal(out.drawer, 'B');
    assert.equal(out.response_action, action);
    assert.equal(out.response_excluded, excluded);
    assert.equal(out.pass_replay_idempotent, true);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 2);
    const rpcCalls = mock.calls.filter(c => c.path.startsWith('/rest/v1/rpc/'));
    assert.deepEqual(rpcCalls.map(c => c.actorToken), [
      'Bearer auth-token-for-b-test',
      'Bearer auth-token-for-a-test',
      'Bearer auth-token-for-a-test'
    ]);
    const challengeReads = mock.calls.filter(c => c.path === '/rest/v1/couple_challenges');
    assert.deepEqual(challengeReads.map(c => c.actorToken), [
      'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test',
      'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test',
      'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test',
      'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
    ]);
  }
});

test('real D100 random mode preserves SERVER-selected category across both partners and redraws', async () => {
  // The preferred category and the actual randomized category can differ.
  // Neither the recipient nor the staging client may coerce the category.
  for (const [drawer, preference, actualSexuel, action, excluded] of [
    ['A', 'SENSUEL', true, 'pass', false],
    ['B', 'SEXUEL', false, 'refuse', true]
  ]) {
    const mock = mockSupabase({
      drawerB: drawer === 'B', expectedRandom: true,
      expectedPreference: preference, drawSexuel: actualSexuel,
      expectedAction: action, expectedExclude: excluded
    });
    const out = await runStage({
      ...env(), LR026_STAGING_RANDOM: 'true',
      LR026_STAGING_DRAWER: drawer,
      LR026_STAGING_PREFERENCE: preference,
      LR026_STAGING_ACTION: action,
      LR026_STAGING_EXCLUDE: String(excluded)
    }, 'play', mock.fetchFn);
    assert.equal(out.random_category_mode, true);
    assert.equal(out.actual_draw_category, actualSexuel ? 'SEXUEL' : 'SENSUEL');
    assert.notEqual(out.actual_draw_category, preference,
      'The random mode must accept a server category different from preference');
    assert.equal(out.replacement_same_category, true);
    assert.equal(out.response_action, action);
    assert.equal(out.response_excluded, excluded);
    assert.equal(out.pass_replay_idempotent, true);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 2);
  }
});

test('D100 random mode remains false by default and refuses invalid values before network', async () => {
  const standard = mockSupabase();
  const out = await runStage(env(), 'play', standard.fetchFn);
  assert.equal(out.random_category_mode, false);
  assert.equal(out.actual_draw_category, 'SENSUEL');
  for (const random of ['', 'True', '1', 'false ', 'TRUE', true, 1]) {
    const mock = mockSupabase();
    await assert.rejects(runStage({...env(), LR026_STAGING_RANDOM: random},
      'play', mock.fetchFn), /Staging D100 random mode must be true or false/);
    assert.equal(mock.counters().count, 0);
  }
});

test('B cannot draw into a session with a preexisting A-only RLS card', async () => {
  const mock = mockSupabase({drawerB: true, existingChallengeForA: true});
  await assert.rejects(runStage({...env(), LR026_STAGING_DRAWER: 'B'},
    'play', mock.fetchFn), /clean session/);
  assert.equal(mock.counters().drawCount, 0);
  assert.equal(mock.counters().passCount, 0);
});

test('staging drawer setting rejects unknown values before any network call', async () => {
  for (const drawer of ['', 'a', 'C', 'A,B', 'B ']) {
    const mock = mockSupabase();
    await assert.rejects(runStage({...env(), LR026_STAGING_DRAWER: drawer},
      'play', mock.fetchFn), /Staging D100 drawer must be A or B/);
    assert.equal(mock.counters().count, 0);
  }
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
  assert.deepEqual(specific.map(c => c.actorToken), Array(5).fill([
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
  ]).flat());
  const memberReads = mock.calls.filter(c => c.path === '/rest/v1/couple_members');
  assert.deepEqual(memberReads.map(c => c.actorToken), Array(5).fill([
    'Bearer auth-token-for-a-test', 'Bearer auth-token-for-b-test'
  ]).flat());
});
for (const [options, expectedPasses, error] of [
  [{duetSessionHiddenFromBAfterDraw: true}, 0, /Staging session changed after D100/],
  [{duetWrongSessionAfterDraw: true}, 0, /Staging session changed after D100/],
  [{duetWrongCoupleAfterDraw: true}, 0, /Staging session changed after D100/],
  [{duetClosedAfterDraw: true}, 0, /Staging session changed after D100/],
  [{duetPairedTurnsAfterDraw: true}, 0, /Staging session changed after D100/],
  [{duetSelfDrawsAfterDraw: true}, 0, /Staging session changed after D100/],
  [{duetThirdMemberAfterDraw: true}, 0, /Staging duet membership changed after D100/],
  [{duetClosedAfterFirstPass: true}, 1, /Staging session changed after the first Passer/],
  [{duetMemberMissingAfterFirstPass: true}, 1, /Staging duet membership changed after the first Passer/],
  [{duetClosedAfterReplay: true}, 2, /Staging session changed after idempotent Passer replay/],
  [{duetMemberMissingAfterReplay: true}, 2, /Staging duet membership changed after idempotent Passer replay/]
]) {
  test('duet and session drift fail at the right gameplay boundary: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn), error);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, expectedPasses,
      'The recipe must not send additional gameplay RPCs after drift');
  });
}

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
  {firstWrongStoredCouple: true},
  {firstWrongOfferer: true},
  {firstWrongRecipient: true},
  {firstWrongCategory: true},
  {firstWrongFace: true},
  {firstWrongCardId: true},
  {firstWrongStoredTitle: true},
  {firstWrongStoredDescription: true},
  {firstWrongStoredTimer: true},
  {firstWrongStoredGift: true},
  {firstWrongStoredCreatedAt: true},
  {firstUnexpectedPassedAt: true},
  {firstUnexpectedRefusedAt: true},
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
  {afterPassMissingStamp: true},
  {afterPassInvalidStamp: true},
  {afterPassUnexpectedRefuseStamp: true},
  {replacementUnexpectedPassedAt: true},
  {replacementUnexpectedRefusedAt: true},
  {firstPassWrongReference: true},
  {firstPassWrongSession: true},
  {afterResponseWrongOriginalCouple: true},
  {afterResponseWrongReplacementCouple: true},
  {firstPassWrongCategory: true},
  {firstPassInvalidFace: true},
  {firstPassInvalidCardId: true},
  {firstPassDuplicateFace: true},
  {firstPassDuplicateCard: true},
  {firstPassWrongReplacementOfferer: true},
  {firstPassMutatesOriginalFace: true},
  {firstPassMutatesOriginalCardId: true},
  {firstPassMutatesOriginalTitle: true},
  {firstPassMutatesOriginalTimer: true},
  {firstPassMutatesOriginalCreatedAt: true},
  {firstPassInvalidReplacementCreatedAt: true},
  {firstPassBlankReplacementTitle: true},
  {firstPassInvalidReplacementTimer: true},
  {firstPassWrongReplacementGift: true},
  {firstPassCardForA: true}
]) {
  test('invalid first Passer state is never replayed: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase(options);
    await assert.rejects(runStage(env(), 'play', mock.fetchFn),
      /Unexpected challenge addressed to drawer|Only the two correct-category recipient challenges|Only one original responded|Exactly one valid same-category replacement|Responded original must preserve|Replacement must not reuse/);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 1,
      'A malformed persisted Passer must stop BEFORE a second RPC');
  });
}

test('stale-response staging probe rejects ambiguous options before network', async () => {
 for (const value of ['TRUE','1','yes','']) {
  const mock=mockSupabase();
  await assert.rejects(runStage({...env(),LR026_STAGING_STALE_REPLAY:value},
   'play',mock.fetchFn),/Stale-response replay switch must be true or false/);
  assert.equal(mock.counters().count,0);
 }
});

for (const [action,excluded,extraCalls] of [
 ['pass',false,1],['refuse',false,2],['refuse',true,2]
]) {
 test('real-account staging stale replay returns immutable receipt for '+
  action+' exclude='+excluded,async()=>{
  const mock=mockSupabase({
   expectedAction:action,expectedExclude:excluded,expectStaleReplay:true
  });
  const out=await runStage({...env(),
   LR026_STAGING_ACTION:action,LR026_STAGING_EXCLUDE:String(excluded),
   LR026_STAGING_STALE_REPLAY:'true'},'play',mock.fetchFn);
  assert.equal(out.stale_replay_checks,extraCalls);
  assert.equal(out.pass_replay_idempotent,true);
  assert.equal(mock.counters().drawCount,1);
  assert.equal(mock.counters().passCount,2+extraCalls);
  const replies=mock.calls.filter(x=>x.path===
   '/rest/v1/rpc/love_respond_and_redraw');
  assert.equal(replies.length,2+extraCalls);
  assert.deepEqual(replies.slice(2).map(x=>[
   x.payload.p_action,x.payload.p_exclude
  ]),action==='pass'
   ?[['refuse',true]]:[['pass',false],['refuse',!excluded]]);
  assert.deepEqual(replies.map(x=>x.actorToken),[
   'Bearer auth-token-for-b-test','Bearer auth-token-for-b-test',
   ...Array(extraCalls).fill('Bearer auth-token-for-b-test-device-2')
  ]);
  assert.equal(out.distinct_stale_auth_session,true);
  const logins=mock.calls.filter(x=>x.path==='/auth/v1/token');
  assert.deepEqual(logins.map(x=>x.payload.email),[
   'a@example.invalid','b@example.invalid','b@example.invalid'
  ]);
 });
}

test('stale-response staging probe works from B to A with recipient-only RLS', async()=>{
 const mock=mockSupabase({
  drawerB:true,expectedAction:'refuse',expectedExclude:false,
  expectStaleReplay:true
 });
 const out=await runStage({...env(),LR026_STAGING_DRAWER:'B',
  LR026_STAGING_ACTION:'refuse',LR026_STAGING_STALE_REPLAY:'true'},
 'play',mock.fetchFn);
 assert.equal(out.stale_replay_checks,2);
 const replies=mock.calls.filter(x=>x.path===
  '/rest/v1/rpc/love_respond_and_redraw');
 assert.deepEqual(replies.map(x=>x.actorToken),[
  'Bearer auth-token-for-a-test','Bearer auth-token-for-a-test',
  'Bearer auth-token-for-a-test-device-2',
  'Bearer auth-token-for-a-test-device-2'
 ]);
 const logins=mock.calls.filter(x=>x.path==='/auth/v1/token');
 assert.deepEqual(logins.map(x=>x.payload.email),[
  'a@example.invalid','b@example.invalid','a@example.invalid'
 ]);
});

for(const options of [
 {staleReusesToken:true},{staleWrongUser:true}
]){
 test('stale device needs a second valid and distinct GoTrue login: '+
  JSON.stringify(options),async()=>{
  const mock=mockSupabase({...options,expectStaleReplay:true});
  await assert.rejects(runStage({...env(),
   LR026_STAGING_STALE_REPLAY:'true'},'play',mock.fetchFn),
   /Stale response probe requires a second independent recipient Auth session|Authenticated user ID does not match/);
  assert.equal(mock.counters().drawCount,1);
  assert.equal(mock.counters().passCount,2);
  const logins=mock.calls.filter(c=>c.path==='/auth/v1/token');
  assert.equal(logins.length,3);
 });
}

for(const [options,reason] of [
 [{staleDeviceHiddenSession:true},/Second device cannot see the same active staging session/],
 [{staleDeviceMissingMember:true},/Second device cannot see the same exact two-person duet/],
 [{staleDeviceD6Hidden:true},/Second device D6 snapshot is missing or differs/],
 [{staleDeviceD6Mismatch:true},/Second device D6 snapshot is missing or differs/],
 [{staleDeviceHidesCards:true},/Only the two correct-category recipient challenges may exist/],
 [{staleDeviceMisroutesCard:true},/Only the two correct-category recipient challenges may exist/]
]){
 test('stale device cannot send a contradictory D100 response with mismatched RLS: '+
  JSON.stringify(options),async()=>{
  const mock=mockSupabase({...options,expectStaleReplay:true});
  await assert.rejects(runStage({...env(),LR026_STAGING_STALE_REPLAY:'true'},
   'play',mock.fetchFn),reason);
  assert.equal(mock.counters().passCount,2,
   'stale RPC must not be sent before second-device preflight passes');
  const staleRpc=mock.calls.filter(c=>c.path==='/rest/v1/rpc/love_respond_and_redraw' &&
   c.actorToken?.includes('-device-2'));
  assert.equal(staleRpc.length,0);
 });
}
for(const [options,reason] of [
 [{staleDeviceClosedSessionAfterConflict:true},
  /Second device cannot see the same active staging session/],
 [{staleDeviceD6ChangesAfterConflict:true},
  /Second device D6 snapshot is missing or differs/]
]){
 test('second device must remain consistent after stale response: '+
  JSON.stringify(options),async()=>{
  const mock=mockSupabase({...options,expectStaleReplay:true});
  await assert.rejects(runStage({...env(),LR026_STAGING_STALE_REPLAY:'true'},
   'play',mock.fetchFn),reason);
  assert.equal(mock.counters().passCount,3,
   'stop immediately on second-device view drift after first stale response');
 });
}

for(const options of [
 {staleWrongAction:true},{staleWrongExclusion:true},
 {staleWrongReplacement:true},{staleUnavailableFlag:true}
]){
 test('stale conflicting response must fail on changed server receipt: '+
  JSON.stringify(options),async()=>{
  const mock=mockSupabase({...options,expectStaleReplay:true});
  await assert.rejects(runStage({...env(),LR026_STAGING_STALE_REPLAY:'true'},
   'play',mock.fetchFn),
   /Stale conflicting response must replay the first immutable server decision/);
  assert.equal(mock.counters().passCount,3);
 });
}
for (const [action, option] of [
  ['pass', 'staleMutatesPassedAt'],
  ['refuse', 'staleMutatesRefusedAt']
]) {
  test('second device must never alter committed ' + action + ' timestamp', async () => {
    const mock = mockSupabase({
      expectedAction: action,
      expectStaleReplay: true,
      [option]: true
    });
    await assert.rejects(runStage({...env(),
      LR026_STAGING_ACTION: action,
      LR026_STAGING_STALE_REPLAY: 'true'}, 'play', mock.fetchFn),
      /Stale conflicting response mutated a persisted challenge/);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 3);
  });
}
test('second device cannot silently recreate a replacement with its original ID', async () => {
  const mock = mockSupabase({
    expectStaleReplay: true,
    staleMutatesReplacementCreatedAt: true
  });
  await assert.rejects(runStage({...env(),
    LR026_STAGING_STALE_REPLAY:'true'}, 'play', mock.fetchFn),
    /Stale conflicting response mutated a persisted challenge/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 3);
});
test('stale replay that silently changes persisted rows is rejected',async()=>{
 const mock=mockSupabase({
  staleMutatesReplacementOfferer:true,expectStaleReplay:true
 });
 await assert.rejects(runStage({...env(),LR026_STAGING_STALE_REPLAY:'true'},
  'play',mock.fetchFn),
  /Exactly one valid same-category replacement offered by drawer|Stale conflicting response mutated a persisted challenge/);
 assert.equal(mock.counters().passCount,3);
});

test('idempotent replay can reorder rows but must not mutate their contents', async () => {
  const mock = mockSupabase({replayReordersRows: true});
  const out = await runStage(env(), 'play', mock.fetchFn);
  assert.equal(out.pass_replay_idempotent, true);
  assert.equal(mock.counters().passCount, 2);
});
test('idempotent replay cannot alter persisted replacement even when returning same ID', async () => {
  const mock = mockSupabase({replayMutatesReplacementOfferer: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated Passer must not change any persisted challenge field|Exactly one valid same-category replacement offered by drawer/);
  assert.equal(mock.counters().passCount, 2);
});
test('idempotent replay cannot silently recreate replacement challenge', async () => {
  const mock = mockSupabase({replayMutatesReplacementCreatedAt: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated Passer must not change any persisted challenge field/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});
test('D100 RPC must provide a valid created_at before returning a challenge', async () => {
  const mock = mockSupabase({drawInvalidCreatedAt: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Real D100 returned invalid card content, timer or gifted flag/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 0);
});
test('idempotent replay cannot silently rewrite a pass timestamp', async () => {
  const mock = mockSupabase({replayMutatesPassedAt: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated Passer must not change any persisted challenge field/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});
for (const options of [
  {afterRefuseMissingStamp: true},
  {afterRefuseUnexpectedPassStamp: true}
]) {
  test('refusal must store only a valid refused_at stamp: ' +
    JSON.stringify(options), async () => {
    const mock = mockSupabase({...options, expectedAction: 'refuse'});
    await assert.rejects(runStage({...env(), LR026_STAGING_ACTION: 'refuse'},
      'play', mock.fetchFn), /Only one original responded challenge/);
    assert.equal(mock.counters().drawCount, 1);
    assert.equal(mock.counters().passCount, 1);
  });
}
test('idempotent replay cannot silently rewrite a replacement description', async () => {
  const mock = mockSupabase({replayMutatesReplacementDescription: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated Passer must not change any persisted challenge field/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});
test('D100 response with blank title fails before Passer', async () => {
  const mock = mockSupabase({drawEmptyTitle: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Real D100 returned invalid card content, timer or gifted flag/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 0);
});
test('idempotent replay cannot move a replacement into a different couple', async () => {
  const mock = mockSupabase({replayMutatesReplacementCouple: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Only the two correct-category recipient challenges may exist/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});
test('SEXUEL idempotent replay cannot silently change the replacement category', async () => {
  const mock = mockSupabase({expectedPreference: 'SEXUEL', drawSexuel: true,
    replayMutatesReplacementCategory: true});
  await assert.rejects(runStage({...env(), LR026_STAGING_PREFERENCE: 'SEXUEL'},
    'play', mock.fetchFn), /Only the two correct-category recipient challenges/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});
test('idempotent replay cannot switch a completed redraw to unavailable', async () => {
  const mock = mockSupabase({replayUnavailableFlag: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated response must return the exact persisted action, exclusion and replacement availability/);
  assert.equal(mock.counters().drawCount, 1);
  assert.equal(mock.counters().passCount, 2);
});
test('idempotent replay must keep official Passer action', async () => {
  const mock = mockSupabase({replayWrongAction: true});
  await assert.rejects(runStage(env(), 'play', mock.fetchFn),
    /Repeated response must return the exact persisted action, exclusion and replacement/);
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
