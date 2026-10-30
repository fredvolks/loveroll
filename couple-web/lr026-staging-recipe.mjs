// LoveRoll LR-026 staging-only browser-equivalent RPC recipe.
// No service-role key, no Supabase production writes, no user data fixtures.
// Runtime: Node >= 22 (built-in fetch). Unit tests inject an in-memory fetch.
export const KNOWN_PRODUCTION_REFS = Object.freeze([
  'ejsrqfpkgwraorrznjpm'
]);

const REF = /^[a-z0-9]{20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WRITE_ACK = 'I_ACCEPT_TEST_PROJECT_WRITES_ONLY';

function requireField(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Missing required staging setting: ' + name);
  }
  return value.trim();
}
function requireUuid(value, name) {
  const id = requireField(value, name);
  if (!UUID.test(id)) throw new Error('Invalid UUID for ' + name);
  return id.toLowerCase();
}
function checkPublicKey(key) {
  if (/^sb_secret_/i.test(key)) throw new Error('Secret Supabase key is prohibited');
  if (/^sb_publishable_[a-z0-9_-]+$/i.test(key)) return;
  if (key.split('.').length !== 3) {
    throw new Error('Expected a publishable key or legacy anon JWT (never service_role)');
  }
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role !== 'anon') throw new Error('Supabase API JWT is not role anon');
  } catch (e) {
    throw new Error('Invalid or privileged Supabase API JWT: ' + e.message);
  }
}

