-- Isolated PostgreSQL 17 destructive-security rehearsal. NEVER run against LoveRoll.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
 SELECT current_setting('studio.test_role',true)
$$;
CREATE TABLE public.couples(id uuid PRIMARY KEY,owner_user_id uuid);
CREATE TABLE public.couple_members(
 couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,user_id uuid);
CREATE TABLE public.couple_rolls(
 couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,actor uuid);
CREATE TABLE public.couple_sessions(
 id uuid PRIMARY KEY,couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,
 opened_by uuid,starting_user_id uuid);
CREATE TABLE public.couple_challenges(
 couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,
 offered_by uuid,recipient uuid);
CREATE TABLE public.couple_personal_rolls(session_id uuid,user_id uuid);
CREATE TABLE public.love_user_library_backup(
 source_couple_id uuid REFERENCES public.couples(id),user_id uuid);
CREATE TABLE public.love_trial_identity_claims(
 first_trial_couple_id uuid REFERENCES public.couples(id) ON DELETE RESTRICT,user_id uuid);
CREATE TABLE public.love_couple_free_trials(
 couple_id uuid REFERENCES public.couples(id) ON DELETE RESTRICT,
 first_user_id uuid,second_user_id uuid);
CREATE TABLE public.love_referral_links(couple_id uuid,user_id uuid);
CREATE TABLE public.love_referral_credit_ledger(
 beneficiary_couple_id uuid,claim_couple_id uuid,beneficiary_user_id uuid);
CREATE TABLE public.love_referral_claims(
 referrer_couple_id uuid,referred_couple_id uuid,
 referrer_user_id uuid,referred_owner_id uuid);
CREATE TABLE public.love_monthly_paid_entitlements(
 couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE);
CREATE TABLE public.love_annual_discount_settlements(
 couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE);
CREATE TABLE public.love_promo_redemptions(
 couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE);
-- Build only the explicit, previously read-only-verified public column pairs
-- required by the SQL preflight's dynamic table+actor checks.
DO $fixture$
DECLARE row record;
BEGIN
 FOR row IN
 SELECT name,string_agg(format('%I uuid',actor),',') AS columns
 FROM (VALUES
  ('couple_advent','opened_by'),('couple_advent','performed_by'),
  ('couple_challenge_gifts','donor_user_id'),
  ('couple_challenge_gifts','receiver_user_id'),
  ('couple_events','actor_id'),('couple_feedback','author_id'),
  ('couple_intimacy','author_id'),('couple_invitations','created_by'),
  ('couple_occasion_rolls','actor'),
  ('love_all_dice_reset_audit','actor_id'),
  ('love_card_draw_history','recipient_user_id'),
  ('love_challenge_redraws','actor_id'),
  ('love_cycle_excluded_cards','excluded_by'),
  ('love_custom_challenges','drawer_user_id'),
  ('love_custom_challenges','recipient_user_id'),
  ('love_cycle_responses','user_id'),
  ('love_eclat_sessions','started_by'),
  ('love_monthly_reservations','host_user_id'),
  ('love_personal_sexual_cards','drawer_user_id'),
  ('love_personal_sexual_cards','recipient_user_id'),
  ('love_venice_preview_trials','requested_by'),
  ('love_weekly_reset_audit','actor_id')
 ) AS t(name,actor) GROUP BY name
 LOOP
  EXECUTE format('CREATE TABLE public.%I(couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,%s)',
   row.name,row.columns);
 END LOOP;
END $fixture$;
-- The migration is the exact file proposed for LoveRoll (not a reimplementation).
\i couple-web/migrations/20261027_love_studio_real_sandbox_foundation.sql
SELECT set_config('studio.test_role','service_role',false);
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-00000000000a'),
 ('00000000-0000-0000-0000-00000000000b'),
 ('00000000-0000-0000-0000-00000000000f');
