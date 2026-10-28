import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const helper=read('./migrations/20261028_lr026_variety_helper.sql');
const draw=read('./migrations/20261028_lr026_variety_draws.sql');

test('LR-026 scoring is private, deterministic, and uses no paid AI or user data',()=>{
 assert.match(helper,/FUNCTION couple_private\.love_variety_penalty/);
 assert.match(helper,/IMMUTABLE SET search_path=''/);
 assert.match(helper,/REVOKE ALL[\s\S]*FROM PUBLIC,anon,authenticated/);
 assert.match(helper,/WHEN common_words>=2 THEN 30/);
 assert.match(helper,/a_theme<>'other' AND a_theme=b_theme/);
 assert.doesNotMatch(helper,/http|venice\.ai|openai\.com|INSERT INTO public\./i);
});
test('LR-026 refuses to overwrite server rules that changed since the reviewed snapshot',()=>{
 assert.match(draw,/md5\(pg_get_functiondef\('public\.draw_for_partner\(uuid,text,boolean\)'::regprocedure::oid\)\)/);
 assert.match(draw,/md5\(pg_get_functiondef\('public\.love_respond_and_redraw\(uuid,text,boolean\)'::regprocedure::oid\)\)/);
 assert.match(draw,/RAISE EXCEPTION 'LR-026 migrations need rebase/);
});
test('The same eligible bag is kept, ranked after mandatory filters, with random fallback',()=>{
 assert.match(draw,/not couple_private\.love_role_allows/);
 assert.match(draw,/love_cycle_excluded_cards/);
 assert.match(draw,/love_card_draw_history/);
 assert.match(draw,/love_variety_penalty\([\s\S]*?v_previous_title,v_previous_description\) end,\s*random\(\) limit 1/);
 assert.match(draw,/love_variety_penalty\([\s\S]*?v_previous_title,v_previous_description\) END,\s*random\(\) LIMIT 1/);
 assert.doesNotMatch(draw,/DELETE FROM public\.love_base_challenges|UPDATE public\.love_base_challenges/);
});
test('Official D100 face, no extra draw, A/B locks and refusal quota all preserved',()=>{
 assert.match(draw,/d100:=floor\(random\(\)\*100\)::integer\+1/);
 assert.match(draw,/SELECT possible\.face INTO v_face[\s\S]*?ORDER BY random\(\) LIMIT 1/);
 assert.match(draw,/FOR UPDATE/);
 assert.match(draw,/IF v_used>=v_limit/);
 assert.match(draw,/PERFORM public\.love_require_verified_identity\(\)/);
 assert.match(draw,/v_prior public\.love_challenge_redraws%rowtype/);
 assert.match(draw,/WHERE r\.origin_id=p_challenge/);
});
