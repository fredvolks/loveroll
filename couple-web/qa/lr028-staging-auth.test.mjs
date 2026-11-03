import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfiguration, verifyStaging } from './lr028-staging-auth.mjs';

const coupleId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const invitationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const env = mode => ({
  LR028_ALLOW_STAGING_READONLY: 'YES',
  LR028_STAGING_URL: 'https://staging.example.test',
  LR028_STAGING_MODE: mode,
  LR028_STAGING_COUPLE_ID: coupleId,
  LR028_STAGING_INVITATION_ID: invitationId,
  LR028_STAGING_ANON_KEY: 'public_test_only',
  LR028_STAGING_A_JWT: 'JWT_A',
  LR028_STAGING_B_JWT: 'JWT_B',
  LR028_STAGING_C_JWT: 'JWT_C',
});

function fakeApi(mode, bad = '') {
  const calls = [];
  async function mockFetch(url, options) {
    calls.push({ url: String(url), options });
    assert.equal(options.method, 'GET', 'never mutate staging');
    const actor = Object.entries({ A: 'JWT_A', B: 'JWT_B', C: 'JWT_C' })
      .find(([, token]) => options.headers.authorization === 'Bearer ' + token)?.[0] ?? 'anon';
    const isRpc = String(url).includes('/rpc/love_evening_invite_status');
    if (actor === 'anon' ||
      (isRpc && (mode === 'active' ? actor === 'C' :
        actor === (mode === 'recipient-replaced' ? 'B' : 'A')))) {
      return { ok: false, status: 403 };
    }
    let data;
    if (!isRpc) {
      data = mode === 'active' && actor !== 'C' ? [{ id: invitationId }] : [];
      if (bad === 'leak-row' && actor === 'C') data = [{ id: invitationId }];
    } else if (mode === 'active') {
      data = { id: invitationId, direction: actor === 'A' ? 'sent' : 'received', state: 'pending' };
    } else {
      data = { available: false, state: 'none' };
      if (bad === 'leak-status' && actor === 'C') data.id = invitationId;
    }
    return { ok: true, status: 200, json: async () => data };
  }
  return { mockFetch, calls };
}

for (const mode of ['active', 'recipient-replaced', 'sender-replaced']) {
  test('read-only acceptance: ' + mode, async () => {
    const config = readConfiguration(env(mode));
    const { mockFetch, calls } = fakeApi(mode);
    const result = await verifyStaging(config, mockFetch);
    assert.match(result, /checks passed/);
    assert.equal(calls.length, 8);
    assert(calls.every(({ options }) => options.method === 'GET'));
  });
}

test('fails on unauthorized direct SELECT data leak', async () => {
  const { mockFetch } = fakeApi('active', 'leak-row');
  await assert.rejects(verifyStaging(readConfiguration(env('active')), mockFetch),
    /C: expected 0 RLS-visible invitations/);
});

test('fails on stale RPC private-field leak', async () => {
  const { mockFetch } = fakeApi('recipient-replaced', 'leak-status');
  await assert.rejects(verifyStaging(readConfiguration(env('recipient-replaced')), mockFetch),
    /C: stale invitation exposed private fields/);
});

test('requires explicit staging opt-in and three distinct JWTs', () => {
  const noOptIn = env('active');
  delete noOptIn.LR028_ALLOW_STAGING_READONLY;
  assert.throws(() => readConfiguration(noOptIn), /Explicit staging opt-in/);
  const reused = env('active');
  reused.LR028_STAGING_C_JWT = reused.LR028_STAGING_A_JWT;
  assert.throws(() => readConfiguration(reused), /three JWTs must be different/);
});

test('rejects remote HTTP URL and URL credentials', () => {
  assert.throws(() => readConfiguration({
    ...env('active'), LR028_STAGING_URL: 'http://example.test'
  }), /requires HTTPS/);
  assert.throws(() => readConfiguration({
    ...env('active'), LR028_STAGING_URL: 'https://someone:secret@example.test'
  }), /without credentials/);
});