INSERT INTO public.couples(id,owner_user_id) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000f');
INSERT INTO public.love_studio_test_pools(admin_id,couple_id,state)
VALUES('00000000-0000-0000-0000-000000000001',
'10000000-0000-0000-0000-000000000001','ready');
INSERT INTO public.love_studio_test_seats(admin_id,seat,user_id,synthetic_email) VALUES
('00000000-0000-0000-0000-000000000001','A','00000000-0000-0000-0000-00000000000a','a@example.invalid'),
('00000000-0000-0000-0000-000000000001','B','00000000-0000-0000-0000-00000000000b','b@example.invalid');
INSERT INTO public.couple_members(couple_id,user_id) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b');
CREATE FUNCTION public.expect_studio_purge_refused(expected text) RETURNS void
LANGUAGE plpgsql AS $expect$
DECLARE detail text;
BEGIN
 BEGIN
  PERFORM 1 FROM public.love_studio_purge_test_couple(
   '00000000-0000-0000-0000-000000000001');
  RAISE EXCEPTION 'PURGE_SHOULD_HAVE_FAILED';
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS detail=MESSAGE_TEXT;
  IF detail='PURGE_SHOULD_HAVE_FAILED' OR position(expected in detail)=0 THEN
   RAISE EXCEPTION 'Unsafe purge accepted or wrong rejection: %',detail;
  END IF;
 END;
 IF NOT EXISTS(SELECT 1 FROM public.couples
  WHERE id='10000000-0000-0000-0000-000000000001') THEN
  RAISE EXCEPTION 'Guard mutated the couple before rejecting';
 END IF;
END $expect$;
-- The privileged function must reject non-service callers.
SELECT set_config('studio.test_role','authenticated',false);
SELECT public.expect_studio_purge_refused('Accès refusé');
SELECT set_config('studio.test_role','service_role',false);
-- Corrupted pool pointing to real owner: even a zero-member target is safe.
UPDATE public.couples SET owner_user_id='00000000-0000-0000-0000-00000000000f'
WHERE id='10000000-0000-0000-0000-000000000001';
SELECT public.expect_studio_purge_refused('Propriétaire ou duo test non vérifié');
UPDATE public.couples SET owner_user_id='00000000-0000-0000-0000-00000000000a'
WHERE id='10000000-0000-0000-0000-000000000001';
-- Foreign member, last-moment leaked roll, payment, Venice author and trial.
INSERT INTO public.couple_members VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000f');
SELECT public.expect_studio_purge_refused('Membre réel détecté');
DELETE FROM public.couple_members WHERE user_id='00000000-0000-0000-0000-00000000000f';
INSERT INTO public.couple_rolls VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000f');
SELECT public.expect_studio_purge_refused('utilisateur réel');
DELETE FROM public.couple_rolls;
INSERT INTO public.love_monthly_paid_entitlements VALUES
 ('10000000-0000-0000-0000-000000000001');
SELECT public.expect_studio_purge_refused('Écriture financière détectée');
DELETE FROM public.love_monthly_paid_entitlements;
INSERT INTO public.love_venice_preview_trials VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000f');
SELECT public.expect_studio_purge_refused('Auteur externe');
DELETE FROM public.love_venice_preview_trials;
INSERT INTO public.love_couple_free_trials VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000f',null);
SELECT public.expect_studio_purge_refused('Essai lié à un utilisateur réel');
DELETE FROM public.love_couple_free_trials;
-- Registered users' legitimate game data is purged, not fabricated or skipped.
INSERT INTO public.couple_rolls VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a');
INSERT INTO public.couple_challenges VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a',
 '00000000-0000-0000-0000-00000000000b');
CREATE TEMP TABLE result AS
 SELECT * FROM public.love_studio_purge_test_couple('00000000-0000-0000-0000-000000000001');
DO $assert$
BEGIN
 IF (SELECT count(*) FROM result)<>2 THEN
  RAISE EXCEPTION 'Registered A and B not returned for Auth cleanup';
 END IF;
 IF EXISTS(SELECT 1 FROM public.couples WHERE id='10000000-0000-0000-0000-000000000001')
 OR EXISTS(SELECT 1 FROM public.couple_rolls)
 OR EXISTS(SELECT 1 FROM public.couple_challenges) THEN
  RAISE EXCEPTION 'Synthetic couple or real game rows were not purged';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.couples WHERE id='10000000-0000-0000-0000-000000000002') THEN
  RAISE EXCEPTION 'Unrelated customer couple was damaged';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.love_studio_test_pools
  WHERE state='deleting' AND couple_id IS NULL) THEN
  RAISE EXCEPTION 'Auth cleanup recovery registry was not retained';
 END IF;
END $assert$;
SELECT 'LoveRoll Studio isolated PostgreSQL purge: ALL SECURITY ASSERTIONS PASSED' AS result;
