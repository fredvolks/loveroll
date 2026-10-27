// Stage-1 Venice setup contract: no paid inference and no secret in client code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const edge = readFileSync(new URL('../supabase/functions/love-venice-bridge/index.ts', import.meta.url), 'utf8');
test('Venice URL is embedded server-side, so users do not enter it as a Supabase secret', () => {
  assert.match(edge, /https:\/\/api\.venice\.ai\/api\/v1/);
  assert.match(edge, /Deno\.env\.get\('VENICE_API_KEY'\)/);
  assert.match(edge, /\/api_keys\/rate_limits/);
});
test('Bridge is an authenticated, admin-only, non-billable connectivity check', () => {
  assert.match(edge, /supabase\.auth\.getUser\(match\[1\]\)/);
  assert.match(edge, /\.eq\('owner_user_id', identity\.user\.id\)/);
  assert.match(edge, /'status', 'verify_key'/);
  assert.doesNotMatch(edge, /\/chat\/completions|\/images\/generations/);
  assert.doesNotMatch(edge, /console\.log|console\.error|service_role\s*:/);
  assert.match(edge, /configured: Boolean\(veniceKey\)/);
});
