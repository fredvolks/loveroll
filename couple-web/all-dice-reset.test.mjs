import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL(n,import.meta.url),'utf8');
const sql=read('./migrations/20261015_reset_all_current_dice_admin.sql');
const app=read('./app.js');
test('Reset is admin only and requires affirmative confirmation, not automatic',()=>{
 assert.match(sql,/c\.owner_user_id=auth\.uid\(\)/);
 assert.match(sql,/couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/love_require_verified_identity\(\)/);
 assert.match(sql,/for update/);
 assert.match(app,/admin-reset-all-dice/);
 assert.match(app,/premiumConfirm\(message/);
 assert.match(app,/reset_love_all_dice_admin/);
 assert.doesNotMatch(app,/if\(verb==='admin-reset-weekly'\)/);
});
test('Reset addresses every current kind, preserves prior completed sessions and cards',()=>{
 for(const kind of ['weekly','couple_rolls','couple_occasion_rolls','love_special_modifier_snapshots'])
  assert.ok(sql.includes(kind),kind);
 assert.match(sql,/update public\.couple_sessions[\s\S]+finished_at is null/);
 assert.match(sql,/counted=false/);
 assert.match(sql,/love_all_dice_reset_audit/);
 assert.match(sql,/last_reset/);
 assert.match(sql,/started_at>=last_reset/);
 assert.doesNotMatch(sql,/delete from public\.couple_sessions/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/);
 assert.doesNotMatch(sql,/delete from public\.love_custom_challenges/);
 assert.doesNotMatch(sql,/delete from public\.couple_advent/);
 assert.doesNotMatch(sql,/delete from auth\.users/);
});
