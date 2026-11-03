// LR-028: read-only REST/JWT verification on an isolated Supabase staging project.
// No login, invitation creation, membership changes, or data mutations.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODES = new Set(['active', 'recipient-replaced', 'sender-replaced']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function readConfiguration(env) {
  assert(env.LR028_ALLOW_STAGING_READONLY === 'YES',
    'Explicit staging opt-in required: LR028_ALLOW_STAGING_READONLY=YES');
  const url = env.LR028_STAGING_URL;
  assert(typeof url === 'string' && url.length > 0, 'Missing LR028_STAGING_URL');
  const base = new URL(url);
  assert(['https:', 'http:'].includes(base.protocol) && !base.username && !base.password &&
    !base.search && !base.hash && (base.pathname === '/' || base.pathname === ''),
    'Staging URL must be an origin without credentials, path or query');
  assert(base.protocol === 'https:' || ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname),
    'Remote staging requires HTTPS');
  const mode = env.LR028_STAGING_MODE;
  assert(MODES.has(mode), 'LR028_STAGING_MODE must be active, recipient-replaced or sender-replaced');
  const coupleId = env.LR028_STAGING_COUPLE_ID;
  const invitationId = env.LR028_STAGING_INVITATION_ID;
  assert(UUID.test(coupleId || '') && UUID.test(invitationId || ''),
    'Valid LR028_STAGING_COUPLE_ID and LR028_STAGING_INVITATION_ID are required');
  const apiKey = env.LR028_STAGING_ANON_KEY;
  assert(apiKey && !/\s/.test(apiKey), 'Missing LR028_STAGING_ANON_KEY');
  const jwt = Object.fromEntries(['A', 'B', 'C'].map(name =>
    [name, env['LR028_STAGING_' + name + '_JWT']]));
  for (const [name, token] of Object.entries(jwt)) {
    assert(token && !/\s/.test(token), 'Missing LR028_STAGING_' + name + '_JWT');
  }
  assert(new Set(Object.values(jwt)).size === 3, 'The three JWTs must be different');
  return { base: base.origin, mode, coupleId, invitationId, apiKey, jwt };
}

async function requestRead(config, actor, path, fetchImpl) {
  const response = await fetchImpl(new URL('/rest/v1/' + path, config.base), {
    method: 'GET',
    headers: {
      apikey: config.apiKey,
      ...(actor === 'anon' ? {} : { authorization: 'Bearer ' + config.jwt[actor] }),
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });
  // Never expose response bodies in errors: they may contain personal data.
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: await response.json() };
}

function assertHiddenStatus(response, actor) {
  assert(response.status === 200, actor + ': status lookup failed (HTTP ' + response.status + ')');
  const data = response.data;
  assert(data && data.state === 'none' && data.available === false,
    actor + ': stale invitation must produce unavailable/none');
  assert(!['id', 'sender_id', 'recipient_id', 'direction'].some(key => Object.hasOwn(data, key)),
    actor + ': stale invitation exposed private fields');
}

export async function verifyStaging(config, fetchImpl = fetch) {
  const { coupleId, invitationId, mode } = config;
  const selected = new URLSearchParams({
    select: 'id', couple_id: 'eq.' + coupleId, id: 'eq.' + invitationId,
  });
  const statusArgs = new URLSearchParams({ p_couple: coupleId });
  const results = {};
  for (const actor of ['A', 'B', 'C', 'anon']) {
    results[actor] = {
      rows: await requestRead(config, actor,
        'love_evening_invitations?' + selected, fetchImpl),
      status: await requestRead(config, actor,
        'rpc/love_evening_invite_status?' + statusArgs, fetchImpl),
    };
  }
  for (const actor of ['A', 'B', 'C']) {
    const rows = results[actor].rows;
    assert(rows.status === 200 && Array.isArray(rows.data),
      actor + ': direct RLS SELECT requires HTTP 200 + array (received ' + rows.status + ')');
    const expected = mode === 'active' && actor !== 'C' ? 1 : 0;
    assert(rows.data.length === expected, actor + ': expected ' + expected + ' RLS-visible invitations');
    if (expected === 1) assert(rows.data[0]?.id === invitationId,
      actor + ': selected invitation ID does not match fixture');
  }
  const anonRows = results.anon.rows;
  assert((anonRows.status === 200 && Array.isArray(anonRows.data) &&
    anonRows.data.length === 0) || [401, 403].includes(anonRows.status),
    'Anonymous request exposed invitation data');
  assert([401, 403].includes(results.anon.status.status),
    'Anonymous caller must not execute invite_status RPC');

  if (mode === 'active') {
    for (const [actor, direction] of [['A', 'sent'], ['B', 'received']]) {
      const r = results[actor].status;
      assert(r.status === 200 && r.data?.id === invitationId &&
        r.data?.direction === direction && r.data?.state === 'pending',
        actor + ': expected its own pending invitation');
    }
    assert([401, 403].includes(results.C.status.status),
      'Outsider C must not execute invite status RPC');
  } else {
    const removed = mode === 'recipient-replaced' ? 'B' : 'A';
    for (const actor of ['A', 'B', 'C']) {
      if (actor === removed) {
        assert([401, 403].includes(results[actor].status.status),
          actor + ': removed member must not execute status RPC');
      } else assertHiddenStatus(results[actor].status, actor);
    }
  }
  return 'LR-028 staging ' + mode + ': JWT/RLS read-only checks passed for A, B, C and anon';
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try {
    const config = readConfiguration(process.env);
    console.log(await verifyStaging(config));
  } catch (error) {
    console.error('LR-028 staging check failed: ' + error.message);
    process.exitCode = 1;
  }
}
