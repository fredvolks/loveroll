import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('./migrations/20261026_lr016_hard_monthly_pass_quota.sql',import.meta.url),'utf8');
const previous=readFileSync(new URL('./migrations/20261018_play_style_and_pass_quota.sql',import.meta.url),'utf8');

test('LR-016 defaults to three, is restricted to integer 0..30, and never alters gift limits',()=>{
 assert.match(sql,/monthly_pass_limit integer NOT NULL DEFAULT 3/i);
 assert.match(sql,/CHECK \(monthly_pass_limit BETWEEN 0 AND 30\)/);
 assert.match(sql,/p_limit IS NULL OR p_limit < 0 OR p_limit > 30/);
 assert.doesNotMatch(sql,/UPDATE public\.couple_challenge_gifts|DELETE FROM public\.couple_challenge_gifts/i);
});

test('LR-016 settings mutation requires the couple owner, verified identity and a server lock',()=>{
 assert.match(sql,/FUNCTION public\.save_couple_monthly_pass_limit\(/);
 assert.match(sql,/PERFORM public\.love_require_verified_identity\(\)/);
 assert.match(sql,/SELECT owner_user_id INTO v_owner[\s\S]*?FOR UPDATE/);
 assert.match(sql,/v_owner IS DISTINCT FROM \(select auth\.uid\(\)\)/);
 assert.match(sql,/NOT couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.save_couple_monthly_pass_limit\(uuid,integer\)\s+TO authenticated/);
});

test('LR-016 hard cap applies to old apps using answer_challenge, before mutating card',()=>{
 const fn=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.answer_challenge('));
 const coupleLock=fn.indexOf('FROM public.couples WHERE id=v_couple FOR UPDATE');
 const challengeLock=fn.indexOf('WHERE id=p_id FOR UPDATE');
 const count=fn.indexOf('SELECT count(*)::integer INTO v_used');
 const guard=fn.indexOf('IF v_used>=v_limit THEN');
 const update=fn.indexOf('UPDATE public.couple_challenges SET status=p_status');
 assert.ok(coupleLock>0&&challengeLock>coupleLock);
 assert.ok(count>challengeLock&&guard>count&&update>guard);
 assert.match(fn,/c\.recipient IS DISTINCT FROM \(select auth\.uid\(\)\)/);
 assert.match(fn,/IF c\.status NOT IN \('proposed','accepted'\)/);
 assert.match(fn,/p_status NOT IN \('accepted','passed','completed'\)/);
 assert.match(fn,/IF p_status='passed' THEN[\s\S]*IF v_used>=v_limit/);
 assert.match(fn,/WHERE h\.couple_id=c\.couple_id AND h\.recipient_user_id=c\.recipient/);
});

test('LR-016 own quota is read-only and resets on Toronto calendar month, preserving history',()=>{
 const month=/to_char\(now\(\) AT TIME ZONE 'America\/Toronto','YYYY-MM'\)/;
 assert.match(sql,month);
 assert.match(sql,/to_char\(q\.passed_at AT TIME ZONE 'America\/Toronto','YYYY-MM'\)=v_month/);
 assert.match(sql,/q\.recipient=\(select auth\.uid\(\)\)/);
 assert.match(sql,/my_love_monthly_pass_quota\(p_couple uuid\)/);
 assert.match(sql,/'remaining',greatest\(v_limit-v_used,0\)/);
 assert.doesNotMatch(sql,/UPDATE public\.couple_challenges SET passed_at|DELETE FROM public\.couple_challenges|UPDATE public\.couple_challenges SET status='completed'/i);
 assert.match(previous,/CREATE OR REPLACE FUNCTION public\.love_calendar_pass_quota/);
 assert.match(previous,/\(chronicle\.sequence<=3\)/); // old month stats intentionally untouched.
});

test('LR-016 explicitly does not claim atomic replacement drawing (still LR-015)',()=>{
 assert.match(sql,/until LR-015 replaces its turn logic/);
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION public\.draw_for_partner/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.answer_challenge\(uuid,text\)/);
});

test('LR-016 client reads authoritative quota and validates owner input',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/rpc\('my_love_monthly_pass_quota',\{p_couple:c\}\)/);
 assert.match(app,/state\.monthlyPassQuota=monthlyPassQuota/);
 assert.match(app,/state\.monthlyPassQuota\.remaining/);
 assert.match(app,/rpc\('save_couple_monthly_pass_limit',\{p_couple:state\.coupleId,p_limit:limit\}\)/);
 assert.match(app,/Number\.isInteger\(limit\)/);
});

test('LR-016 evening pass action respects the exhausted quota',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/Limite mensuelle de passes atteinte/);
 assert.match(app,/state\.monthlyPassQuota\?\.can_pass===false/);
});
