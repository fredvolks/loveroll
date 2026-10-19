import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./migrations/20261015_reset_all_current_dice_admin.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');

test('All dice reset works after starting a session',()=>{
 assert.match(sql,/create or replace function public\.reset_love_all_dice_admin/);
 assert.match(sql,/update public\.couple_sessions/);
 assert.match(sql,/finished_at is null/);
 assert.match(sql,/counted=false/);
 assert.match(app,/Réinitialiser tous les dés/);
});
test('Reset keeps existing card libraries, completed sessions and member accounts',()=>{
 assert.match(sql,/love_all_dice_reset_audit/);
 assert.match(sql,/couple_occasion_rolls/);
 assert.match(sql,/love_special_modifier_snapshots/);
 assert.match(sql,/delete from public\.couple_rolls/);
 assert.doesNotMatch(sql,/delete from public\.couple_sessions/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/);
 assert.doesNotMatch(sql,/delete from auth\.users/);
});
test('Only couple owner after explicit confirmation may clear current dice',()=>{
 assert.match(sql,/owner_user_id=auth\.uid\(\)/);
 assert.match(sql,/couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/for update/);
 assert.match(sql,/revoke all on function public\.reset_love_all_dice_admin/);
 assert.match(app,/if\(verb==='admin-reset-all-dice'\)/);
 assert.match(app,/await premiumConfirm\(message/);
 assert.match(app,/reset_love_all_dice_admin/);
});
test('Next weekly roll uses Toronto date and retains old historical weeks',()=>{
 assert.match(sql,/time zone 'America\/Toronto'/);
 assert.match(sql,/extract\(isodow from local_day\)/);
 assert.match(sql,/kind='weekly'/);
 assert.match(sql,/key=week_key/);
 assert.match(sql,/started_at>=last_reset/);
});
