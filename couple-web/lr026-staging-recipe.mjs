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
  if (!['check', 'auth', 'audit', 'play'].includes(mode)) throw new Error('Unknown LR-026 mode');
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
    const abRollQuery = 'select=session_id,user_id,face&session_id=eq.' + config.sessionId;
    for (const actor of [a, b]) {
      const rolls = await client.rows('couple_personal_rolls', abRollQuery, actor.token);
      assert(rolls.length === 2 &&
        [a.id, b.id].every(id =>
          rolls.filter(r => eq(r.user_id, id) && eq(r.session_id, config.sessionId) &&
            Number.isInteger(r.face) && r.face >= 1 && r.face <= 6).length === 1),
        'RLS audit needs both A/B D6 rolls readable by each partner');
    }
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

  const sessionRows = await client.rows('couple_sessions',
    'select=id,paired_turns,self_draws&id=eq.' + config.sessionId, a.token);
  assert(sessionRows.length === 1 && sessionRows[0].paired_turns === false &&
    sessionRows[0].self_draws === false,
    'Mutating recipe requires a fresh legacy partner-draw session (paired_turns=false, self_draws=false)');
  // Reject a malformed or RLS-invisible D6 fixture before calling the
  // mutating D100 RPC. A-only visibility does NOT prove B can read both D6.
  // Explicit session IDs, unique owners and faces 1..6 are mandatory.
  const d6Query = 'select=session_id,user_id,face&session_id=eq.' + config.sessionId;
  for (const actor of [a, b]) {
    const rolls = await client.rows('couple_personal_rolls', d6Query, actor.token);
    assert(rolls.length === 2 &&
      [a.id, b.id].every(id =>
        rolls.filter(r => eq(r.user_id, id) &&
          eq(r.session_id, config.sessionId) &&
          Number.isInteger(r.face) && r.face >= 1 && r.face <= 6).length === 1),
      'Two valid D6 rolls for this session must be readable by both partners before D100');
  }
  // Real production RLS on couple_challenges only exposes each card
  // to its RECIPIENT, not the person offering it. A's empty list alone
  // can conceal B's existing card; require zero visible challenges for
  // BOTH authenticated partners before making any mutating RPC.
  for (const actor of [a, b]) {
    const existing = await client.rows('couple_challenges',
      'select=id,recipient,status&session_id=eq.' + config.sessionId, actor.token);
    assert(existing.length === 0,
      'Play recipe requires a clean session visible to both recipients; never reset existing data');
  }

  // Never retry mutations. On error the staging operator must inspect the
  // persisted state and provision a NEW fixture, not blindly replay.
  const challengeQuery =
    'select=id,session_id,offered_by,recipient,category,replaces_challenge_id,status' +
    '&session_id=eq.' + config.sessionId;
  const drawn = await client.rpc('draw_for_partner',
    {p_session: config.sessionId, p_preference: 'SENSUEL', p_random: false}, a.token);
  assert(UUID.test(drawn?.id || '') && eq(drawn.recipient, b.id) &&
    eq(drawn.offered_by, a.id), 'Real D100 did not return a valid card offered by A to B');
  assert(['SENSUEL', 'SEXUEL'].includes(drawn.category),
    'Real D100 returned an unknown category');
  // Independently read the newly persisted row as the B recipient and A.
  // A successful RPC response alone is not proof that it was saved for B.
  // NEVER run Passer if the first draw is missing, malformed or misrouted.
  const firstForB = await client.rows('couple_challenges', challengeQuery, b.token);
  const firstForA = await client.rows('couple_challenges', challengeQuery, a.token);
  assert(firstForB.length === 1 &&
    eq(firstForB[0].id, drawn.id) &&
    eq(firstForB[0].session_id, config.sessionId) &&
    eq(firstForB[0].offered_by, a.id) &&
    eq(firstForB[0].recipient, b.id) &&
    firstForB[0].category === drawn.category &&
    firstForB[0].status === 'proposed' &&
    firstForB[0].replaces_challenge_id == null,
    'First D100 must persist exactly one new A-to-B proposal before Passer');
  assert(firstForA.length === 0,
    'First D100 must not persist a proposal visible to A before Passer');
  const response = await client.rpc('love_respond_and_redraw',
    {p_challenge: drawn.id, p_action: 'pass', p_exclude: false}, b.token);
  assert(eq(response?.original_id, drawn.id) &&
    response.action === 'pass' && response.already_processed === false &&
    UUID.test(response.replacement_id || '') &&
    !eq(response.replacement_id, drawn.id),
    'Partner B Passer must create one new and distinct replacement');
  const replay = await client.rpc('love_respond_and_redraw',
    {p_challenge: drawn.id, p_action: 'pass', p_exclude: false}, b.token);
  assert(replay.already_processed === true &&
    eq(replay.replacement_id, response.replacement_id) &&
    eq(replay.original_id, drawn.id),
    'Repeated Passer must return the exact persisted replacement');
  // The real recipient-only RLS hides A's cards from B and vice versa.
  // Check BOTH authenticated recipients after the RPCs; a stray card for A
  // would otherwise remain invisible to the B-only verification.
  const stored = await client.rows('couple_challenges', challengeQuery, b.token);
  const forA = await client.rows('couple_challenges', challengeQuery, a.token);
  assert(forA.length === 0,
    'Unexpected challenge addressed to A after a partner B draw and Passer');
  assert(stored.length === 2 &&
    stored.every(c => eq(c.session_id, config.sessionId) &&
      eq(c.recipient, b.id) && c.category === drawn.category),
    'Only the two correct-category B challenges may exist');
  assert(stored.filter(c =>
    eq(c.id, drawn.id) && c.status === 'passed' &&
    eq(c.offered_by, a.id)).length === 1,
    'Only one original passed challenge offered by A may exist');
  assert(stored.filter(c => eq(c.id, response.replacement_id) &&
    eq(c.replaces_challenge_id, drawn.id) && c.status === 'proposed').length === 1,
    'Exactly one same-category replacement must exist for recipient B');
  return {...result, draw_id: drawn.id, replacement_id: response.replacement_id,
    replacement_same_category: true, pass_replay_idempotent: true, persisted_challenges: 2};
}
