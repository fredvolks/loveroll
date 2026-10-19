import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playableSessionForWeekly} from './couple-reset-view.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('./migrations/20261015_full_reset_legacy_compat.sql',import.meta.url),'utf8');
test('When weekly roll is reset, stale D6 3 + 6 and nine active challenges disappear from Home and Soirée',()=>{
 const old={id:'old-evening',started_at:'2026-10-15T13:00:00Z',finished_at:null};
 assert.equal(playableSessionForWeekly(old,null),null);
 const newWeekly={id:'new-weekly',created_at:'2026-10-15T14:00:00Z',face:2};
 assert.equal(playableSessionForWeekly(old,newWeekly),null);
 assert.equal(playableSessionForWeekly({...old,started_at:'2026-10-15T15:00:00Z'},newWeekly)?.id,'old-evening');
 assert.match(app,/const activeEvening=playableSessionForWeekly\(state\.session,state\.weekly\)/);
 assert.match(app,/const session=playableSessionForWeekly\(state\.session,state\.weekly\)/);
});
test('Legacy reset button now executes FULL reset, preventing the old weekly-only bug',()=>{
 assert.match(sql,/create or replace function public\.reset_love_weekly_roll_admin/);
 assert.match(sql,/public\.reset_love_all_dice_admin\(p_couple\)/);
 assert.match(sql,/grant execute on function public\.reset_love_weekly_roll_admin\(uuid\) to authenticated/);
 assert.match(sql,/couple_private\.is_member\(p_couple\)/);
});
test('Re-rolling weekly cannot resurrect stale old session with personal D6s',()=>{
 assert.match(sql,/s\.started_at<weekly_created/);
 assert.match(sql,/set finished_at=now\(\),counted=false/);
 assert.match(sql,/Brassez d’abord le dé de la semaine/);
 assert.doesNotMatch(sql,/delete from public\.couple_personal_rolls/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/);
});

test('Settings JS is free from literal backslash-n that broke the live v66 page',()=>{
 assert.doesNotMatch(app,/;\\n const notifications=/);
 assert.match(app,/;\n const notifications=/);
 const webBuild=JSON.parse(readFileSync(new URL('./web-version.json',import.meta.url),'utf8')).build;
 assert.ok(app.includes("const WEB_RELEASE='"+webBuild+"'"));
});
