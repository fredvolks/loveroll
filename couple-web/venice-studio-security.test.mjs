import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL('../supabase/functions/love-venice-bridge/index.ts',import.meta.url),'utf8');
const sql=readFileSync(new URL('migrations/20261027_venice_studio_simulator.sql',import.meta.url),'utf8');
test('Super Admin only Venice pilot separate from couple trials',()=>{
 assert.match(edge,/studio_preview_three/);
 assert.match(edge,/studio_get_latest_preview/);
 assert.match(edge,/email_confirmed_at/);
 assert.match(edge,/\.from\('love_platform_admins'\)/);
 assert.match(edge,/studioAction\?'love_venice_studio_trials':'love_venice_preview_trials'/);
 assert.match(sql,/unique \(requested_by,utc_day\)/);
 assert.match(sql,/revoke all on public\.love_venice_studio_trials/);
});
test('Studio virtual catalog returns only public global default cards',()=>{
 assert.match(sql,/public\.love_platform_is_admin\(\)/);
 assert.match(sql,/from public\.love_base_challenges c/);
 assert.match(sql,/c\.category in \('SENSUEL','SEXUEL'\)/);
 assert.doesNotMatch(sql,/couple_private\.love_auto_card_pool/);
});
