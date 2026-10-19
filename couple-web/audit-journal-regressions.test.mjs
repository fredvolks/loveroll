import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const app=read('app.js'),sql=read('migrations/20261015_author_scoped_encrypted_journal_edits.sql');
const visual=read('actual-discover-visual-check.cjs');
test('Calendar month formatter is synchronous and renders real French labels',()=>{
 const begin=app.indexOf('function frenchCalendarMonth(');
 const end=app.indexOf('\nconst weekdayHeaders=',begin);
 assert.ok(begin>=0&&end>begin);
 const formatter=Function(app.slice(begin,end)+';return frenchCalendarMonth;')();
 assert.equal(formatter('2026-10'),'octobre 2026');
 assert.equal(formatter('2026-04'),'avril 2026');
 assert.equal(typeof formatter('2026-10'),'string');
 assert.match(app,/async function renderPersonalJournal\(\)/);
});
test('Personal and shared journal editing are distinct and use ciphertext RPCs',()=>{
 for(const key of ['personal-edit','personal-save','personal-delete','edit-event','cancel-edit-event'])
  assert.match(app,new RegExp("verb==='"+key+"'"),key);
 assert.match(app,/rpc\('update_my_love_event'/);
 assert.match(app,/rpc\('update_my_personal_love_event'/);
 assert.match(app,/rpc\('delete_my_personal_love_event'/);
 assert.match(app,/await encryptJson\(payload,key\)/);
 assert.match(app,/author_id===state.user.id/);
 assert.match(app,/Commentaire partagé avec votre partenaire/);
 assert.match(app,/Cette modification ne sera pas transmise à votre partenaire/);
 assert.doesNotMatch(app,/localStorage\.setItem\('loveroll-.*(?:note|draft|pass)/i);
});
test('Database functions require verified author and preserve original personal archive independence',()=>{
 assert.match(sql,/create or replace function public\.update_my_love_event/);
 assert.match(sql,/create or replace function public\.update_my_personal_love_event/);
 assert.match(sql,/create or replace function public\.delete_my_personal_love_event/);
 assert.match(sql,/v_author<>auth\.uid\(\)/);
 assert.match(sql,/where id=p_archive and user_id=auth\.uid\(\)/);
 assert.match(sql,/ciphertext=v_old/);
 assert.match(sql,/couple_private\.is_member\(v_couple\)/);
 assert.match(sql,/revoke all on function public\.update_my_love_event\(uuid,date,text\) from public,anon/);
});
test('New evening reviews belong to authenticated couple members, with no journal password',()=>{
 const reviews=read('migrations/20261016_evening_hearts_reviews.sql');
 assert.match(reviews,/PRIMARY KEY\(session_id,author_id\)/);
 assert.match(reviews,/couple_private\.is_member\(v_couple\)/);
 assert.match(reviews,/couple_private\.is_member\(p_couple\)/);
 assert.match(reviews,/s\.finished_at IS NOT NULL AND s\.counted IS TRUE/);
 assert.match(app,/rpc\('love_evening_reviews_for_couple'/);
 assert.doesNotMatch(app,/my_love_feedback_status|save-feedback|choose-feedback/);
});
test('Journal creation writes encrypted verifier only once and does not confuse empty with wrong key',()=>{
 assert.match(sql,/add column if not exists journal_verifier text/);
 assert.match(sql,/from public\.couples where id=p_couple for update/);
 assert.match(sql,/if v_existing is not null then/);
 assert.match(sql,/revoke all on function public\.initialize_love_journal/);
 assert.match(app,/purpose:'loveroll-journal-check'/);
 assert.match(app,/await decryptJson\(probe,key\)/);
 assert.match(app,/rpc\('initialize_love_journal'/);
});
test('Actual landing and invitation are tested from discoverHtml, not legacy marketingHTML',()=>{
 assert.match(visual,/discoverHtml\(new URLSearchParams/);
 assert.match(visual,/width:360,height:700/);
 assert.match(visual,/width:393,height:852/);
 assert.match(visual,/width:824,height:412/);
 assert.match(visual,/primaryHeight<44/);
 assert.doesNotMatch(visual,/marketingHtml/);
});

test('Only the current couple can learn playable counts; private catalogue text remains inaccessible',()=>{
 assert.match(sql,/create or replace function public\.my_love_evening_card_totals/);
 assert.match(sql,/couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/count\(\*\) filter\(where c\.category='SENSUEL'\)/);
 assert.match(sql,/count\(\*\) filter\(where c\.category='SEXUEL'\)/);
 assert.match(sql,/c\.card_id between 26 and 35/);
 assert.match(sql,/revoke all on function public\.my_love_evening_card_totals/);
 assert.match(app,/rpc\('my_love_evening_card_totals'/);
 assert.match(app,/playable:state\.playableCounts/);
});