export function validateStage(env, mode) {
  if (!['check', 'auth', 'audit', 'ready', 'play'].includes(mode)) throw new Error('Unknown LR-026 mode');
  const ref = requireField(env.LR026_STAGING_REF, 'LR026_STAGING_REF');
  const confirmedRef = requireField(env.LR026_CONFIRM_STAGING_REF, 'LR026_CONFIRM_STAGING_REF');
  if (!REF.test(ref) || !REF.test(confirmedRef) || confirmedRef !== ref) {
    throw new Error('Staging project ref missing, malformed or not explicitly confirmed');
  }
  if (KNOWN_PRODUCTION_REFS.includes(ref)) {
    throw new Error('Production Supabase project is strictly forbidden');
  }
  if (env.LR026_PRODUCTION_REF && env.LR026_PRODUCTION_REF === ref) {
    throw new Error('Configured production Supabase project is forbidden');
  }
  const url = 'https://' + ref + '.supabase.co';
  if (env.LR026_STAGING_URL && env.LR026_STAGING_URL !== url) {
    throw new Error('Staging URL must match the exact HTTPS Supabase project host');
  }
  const apiKey = requireField(env.LR026_STAGING_PUBLISHABLE_KEY, 'LR026_STAGING_PUBLISHABLE_KEY');
  checkPublicKey(apiKey);
  // Explicitly reject any accidentally exported privileged credential.
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'LR026_STAGING_SERVICE_ROLE_KEY']) {
    if (env[name]) throw new Error('Privileged credential must not be supplied: ' + name);
  }
  const result = {mode, ref, url, apiKey};
  if (mode === 'check') return result;

  const a = {
    email: requireField(env.LR026_STAGING_A_EMAIL, 'LR026_STAGING_A_EMAIL'),
    password: requireField(env.LR026_STAGING_A_PASSWORD, 'LR026_STAGING_A_PASSWORD'),
    id: requireUuid(env.LR026_STAGING_A_ID, 'LR026_STAGING_A_ID')
  };
  const b = {
    email: requireField(env.LR026_STAGING_B_EMAIL, 'LR026_STAGING_B_EMAIL'),
    password: requireField(env.LR026_STAGING_B_PASSWORD, 'LR026_STAGING_B_PASSWORD'),
    id: requireUuid(env.LR026_STAGING_B_ID, 'LR026_STAGING_B_ID')
  };
  if (a.email.toLowerCase() === b.email.toLowerCase() || a.id === b.id) {
    throw new Error('Test players A and B must be two distinct real Auth accounts');
  }
  result.a = a;
  result.b = b;
  result.coupleId = requireUuid(env.LR026_STAGING_COUPLE_ID, 'LR026_STAGING_COUPLE_ID');
  result.sessionId = requireUuid(env.LR026_STAGING_SESSION_ID, 'LR026_STAGING_SESSION_ID');

  if (mode === 'audit') {
    const c = {
      email: requireField(env.LR026_STAGING_C_EMAIL, 'LR026_STAGING_C_EMAIL'),
      password: requireField(env.LR026_STAGING_C_PASSWORD, 'LR026_STAGING_C_PASSWORD'),
      id: requireUuid(env.LR026_STAGING_C_ID, 'LR026_STAGING_C_ID')
    };
    if ([a.email, b.email].some(e => e.toLowerCase() === c.email.toLowerCase()) ||
        [a.id, b.id].includes(c.id)) {
      throw new Error('RLS outsider C must be a third distinct Auth account');
    }
    result.c = c;
    result.otherCoupleId = requireUuid(env.LR026_STAGING_OTHER_COUPLE_ID,
      'LR026_STAGING_OTHER_COUPLE_ID');
    result.otherSessionId = requireUuid(env.LR026_STAGING_OTHER_SESSION_ID,
      'LR026_STAGING_OTHER_SESSION_ID');
    if (result.otherCoupleId === result.coupleId ||
        result.otherSessionId === result.sessionId) {
      throw new Error('RLS audit requires separate couples and separate sessions');
    }
  }

  if (mode === 'play') {
    // Test either official D100 preference, never an arbitrary RPC payload.
    // The returned category remains server-authoritative and is checked
    // independently against persisted cards and the redraw.
    const preference = env.LR026_STAGING_PREFERENCE ?? 'SENSUEL';
    if (!['SENSUEL', 'SEXUEL'].includes(preference)) {
      throw new Error('Staging D100 preference must be SENSUEL or SEXUEL');
    }
    result.preference = preference;
    // A real draw may ignore the preferred category when p_random=true.
    // Never infer probability from one D100; verify the chosen server
    // category against the independently persisted row and replacement.
    const random = env.LR026_STAGING_RANDOM ?? 'false';
    if (!['true', 'false'].includes(random)) {
      throw new Error('Staging D100 random mode must be true or false');
    }
    result.random = random === 'true';
    const drawer = env.LR026_STAGING_DRAWER ?? 'A';
    if (!['A', 'B'].includes(drawer)) {
      throw new Error('Staging D100 drawer must be A or B');
    }
    result.drawer = drawer;
    // The source RPC accepts pass (never exclude) or refuse with a
    // deliberate optional cycle exclusion; reject any other combination
    // before authentication or a mutating request is possible.
    const action = env.LR026_STAGING_ACTION ?? 'pass';
    const exclude = env.LR026_STAGING_EXCLUDE ?? 'false';
    if (!['pass', 'refuse'].includes(action) ||
        !['true', 'false'].includes(exclude) ||
        (action === 'pass' && exclude === 'true')) {
      throw new Error('Staging response must be pass without exclusion, or refuse with optional exclusion');
    }
    result.action = action;
    result.exclude = exclude === 'true';
    // Optional stale-device probe is deliberately OFF by default.
    // Even after one valid idempotent replay, conflicting requests must
    // replay the immutable server receipt, never change Passer/Refuser.
    const staleReplay = env.LR026_STAGING_STALE_REPLAY ?? 'false';
    if (!['true','false'].includes(staleReplay)) {
      throw new Error('Stale-response replay switch must be true or false');
    }
    result.staleReplay = staleReplay === 'true';
    if (env.LR026_STAGING_ALLOW_WRITES !== WRITE_ACK ||
        env.LR026_STAGING_WRITE_CONFIRM_REF !== ref) {
      throw new Error('Mutating staging recipe requires an exact write acknowledgement and project-ref confirmation');
    }
  }
  return result;
}

function assert(value, message) {
  if (!value) throw new Error('LR-026 staging failed: ' + message);
}
function eq(a, b) { return String(a || '').toLowerCase() === String(b || '').toLowerCase(); }

