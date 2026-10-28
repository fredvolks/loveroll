// LR-017: immutable original card, member-only consent and no unauthorized roll.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./migrations/20261028_lr017_consensual_adaptation.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const sync=readFileSync(new URL('./couple-live-sync.mjs',import.meta.url),'utf8');

test('proposal table is private, scoped to one challenge and one session',()=>{
 assert.match(sql,/challenge_id uuid PRIMARY KEY REFERENCES public\.couple_challenges\(id\)/);
 assert.match(sql,/session_id uuid NOT NULL REFERENCES public\.couple_sessions\(id\)/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/couple_private\.is_member\(couple_id\)/);
 assert.match(sql,/REVOKE ALL ON public\.love_challenge_adaptations FROM public,anon,authenticated/);
 assert.match(sql,/GRANT SELECT ON public\.love_challenge_adaptations TO authenticated/);
 assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE) ON public\.love_challenge_adaptations TO authenticated/);
});
test('server serializes proposal and requires verified couple member and active challenge',()=>{
 const fn=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_propose('),
  sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 const first=fn.indexOf('FROM public.couples WHERE id=v_couple FOR UPDATE');
 const second=fn.indexOf('WHERE id=p_challenge AND couple_id=v_couple FOR UPDATE');
 assert.ok(first>=0&&second>first,'couple lock precedes challenge lock');
 assert.match(fn,/PERFORM public\.love_require_verified_identity\(\)/);
 assert.match(fn,/couple_private\.is_member\(v_couple\)/);
 assert.match(fn,/v_session\.finished_at IS NOT NULL/);
 assert.match(fn,/v_actor IN \(v_q\.offered_by,v_q\.recipient\)/);
 assert.match(fn,/v_old\.proposed_by=v_actor/);
 assert.match(fn,/status NOT IN \('proposed','accepted'\)/);
 assert.match(fn,/p_minutes IS NOT NULL AND v_q\.status<>'proposed'/);
});
test('only the OTHER partner can approve, and a running timer cannot change',()=>{
 const fn=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 assert.match(fn,/v_actor=v_adaptation\.proposed_by/);
 assert.match(fn,/v_adaptation\.status<>'pending'/);
 assert.match(fn,/v_adaptation\.proposed_minutes IS NOT NULL AND v_q\.status<>'proposed'/);
 assert.match(fn,/p_accept IS NULL/);
 assert.match(fn,/REVOKE ALL ON FUNCTION public\.love_adaptation_respond\(uuid,boolean\)/);
 assert.match(fn,/GRANT EXECUTE ON FUNCTION public\.love_adaptation_respond\(uuid,boolean\) TO authenticated/);
 assert.doesNotMatch(fn,/UPDATE public\.couple_challenges|INSERT INTO public\.couple_rolls|INSERT INTO public\.couple_sessions|love_respond_and_redraw\(/i);
});
test('client can safely run against old servers; two devices refresh without modifying dice',()=>{
 assert.match(app,/query\('love_challenge_adaptations',\{eq:\{couple_id:c\}\}\)\.catch\(\(\)=>null\)/);
 assert.match(app,/rpc\('love_adaptation_propose'/);
 assert.match(app,/rpc\('love_adaptation_respond'/);
 assert.match(app,/acceptedAdaptationText/);
 assert.match(app,/acceptedAdaptationMinutes/);
 assert.match(app,/data-action/);
 assert.match(sync,/query\('love_challenge_adaptations'/);
 assert.match(sync,/state\.adaptOpen/);
});
