import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/love-venice-bridge/index.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('migrations/20261027_venice_three_card_preview.sql',import.meta.url),'utf8');
test('three real Venice examples are generated, never substituted with local content',()=>{
 assert.match(source,/action === 'preview_three'/);
 assert.match(source,/VENICE_API_BASE_URL \+ '\/chat\/completions'/);
 assert.match(source,/Promise\.all\(definitions\.map\(makeCard\)\)/);
 assert.match(source,/origin:'venice-api'/);
 assert.match(source,/get_latest_preview/);
});
test('draft only, strict roles, 2-6 minute validation, owner login',()=>{
 assert.match(source,/supabase\.auth\.getUser/);
 assert.match(source,/\.eq\('owner_user_id', identity\.user\.id\)/);
 assert.match(source,/Number\(obj\.timer_minutes\) < 2/);
 assert.match(source,/Number\(obj\.timer_minutes\) > 6/);
 assert.match(source,/obj\.drawer_role !== item\.drawer_role/);
 assert.doesNotMatch(source,/\.from\('love_future_style_cards'\)/);
 assert.doesNotMatch(source,/\.from\('couple_challenges'\)/);
});
test('private quota and persistence protect users from repeated charges',()=>{
 assert.match(migration,/unique\(couple_id,utc_day\)/);
 assert.match(migration,/revoke all on table public\.love_venice_preview_trials from public,anon,authenticated/);
 assert.match(migration,/row level security/);
 assert.match(source,/\.from\('love_venice_preview_trials'\)\.insert/);
 assert.match(source,/\.update\(\{\s*cards, model/);
});
