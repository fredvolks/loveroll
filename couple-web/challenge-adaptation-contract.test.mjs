// LR-017: immutable original card, member-only consent and no unauthorized roll.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./migrations/20261028_lr017_consensual_adaptation.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const sync=readFileSync(new URL('./couple-live-sync.mjs',import.meta.url),'utf8');

test('proposal table is private, scoped to one challenge and one session',()=>{
 assert.match(sql,/challenge_id uuid PRIMARY KEY REFERENCES public\.couple_challenges\(id\)/);
 assert.match(sql,/original_text text/);
 assert.match(sql,/original_minutes integer/);
 assert.match(sql,/consent_partner_id uuid NOT NULL REFERENCES auth\.users\(id\)/);
 assert.match(sql,/auth\.uid\(\) IN \(p_proposed_by,p_consent_partner\)/);
 assert.match(sql,/v_q\.card_description,v_q\.card_timer_minutes/);
 assert.match(sql,/session_id uuid NOT NULL REFERENCES public\.couple_sessions\(id\)/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/AND public\.love_verified_identity\(\)/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.love_adaptation_pair_allowed\(/);
 assert.match(sql,/USING \(public\.love_adaptation_pair_allowed\(challenge_id,couple_id,session_id,proposed_by,consent_partner_id\)\)/);
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
 assert.match(fn,/consent_partner_id,proposed_text,proposed_minutes/);
 assert.match(fn,/v_partner,v_text,p_minutes/);
 assert.match(fn,/status NOT IN \('proposed','accepted'\)/);
 assert.match(fn,/p_minutes IS NOT NULL AND v_q\.status<>'proposed'/);
});
test('only the OTHER partner can approve, and a running timer cannot change',()=>{
 const fn=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 assert.match(fn,/v_actor=v_adaptation\.proposed_by/);
 assert.match(fn,/v_actor IS DISTINCT FROM v_adaptation\.consent_partner_id/);
 assert.match(fn,/v_adaptation\.status<>'pending'/);
 assert.match(fn,/v_adaptation\.proposed_minutes IS NOT NULL AND v_q\.status<>'proposed'/);
 assert.match(fn,/p_accept IS NULL/);
 assert.match(fn,/REVOKE ALL ON FUNCTION public\.love_adaptation_respond\(uuid,boolean\)/);
 assert.match(fn,/GRANT EXECUTE ON FUNCTION public\.love_adaptation_respond\(uuid,boolean\) TO authenticated/);
 assert.doesNotMatch(fn,/UPDATE public\.couple_challenges|INSERT INTO public\.couple_rolls|INSERT INTO public\.couple_sessions|love_respond_and_redraw\(/i);
});
test('response serializes a concurrent evening close before recording consent',()=>{
 const fn=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 const couple=fn.indexOf('FROM public.couples WHERE id=v_couple FOR UPDATE');
 const challenge=fn.indexOf('WHERE id=p_challenge AND couple_id=v_couple FOR UPDATE');
 const session=fn.indexOf('WHERE id=v_q.session_id AND couple_id=v_couple AND finished_at IS NULL FOR UPDATE');
 const adaptation=fn.indexOf('WHERE challenge_id=p_challenge AND couple_id=v_couple FOR UPDATE');
 const mutation=fn.indexOf('UPDATE public.love_challenge_adaptations');
 assert.ok(couple>=0&&challenge>couple&&session>challenge&&adaptation>session&&mutation>adaptation,
  'Lock order must remain couple -> challenge -> active session -> adaptation before consent');
 assert.match(fn,/IF NOT FOUND THEN RAISE EXCEPTION 'Cette soirée est clôturée'; END IF/);
});

test('client can safely run against old servers; two devices refresh without modifying dice',()=>{
 assert.match(app,/query\('love_challenge_adaptations',\{eq:\{couple_id:c\}\}\)\.catch\(\(\)=>null\)/);
 assert.match(app,/rpc\('love_adaptation_propose'/);
 assert.match(app,/rpc\('love_adaptation_respond'/);
 assert.match(app,/acceptedAdaptationText/);
 assert.match(app,/acceptedAdaptationMinutes/);
 assert.match(app,/state\.adaptations!==null\?adaptationPanelHtml\(/);
 assert.match(app,/data-action/);
 assert.match(sync,/query\('love_challenge_adaptations'/);
 assert.match(sync,/state\.adaptOpen/);
});

test('LR-002 timer deadline cannot auto-complete after an agreed changed duration',()=>{
 assert.match(app,/function resetStaleAdaptationTimer\(challengeId,saved=undefined\)/);
 assert.match(app,/adaptedTimerDurationMs\(row\)/);
 assert.match(app,/needsAdaptedTimerReset\(row,stored\.durationMs\)/);
 assert.match(app,/writeSavedChallengeTimer\(key,fresh\)/);
 assert.match(app,/autoCompletePending:false/);
 assert.match(app,/if\(resetStaleAdaptationTimer\(id\)\)return; \/\/ Old expiry/);
 assert.match(app,/if\(resetStaleAdaptationTimer\(item\.id,saved\)\)continue;/);
 assert.match(app,/function endSignal\(\)\{\s*if\(resetStaleAdaptationTimer\(challengeTimer\.id\)\)return;/);
 assert.match(app,/function activeTimer\(challenge,minutes\)\{\s*resetStaleAdaptationTimer\(challenge\.id\);/);
 assert.match(app,/function updateChallengeClock\(\)[\s\S]*?if\(resetStaleAdaptationTimer\(challengeTimer\.id\)\)return;/);
});


test('LR-017 PostgreSQL A/B fixture always uses complete dollar-quoted DO blocks',()=>{
 const acceptance=readFileSync(new URL('./qa/lr017-acceptance.sql',import.meta.url),'utf8');
 const open=acceptance.match(/^DO \$\$$/gm)||[];
 const close=acceptance.match(/^END \$\$;$/gm)||[];
 assert.ok(open.length>=4,'all synthetic partners and closed-evening flows must be exercised');
 assert.equal(close.length,open.length,'every SQL anonymous block must close correctly');
 assert.doesNotMatch(acceptance,/^(?:DO \$|END \$;)$/m,
  'single-dollar anonymous blocks are invalid PostgreSQL and disable A/B acceptance tests');
 assert.match(acceptance,/Cette soirée est clôturée/);
 assert.match(acceptance,/Replacement partner can read prior private proposal/);
});

test('LR-017 preserves optional consent on self-draw without showing another private card',()=>{
 const fixture=readFileSync(new URL('./qa/lr017-fixture.sql',import.meta.url),'utf8');
 const qa=readFileSync(new URL('./qa/lr017-acceptance.sql',import.meta.url),'utf8');
 const pair=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_pair_allowed('),
  sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_propose('));
 const respond=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 assert.match(pair,/q\.offered_by=q\.recipient AND EXISTS\(/);
 assert.match(pair,/actual\.self_draws=true/);
 assert.match(respond,/v_q\.offered_by=v_q\.recipient AND EXISTS\(/);
 assert.match(respond,/v_actor=v_adaptation\.proposed_by/); // Never approve your own proposal.
 assert.match(fixture,/self_draws boolean NOT NULL DEFAULT false/);
 assert.match(qa,/Partner accessed private self-drawn card/);
 assert.match(qa,/Second partner cannot approve self-drawn adaptation/);
 assert.match(qa,/Adaptation approval revealed private self-drawn challenge/);
 assert.match(qa,/Replacement partner read self-drawn adaptation/);
 assert.match(qa,/Replacement partner approved self-drawn adaptation/);
});

test('LR-017 adaptation never consumes monthly passes or alters official card outcomes',()=>{
 const proposal=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_propose('),
  sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 const answer=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.love_adaptation_respond('));
 for(const fn of [proposal,answer]){
  assert.doesNotMatch(fn,/UPDATE\s+public\.couple_challenges|INSERT\s+INTO\s+public\.couple_challenges/i);
  assert.doesNotMatch(fn,/love_respond_and_redraw\s*\(|answer_challenge\s*\(/i);
  assert.doesNotMatch(fn,/monthly_pass_limit|my_love_monthly_pass_quota|passed_at\s*=/i);
  assert.doesNotMatch(fn,/INSERT\s+INTO\s+public\.couple_sessions|INSERT\s+INTO\s+public\.couple_rolls/i);
 }
});
