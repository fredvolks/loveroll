// LR-019: structural contract tests. These do not replace a real authenticated
// PostgreSQL integration with two members or end-to-end D100 browser tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('./migrations/20261101_lr019_favorites_future_evenings.sql',import.meta.url),'utf8');
function definition(name,tag) {
 const lower=sql.toLowerCase();
 const start=lower.indexOf('create or replace function public.'+name+'(');
 assert.ok(start>=0,'Missing official RPC '+name);
 const first=sql.indexOf('$'+tag+'$',start);
 assert.ok(first>=0,'Missing function body '+name);
 const end=sql.indexOf('$'+tag+'$;',first+tag.length+2);
 assert.ok(end>first,'Unterminated function body '+name);
 return sql.slice(start,end+tag.length+3);
}

test('LR-019: official weighted D100 has two favorite exceptions, no same-night or role bypass',()=>{
 const draw=definition('draw_for_partner','function');
 assert.equal((draw.match(/EXISTS\(SELECT 1 FROM public\.love_evening_favorites fav/g)||[]).length,2);
 assert.match(draw,/used\.session_id=p_session AND used\.recipient=target/i);
 assert.match(draw,/love_cycle_excluded_cards/);
 assert.match(draw,/love_role_allows/);
 assert.match(draw,/v_cat=p_preference/);
 assert.match(draw,/floor\(random\(\)\*total\)/);
 assert.match(draw,/love_card_draw_history history/);
});

test('LR-019: favorites marked after session start wait for a future evening',()=>{
 const draw=definition('draw_for_partner','function');
 const redraw=definition('love_respond_and_redraw','replace');
 // Both the category capacity check and the actual random pick must agree.
 assert.equal((draw.match(/fav\\.added_at\\s*<\\s*s\\.started_at/g)||[]).length,2);
 // Passing/refusing a card must obey the exact same time boundary.
 assert.equal((redraw.match(/fav\\.added_at\\s*<\\s*v_session\\.started_at/g)||[]).length,1);
 // Time eligibility never replaces the same-session exclusion guards.
 assert.match(draw,/used\\.session_id=p_session AND used\\.recipient=target/i);
 assert.match(redraw,/seen\\.session_id=v_old\\.session_id/i);
});

test('LR-019: replacement obeys same-evening lockout and voluntary exclusion',()=>{
 const redraw=definition('love_respond_and_redraw','replace');
 assert.equal((redraw.match(/EXISTS\(SELECT 1 FROM public\.love_evening_favorites fav/g)||[]).length,1);
 assert.match(redraw,/seen\.session_id=v_old\.session_id/);
 assert.match(redraw,/ex\.cycle_number=v_cycle/);
 assert.match(redraw,/love_role_allows/);
 assert.match(redraw,/p_action='pass'/);
 assert.match(redraw,/FOR UPDATE/i);
});

test('LR-019: shared 200-card tally is unique without changing personal D6 completion',()=>{
 const status=definition('love_cycle_status','status');
 const finish=definition('finish_couple_session','function');
 assert.match(status,/count\(DISTINCT \(ch\.category,ch\.card_id\)\)/i);
 assert.match(finish,/count\(DISTINCT \(cc\.category,cc\.card_id\)\)/i);
 assert.match(finish,/select count\(\*\) into done/i);
 assert.match(status,/challenge_cycle_started_at/);
 assert.match(finish,/challenge_cycle_pending/);
});

test('LR-019: requires the server-side favorite list and grants only official authenticated RPCs',()=>{
 assert.match(sql,/to_regclass\('public\.love_evening_favorites'\)/i);
 assert.doesNotMatch(sql,/INSERT INTO public\.love_evening_favorites\s*\(/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.draw_for_partner\(uuid,text,boolean\)/);
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
});
