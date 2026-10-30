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
  if (!['check', 'auth', 'play'].includes(mode)) throw new Error('Unknown LR-026 mode');
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
      signal: AbortSignal.timeout(18000)
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { throw new Error('Non-JSON Supabase response (' + response.status + ')'); }
    if (!response.ok) {
      const serverMessage = typeof data?.message === 'string' ? data.message : data?.error_description || data?.code || 'API error';
      throw new Error('Supabase API ' + response.status + ' (' + path.split('?')[0] + '): ' + serverMessage);
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
    const members = await client.rows('couple_members',
      'select=couple_id,user_id&couple_id=eq.' + config.coupleId + '&user_id=eq.' + actor.id,
      actor.token);
    assert(members.length === 1 && eq(members[0].user_id, actor.id),
      'Each actor must see their own membership through real RLS');
  }
  const result = {stage_ref: config.ref, mode, safe: true,
    real_auth_accounts: 2, couple_id: config.coupleId, session_id: config.sessionId,
    rls_session_reads: 2, rls_membership_reads: 2};
  if (mode === 'auth') return result;

  const sessionRows = await client.rows('couple_sessions',
    'select=id,paired_turns,self_draws&id=eq.' + config.sessionId, a.token);
  assert(sessionRows.length === 1 && sessionRows[0].paired_turns === false &&
    sessionRows[0].self_draws === false,
    'Mutating recipe requires a fresh legacy partner-draw session (paired_turns=false, self_draws=false)');
  const rolls = await client.rows('couple_personal_rolls',
    'select=user_id,face&session_id=eq.' + config.sessionId, a.token);
  assert(rolls.length === 2 && rolls.some(x => eq(x.user_id, a.id) && x.face > 0) &&
    rolls.some(x => eq(x.user_id, b.id) && x.face > 0),
    'Two D6 rolls must exist before first D100 draw');
  const existing = await client.rows('couple_challenges',
    'select=id,recipient,status&session_id=eq.' + config.sessionId, a.token);
  assert(existing.length === 0, 'Play recipe only accepts a clean session; never reset existing data');

  // Never retry mutations. On error the staging operator must inspect the
  // persisted state and provision a NEW fixture, not blindly replay.
  const drawn = await client.rpc('draw_for_partner',
    {p_session: config.sessionId, p_preference: 'SENSUEL', p_random: false}, a.token);
  assert(typeof drawn?.id === 'string' && eq(drawn.recipient, b.id) &&
    eq(drawn.offered_by, a.id), 'Real D100 did not return a card offered by A to B');
  assert(['SENSUEL', 'SEXUEL'].includes(drawn.category),
    'Real D100 returned an unknown category');
  const response = await client.rpc('love_respond_and_redraw',
    {p_challenge: drawn.id, p_action: 'pass', p_exclude: false}, b.token);
  assert(eq(response?.original_id, drawn.id) &&
    response.action === 'pass' && response.already_processed === false &&
    UUID.test(response.replacement_id || ''), 'Partner B Passer must create one replacement');
  const replay = await client.rpc('love_respond_and_redraw',
    {p_challenge: drawn.id, p_action: 'pass', p_exclude: false}, b.token);
  assert(replay.already_processed === true &&
    eq(replay.replacement_id, response.replacement_id) &&
    eq(replay.original_id, drawn.id),
    'Repeated Passer must return the exact persisted replacement');
  const stored = await client.rows('couple_challenges',
    'select=id,recipient,category,replaces_challenge_id,status&session_id=eq.' +
      config.sessionId, b.token);
  assert(stored.length === 2 && stored.filter(c => eq(c.id, drawn.id) && c.status === 'passed').length === 1,
    'Only one original passed challenge may exist');
  assert(stored.filter(c => eq(c.id, response.replacement_id) &&
    eq(c.replaces_challenge_id, drawn.id) && c.status === 'proposed' &&
    eq(c.recipient, b.id) && c.category === drawn.category).length === 1,
    'Exactly one same-category replacement must exist for recipient B');
  return {...result, draw_id: drawn.id, replacement_id: response.replacement_id,
    replacement_same_category: true, pass_replay_idempotent: true, persisted_challenges: 2};
}