function apiClient(config, transport) {
  async function call(method, path, token, body) {
    const headers = {apikey: config.apiKey, Accept: 'application/json'};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await transport(config.url + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(18000)
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { throw new Error('Non-JSON Supabase response (' + response.status + ')'); }
    if (!response.ok) {
      // Remote error text is untrusted and may echo passwords or tokens.
      // Show only status and a bounded machine-readable error code.
      const errorCode = typeof data?.code === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(data.code)
        ? ' [' + data.code + ']' : '';
      throw new Error('Supabase API ' + response.status + ' (' + path.split('?')[0] + ')' + errorCode);
    }
    return data;
  }
  async function login(actor) {
    const data = await call('POST', '/auth/v1/token?grant_type=password', null, {
      email: actor.email, password: actor.password
    });
    assert(typeof data?.access_token === 'string' && data.access_token.length > 10,
      'Login returned no valid access token');
    // Get current authoritative identity from GoTrue, not from client JWT hints.
    const user = await call('GET', '/auth/v1/user', data.access_token);
    assert(eq(user?.id, actor.id), 'Authenticated user ID does not match the named test actor');
    assert(eq(user?.email, actor.email), 'Authenticated email differs from staging configuration');
    assert(Boolean(user?.email_confirmed_at), 'Staging test account email is not verified');
    return {id: user.id, token: data.access_token};
  }
  async function rows(table, query, token) {
    const data = await call('GET', '/rest/v1/' + table + '?' + query, token);
    assert(Array.isArray(data), table + ' RLS read must return an array');
    return data;
  }
  async function rpc(name, payload, token) {
    return call('POST', '/rest/v1/rpc/' + name, token, payload);
  }
  return {login, rows, rpc};
}

// Validate the SAME physical D6 snapshot under both authenticated views.
// Checking each view in isolation is insufficient: contradictory valid faces
// can otherwise pass and make the subsequent D100 draw irreproducible.
async function verifyMatchingD6(client, sessionId, a, b, invalidFixtureMessage) {
  const query = 'select=session_id,user_id,face&session_id=eq.' + sessionId;
  let baseline = null;
  for (const actor of [a, b]) {
    const rolls = await client.rows('couple_personal_rolls', query, actor.token);
    assert(rolls.length === 2 &&
      [a.id, b.id].every(id =>
        rolls.filter(r => eq(r.user_id, id) && eq(r.session_id, sessionId) &&
          Number.isInteger(r.face) && r.face >= 1 && r.face <= 6).length === 1),
      invalidFixtureMessage);
    // Compare by owner, not API row ordering.
    const facesByOwner = [a.id, b.id].map(id =>
      rolls.find(r => eq(r.user_id, id)).face);
    if (baseline !== null) {
      assert(facesByOwner.every((face, index) => face === baseline[index]),
        'D6 faces disagree between partner A and B authenticated views');
    } else {
      baseline = facesByOwner;
    }
  }
  return baseline;
}

// Check the exact same preflight for read-only --ready and mutating --play.
// A single shared contract avoids a green readiness check that does not
// actually protect the real first D100 in --play.
async function verifyFreshD100Session(client,config,a,b){
  // Both tokens must see the same legacy partner-draw flags. A's view
  // alone cannot prove that recipient B is in the correct session mode.
  for(const actor of [a,b]){
    const sessions=await client.rows('couple_sessions',
      'select=id,paired_turns,self_draws&id=eq.'+config.sessionId,actor.token);
    assert(sessions.length===1&&eq(sessions[0].id,config.sessionId)&&
      sessions[0].paired_turns===false&&sessions[0].self_draws===false,
      'Mutating recipe requires both partners to see a fresh legacy partner-draw session (paired_turns=false, self_draws=false)');
  }
  const faces=await verifyMatchingD6(client,config.sessionId,a,b,
    'Two valid D6 rolls for this session must be readable by both partners before D100');
  // A's recipient-only RLS view cannot prove B has no existing challenge;
  // both clients must independently see a completely empty evening.
  for(const actor of [a,b]){
    const existing=await client.rows('couple_challenges',
      'select=id,recipient,status&session_id=eq.'+config.sessionId,actor.token);
    assert(existing.length===0,
      'Play recipe requires a clean session visible to both recipients; never reset existing data');
  }
  return faces;
}

export async function runStage(env, mode, transport = fetch) {
  // Validate everything, including explicit write consent, BEFORE ANY network.
  const config = validateStage(env, mode);
  if (mode === 'check') {
    return {stage_ref: config.ref, mode, safe: true, network_requests: 0};
  }

  const client = apiClient(config, transport);
  // Two distinct real sessions, checked individually against GoTrue.
  const a = await client.login(config.a);
  const b = await client.login(config.b);
  for (const actor of [a, b]) {
    const session = await client.rows('couple_sessions',
      'select=id,couple_id,finished_at,paired_turns,self_draws&id=eq.' + config.sessionId, actor.token);
    assert(session.length === 1 && eq(session[0].id, config.sessionId) &&
      eq(session[0].couple_id, config.coupleId) && session[0].finished_at === null,
      'Active staging session must be readable by both actors under RLS');
    // The real member policy exposes the WHOLE duo to both members.
    // Merely proving that A and B each see themselves misses a third or
    // dangling membership. The production draw targets an arbitrary member
    // other than auth.uid(); such a malformed fixture could mutate before
    // the recipe notices a wrong recipient. Fail before any gameplay write.
    const members = await client.rows('couple_members',
      'select=couple_id,user_id&couple_id=eq.' + config.coupleId,
      actor.token);
    assert(members.length === 2 &&
      members.every(m => eq(m.couple_id, config.coupleId)) &&
      [a.id, b.id].every(id => members.filter(m => eq(m.user_id, id)).length === 1),
      'Each actor must see exactly A and B as the two members, with no outsider');
  }
  const result = {stage_ref: config.ref, mode, safe: true,
    real_auth_accounts: 2, couple_id: config.coupleId, session_id: config.sessionId,
    rls_session_reads: 2, rls_membership_reads: 2};
  if (mode === 'auth') return result;

  if (mode === 'audit') {
    // This mode is intentionally read-only. Test both directions: C must
    // not see the duo A/B, and A/B must not see C's separate duo.
    const outsider = await client.login(config.c);
    const otherSession = await client.rows('couple_sessions',
      'select=id,couple_id,finished_at&id=eq.' + config.otherSessionId, outsider.token);
    assert(otherSession.length === 1 &&
      eq(otherSession[0].couple_id, config.otherCoupleId),
      'Outsider C must have a visible own staging session before testing denials');
    const otherMembership = await client.rows('couple_members',
      'select=couple_id,user_id&couple_id=eq.' +
        config.otherCoupleId + '&user_id=eq.' + outsider.id, outsider.token);
    assert(otherMembership.length === 1 &&
      eq(otherMembership[0].user_id, outsider.id),
      'Outsider C must see their own membership, not be an unauthenticated guest');
    // Both couples must have real synthetic D6 records. A complete absence
    // of rows would make a cross-couple RLS check vacuous. A/B must each see
    // the same two personal rolls; C must see their own roll in the other duo.
    await verifyMatchingD6(client, config.sessionId, a, b,
      'RLS audit needs both A/B D6 rolls readable by each partner');
    const outsideRolls = await client.rows('couple_personal_rolls',
      'select=session_id,user_id,face&session_id=eq.' + config.otherSessionId,
      outsider.token);
    assert(outsideRolls.length >= 1 &&
      outsideRolls.every(r => eq(r.session_id, config.otherSessionId) &&
        Number.isInteger(r.face) && r.face >= 1 && r.face <= 6) &&
      outsideRolls.some(r => eq(r.user_id, outsider.id)),
      'RLS audit needs outsider C to see their own valid D6 roll');

    // A zero-card result on both couples means nothing if no challenge
    // was seeded or if the recipient-specific SELECT policy is broken.
    // Prove positive visibility for every recipient before testing denials.
    for (const actor of [a, b]) {
      const own = await client.rows('couple_challenges',
        'select=id,recipient,session_id&session_id=eq.' + config.sessionId,
        actor.token);
      assert(own.length >= 1 &&
        own.every(card => eq(card.recipient, actor.id) &&
          eq(card.session_id, config.sessionId) && UUID.test(card.id)),
        'RLS audit needs one or more own A/B recipient challenges visible without partner cards');
    }
    const outsiderCards = await client.rows('couple_challenges',
      'select=id,recipient,session_id&session_id=eq.' + config.otherSessionId,
      outsider.token);
    assert(outsiderCards.length >= 1 &&
      outsiderCards.every(card => eq(card.recipient, outsider.id) &&
        eq(card.session_id, config.otherSessionId) && UUID.test(card.id)),
      'RLS audit needs a visible challenge addressed to outsider C');

    const privateSession = await client.rows('couple_sessions',
      'select=id&' + 'id=eq.' + config.sessionId, outsider.token);
    const privateMembership = await client.rows('couple_members',
      'select=couple_id,user_id&couple_id=eq.' + config.coupleId, outsider.token);
    const privateCards = await client.rows('couple_challenges',
      'select=id&session_id=eq.' + config.sessionId, outsider.token);
    const privateRolls = await client.rows('couple_personal_rolls',
      'select=user_id&session_id=eq.' + config.sessionId, outsider.token);
    assert(privateSession.length === 0 && privateMembership.length === 0 &&
      privateCards.length === 0 && privateRolls.length === 0,
      'RLS isolation failed: outside account C can see duo A/B data');

    for (const actor of [a, b]) {
      const s = await client.rows('couple_sessions',
        'select=id&id=eq.' + config.otherSessionId, actor.token);
      const m = await client.rows('couple_members',
        'select=couple_id,user_id&couple_id=eq.' + config.otherCoupleId, actor.token);
      const cards = await client.rows('couple_challenges',
        'select=id&session_id=eq.' + config.otherSessionId, actor.token);
      const rolls = await client.rows('couple_personal_rolls',
        'select=user_id&session_id=eq.' + config.otherSessionId, actor.token);
      assert(s.length === 0 && m.length === 0 && cards.length === 0 &&
        rolls.length === 0,
        'RLS isolation failed: duo A/B can see outside duo C data');
    }
    return {...result, mode: 'audit', real_auth_accounts: 3,
      rls_outside_own_session_reads: 1, rls_positive_challenge_reads: 3,
      rls_positive_d6_reads: 3, rls_cross_duo_denials: 12, game_writes: 0};
  }

  if(mode==='ready'){
    // No write acknowledgement, RPC or mutation is required here. This is
    // a preflight, NOT a promise that a later D100 will have available cards.
    await verifyFreshD100Session(client,config,a,b);
    return {...result,mode:'ready',game_writes:0,
      preflight:'fresh_legacy_duo_verified',rls_d6_views:2,
      rls_empty_challenge_views:2};
  }

  // Exercise either real direction without changing the two named accounts.
  // Each run still requires its own fresh, empty staging session.
  const giver = config.drawer === 'B' ? b : a;
  const recipient = config.drawer === 'B' ? a : b;
  const initialD6=await verifyFreshD100Session(client,config,a,b);
  // Check session lifecycle and complete duo membership again after each
  // mutating RPC. A valid preflight alone cannot detect a changed partner,
  // closed session, or changed game mode during the synthetic exercise.
  async function assertDuetUnchanged(stage) {
    for (const actor of [a, b]) {
      const sessions = await client.rows('couple_sessions',
        'select=id,couple_id,finished_at,paired_turns,self_draws&id=eq.' +
          config.sessionId, actor.token);
      assert(sessions.length === 1 && eq(sessions[0].id, config.sessionId) &&
        eq(sessions[0].couple_id, config.coupleId) &&
        sessions[0].finished_at === null &&
        sessions[0].paired_turns === false && sessions[0].self_draws === false,
        'Staging session changed ' + stage + '; stop further gameplay RPCs');
      const members = await client.rows('couple_members',
        'select=couple_id,user_id&couple_id=eq.' + config.coupleId, actor.token);
      assert(members.length === 2 &&
        members.every(m => eq(m.couple_id, config.coupleId)) &&
        [a.id, b.id].every(id => members.filter(m => eq(m.user_id, id)).length === 1),
        'Staging duet membership changed ' + stage + '; stop further gameplay RPCs');
    }
  }
  async function assertD6Unchanged(stage) {
    const current = await verifyMatchingD6(client, config.sessionId, a, b,
      'Two valid D6 rolls must remain visible and valid ' + stage);
    assert(current.every((face, i) => face === initialD6[i]),
      'D6 snapshot changed ' + stage + '; do not continue mutating the staging game');
  }
  // verifyFreshD100Session already checked both D6 snapshots and the
  // empty recipient-only challenge views before any mutating RPC.
  // Never retry mutations. On error the staging operator must inspect the
  // persisted state and provision a NEW fixture, not blindly replay.
  const challengeQuery =
    'select=id,session_id,offered_by,recipient,category,face,card_id,replaces_challenge_id,status' +
    '&session_id=eq.' + config.sessionId;
  const drawn = await client.rpc('draw_for_partner',
    {p_session: config.sessionId, p_preference: config.preference, p_random: config.random}, giver.token);
  assert(UUID.test(drawn?.id || '') &&
    eq(drawn.session_id, config.sessionId) &&
    eq(drawn.couple_id, config.coupleId) &&
    eq(drawn.recipient, recipient.id) && eq(drawn.offered_by, giver.id),
    'Real D100 did not return a valid card in the correct session and duet from drawer to partner');
  assert(['SENSUEL', 'SEXUEL'].includes(drawn.category),
    'Real D100 returned an unknown category');
  assert(Number.isInteger(drawn.face) && drawn.face >= 1 && drawn.face <= 100 &&
    Number.isInteger(drawn.card_id) && drawn.card_id >= 1 && drawn.card_id <= 100,
    'Real D100 returned an invalid face or library card ID');
  // Independently read the newly persisted row as the B recipient and A.
  // A successful RPC response alone is not proof that it was saved for B.
  // NEVER run Passer if the first draw is missing, malformed or misrouted.
  const firstForRecipient = await client.rows('couple_challenges', challengeQuery, recipient.token);
  const firstForGiver = await client.rows('couple_challenges', challengeQuery, giver.token);
  assert(firstForRecipient.length === 1 &&
    eq(firstForRecipient[0].id, drawn.id) &&
    eq(firstForRecipient[0].session_id, config.sessionId) &&
    eq(firstForRecipient[0].offered_by, giver.id) &&
    eq(firstForRecipient[0].recipient, recipient.id) &&
    firstForRecipient[0].category === drawn.category &&
    firstForRecipient[0].face === drawn.face &&
    firstForRecipient[0].card_id === drawn.card_id &&
    Number.isInteger(firstForRecipient[0].face) && firstForRecipient[0].face >= 1 && firstForRecipient[0].face <= 100 &&
    Number.isInteger(firstForRecipient[0].card_id) && firstForRecipient[0].card_id >= 1 && firstForRecipient[0].card_id <= 100 &&
    firstForRecipient[0].status === 'proposed' &&
    firstForRecipient[0].replaces_challenge_id == null,
    'First D100 must persist exactly one drawer-to-recipient proposal before response');
  assert(firstForGiver.length === 0,
    'First D100 must not persist a proposal visible to drawer before response');
  await assertDuetUnchanged('after D100, before Passer');
  await assertD6Unchanged('after D100, before Passer');
  const response = await client.rpc('love_respond_and_redraw',
    {p_challenge: drawn.id, p_action: config.action, p_exclude: config.exclude}, recipient.token);
  assert(eq(response?.original_id, drawn.id) &&
    response.action === config.action && response.excluded === config.exclude &&
    response.replacement_unavailable === false &&
    response.already_processed === false &&
    UUID.test(response.replacement_id || '') &&
    !eq(response.replacement_id, drawn.id),
    'Partner B response must create one new and distinct replacement');
  // A first Passer response is not proof of successful persistence. Before
  // deliberately repeating a mutating RPC as an idempotency probe, verify
  // the exact two committed rows under recipient B AND the empty A view.
  async function persistedPassSnapshot() {
    const stored = await client.rows('couple_challenges', challengeQuery, recipient.token);
    const forGiver = await client.rows('couple_challenges', challengeQuery, giver.token);
    assert(forGiver.length === 0,
      'Unexpected challenge addressed to drawer after partner draw and response');
    assert(stored.length === 2 &&
      stored.every(c => eq(c.session_id, config.sessionId) &&
        eq(c.recipient, recipient.id) && c.category === drawn.category),
      'Only the two correct-category recipient challenges may exist');
    assert(stored.filter(c =>
      eq(c.id, drawn.id) && c.status ===
        (config.action === 'pass' ? 'passed' : 'refused') &&
      eq(c.offered_by, giver.id) && c.replaces_challenge_id == null).length === 1,
      'Only one original responded challenge offered by drawer may exist');
    assert(stored.filter(c => eq(c.id, response.replacement_id) &&
      eq(c.replaces_challenge_id, drawn.id) && c.status === 'proposed' &&
      eq(c.offered_by, giver.id) &&
      Number.isInteger(c.face) && c.face >= 1 && c.face <= 100 &&
      Number.isInteger(c.card_id) && c.card_id >= 1 && c.card_id <= 100).length === 1,
      'Exactly one valid same-category replacement offered by drawer must exist for recipient');
    const original = stored.find(c => eq(c.id, drawn.id));
    const replacement = stored.find(c => eq(c.id, response.replacement_id));
    assert(original.card_id !== replacement.card_id && original.face !== replacement.face,
      'Replacement must not reuse the original card ID or D100 face in the same category/night');
    // Normalize row order, but compare every selected persisted field to
    // detect silent changes even when the replay returns the same ID.
    return JSON.stringify([...stored].sort((x, y) => x.id.localeCompare(y.id)));
  }
  const beforeReplay = await persistedPassSnapshot();
  await assertDuetUnchanged('after the first Passer, before replay');
  await assertD6Unchanged('after the first Passer, before replay');
  const replay = await client.rpc('love_respond_and_redraw',
    {p_challenge: drawn.id, p_action: config.action, p_exclude: config.exclude}, recipient.token);
  assert(replay.already_processed === true &&
    eq(replay.replacement_id, response.replacement_id) &&
    eq(replay.original_id, drawn.id) &&
    replay.action === config.action && replay.excluded === config.exclude,
    'Repeated response must return the exact persisted action, exclusion and replacement');
  const afterReplay = await persistedPassSnapshot();
  assert(afterReplay === beforeReplay,
    'Repeated Passer must not change any persisted challenge field');
  await assertDuetUnchanged('after idempotent Passer replay');
  await assertD6Unchanged('after idempotent Passer replay');

  // Explicit opt-in only. A stale phone may resend an incompatible button
  // after the first decision is committed. Each call MUST return the original
  // receipt, even when the stale action carries a different exclusion flag.
  // Keep this at the END of the recipe: never attempt conflicting requests
  // until both user views, the current session, both D6 and the original
  // idempotency check have passed.
  let staleReplayChecks = 0;
  if (config.staleReplay) {
    // Reauthenticate the SAME recipient with GoTrue to obtain a distinct
    // session. Reusing one bearer token twice cannot prove two-device
    // replay safety. login() independently checks /auth/v1/user identity.
    const secondDevice = await client.login(
      config.drawer === 'B' ? config.a : config.b);
    assert(eq(secondDevice.id, recipient.id) &&
      secondDevice.token !== recipient.token,
      'Stale response probe requires a second independent recipient Auth session');
    const contradictions = config.action === 'pass'
      ? [{action:'refuse',exclude:true}]
      : [{action:'pass',exclude:false},
         {action:'refuse',exclude:!config.exclude}];
    for (const stale of contradictions) {
      const staleResult = await client.rpc('love_respond_and_redraw', {
        p_challenge: drawn.id,p_action:stale.action,p_exclude:stale.exclude
      },secondDevice.token);
      assert(staleResult?.already_processed === true &&
        eq(staleResult.original_id,drawn.id) &&
        eq(staleResult.replacement_id,response.replacement_id) &&
        staleResult.action === config.action &&
        staleResult.excluded === config.exclude,
        'Stale conflicting response must replay the first immutable server decision');
      const afterConflict = await persistedPassSnapshot();
      assert(afterConflict === beforeReplay,
        'Stale conflicting response mutated a persisted challenge');
      await assertDuetUnchanged('after stale conflicting response');
      await assertD6Unchanged('after stale conflicting response');
      staleReplayChecks++;
    }
  }

  return {...result, draw_id: drawn.id, replacement_id: response.replacement_id,
    drawer: config.drawer, random_category_mode: config.random,
    actual_draw_category: drawn.category, replacement_same_category: true, pass_replay_idempotent: true,
    stale_replay_checks: staleReplayChecks,
    distinct_stale_auth_session: config.staleReplay,
    response_action: config.action, response_excluded: config.exclude,
    persisted_challenges: 2};
}
