-- Isolated PostgreSQL 17 destructive-security rehearsal. NEVER run against LoveRoll.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_app_meta_data jsonb DEFAULT '{}'::jsonb);
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
ALTER TABLE public.couple_rolls ADD COLUMN kind text;
ALTER TABLE public.love_monthly_reservations ADD COLUMN status text;
ALTER TABLE public.love_eclat_sessions ADD COLUMN id uuid UNIQUE;
-- Minimal read-only fixture dependencies for the OFFICIAL analytics migration.
CREATE TABLE public.love_platform_settings(id integer PRIMARY KEY,updated_by uuid);
CREATE TABLE public.love_world_experiences(face integer);
CREATE TABLE public.love_platform_admin_audit(changed_at timestamptz,patch jsonb);
CREATE TABLE public.love_monthly_places(couple_id uuid,state text);
CREATE FUNCTION public.love_platform_is_admin() RETURNS boolean
LANGUAGE sql STABLE AS 'SELECT true';
CREATE TABLE public.love_referral_credit_usage(beneficiary_user_id uuid);
CREATE TABLE public.love_personal_intimacy(user_id uuid,source_couple_id uuid);
CREATE TABLE public.couple_evening_reviews(session_id uuid,author_id uuid);
CREATE TABLE public.love_eclat_private_notes(session_id uuid,user_id uuid);
-- The migration is the exact file proposed for LoveRoll (not a reimplementation).
\i couple-web/migrations/20261027_love_studio_real_sandbox_foundation.sql
DO $audit_security$
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class
   WHERE oid='public.love_studio_test_audit'::regclass) THEN
  RAISE EXCEPTION 'Private Studio audit does not use RLS';
 END IF;
 IF has_table_privilege('anon','public.love_studio_test_audit','SELECT')
 OR has_table_privilege('authenticated','public.love_studio_test_audit','INSERT')
 OR NOT has_table_privilege('service_role','public.love_studio_test_audit','INSERT')
 THEN
  RAISE EXCEPTION 'Private Studio audit ACL is unsafe';
 END IF;
 IF has_table_privilege('anon','public.love_studio_venice_daily_quota','SELECT')
 OR has_table_privilege('authenticated','public.love_studio_venice_daily_quota','INSERT')
 OR NOT has_table_privilege('service_role','public.love_studio_venice_daily_quota','INSERT')
 THEN
  RAISE EXCEPTION 'Venice inference quota is accessible to a client';
 END IF;
 IF has_table_privilege('anon','public.love_studio_test_pools','SELECT')
 OR has_table_privilege('authenticated','public.love_studio_test_pools','UPDATE')
 OR has_table_privilege('anon','public.love_studio_test_seats','SELECT')
 OR has_table_privilege('authenticated','public.love_studio_test_seats','DELETE')
 OR NOT has_table_privilege('service_role','public.love_studio_test_pools','DELETE')
 THEN
  RAISE EXCEPTION 'Private test identity registry grants are unsafe';
 END IF;
 IF has_function_privilege('anon',
       'public.love_studio_purge_test_couple(uuid)','EXECUTE')
 OR has_function_privilege('authenticated',
       'public.love_studio_purge_test_couple(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role',
       'public.love_studio_purge_test_couple(uuid)','EXECUTE')
 THEN
  RAISE EXCEPTION 'Private purge may be invoked by a customer';
 END IF;
END $audit_security$;
SELECT set_config('studio.test_role','service_role',false);
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-00000000000a'),
 ('00000000-0000-0000-0000-00000000000b'),
 ('00000000-0000-0000-0000-00000000000f'),
 ('00000000-0000-0000-0000-00000000000e');
-- Simulate a failed registry insertion after creating a tagged technical user.
UPDATE auth.users SET raw_app_meta_data='{"love_studio_test":true}'::jsonb
 WHERE id='00000000-0000-0000-0000-00000000000e';
INSERT INTO public.couples(id,owner_user_id) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000f');
INSERT INTO public.love_studio_test_audit(admin_id,action) VALUES
 ('00000000-0000-0000-0000-000000000001','create_requested');
INSERT INTO public.love_studio_test_pools(admin_id,couple_id,state)
VALUES('00000000-0000-0000-0000-000000000001',
'10000000-0000-0000-0000-000000000001','ready');
INSERT INTO public.love_studio_test_seats(admin_id,seat,user_id,synthetic_email) VALUES
('00000000-0000-0000-0000-000000000001','A','00000000-0000-0000-0000-00000000000a','a@example.invalid'),
('00000000-0000-0000-0000-000000000001','B','00000000-0000-0000-0000-00000000000b','b@example.invalid');
INSERT INTO public.couple_members(couple_id,user_id) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b');
-- Run the exact production platform-metrics migration against test+real
-- records. Studio identities and rolls must not inflate customer statistics.
\i couple-web/migrations/20261027_love_studio_exclude_analytics.sql
INSERT INTO public.couple_rolls(couple_id,actor,kind) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','monthly_activity'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000f','monthly_activity');
INSERT INTO public.love_monthly_places VALUES
 ('10000000-0000-0000-0000-000000000001','ready'),
 ('10000000-0000-0000-0000-000000000002','ready');
INSERT INTO public.love_monthly_reservations(couple_id,status) VALUES
 ('10000000-0000-0000-0000-000000000001','confirmed'),
 ('10000000-0000-0000-0000-000000000002','confirmed');
INSERT INTO public.love_monthly_paid_entitlements VALUES
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002');
DO $isolation$
DECLARE metrics jsonb;
BEGIN
 metrics=public.love_platform_admin_read()->'stats';
 IF (metrics->>'registered_users')::integer<>2
 OR (metrics->>'couples')::integer<>0
 OR (metrics->>'monthly_draws')::integer<>1
 OR (metrics->>'geo_ready')::integer<>1
 OR (metrics->>'bookings')::integer<>1
 OR (metrics->>'paid_grants')::integer<>1 THEN
   RAISE EXCEPTION 'Studio identity inflated actual platform metrics: %',metrics;
 END IF;
END $isolation$;
DELETE FROM public.couple_rolls;
DELETE FROM public.love_monthly_places;
DELETE FROM public.love_monthly_reservations;
DELETE FROM public.love_monthly_paid_entitlements;
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
-- Even a corrupted extra membership or ownership must never be
-- cascaded/SET NULL when technical Auth identities are deleted.
INSERT INTO public.couple_members VALUES
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000a');
SELECT public.expect_studio_purge_refused('Identité test utilisée dans un autre couple');
DELETE FROM public.couple_members WHERE
 couple_id='10000000-0000-0000-0000-000000000002';
UPDATE public.couples SET owner_user_id='00000000-0000-0000-0000-00000000000b'
 WHERE id='10000000-0000-0000-0000-000000000002';
SELECT public.expect_studio_purge_refused('Identité test utilisée dans un autre couple');
UPDATE public.couples SET owner_user_id='00000000-0000-0000-0000-00000000000f'
 WHERE id='10000000-0000-0000-0000-000000000002';
-- Foreign member, last-moment leaked roll, payment, Venice author and trial.
INSERT INTO public.couple_members VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000f');
SELECT public.expect_studio_purge_refused('Membre réel détecté');
DELETE FROM public.couple_members WHERE user_id='00000000-0000-0000-0000-00000000000f';
INSERT INTO public.couple_rolls(couple_id,actor) VALUES
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
-- Credit redemption backed by a provider reference: never cascade it.
INSERT INTO public.love_referral_credit_usage VALUES
 ('00000000-0000-0000-0000-00000000000a');
SELECT public.expect_studio_purge_refused('Crédit payé lié au banc');
DELETE FROM public.love_referral_credit_usage;
-- Personal journal from a foreign couple must remain untouched.
INSERT INTO public.love_personal_intimacy VALUES
 ('00000000-0000-0000-0000-00000000000b',
  '10000000-0000-0000-0000-000000000002');
SELECT public.expect_studio_purge_refused('Historique personnel extérieur au banc');
DELETE FROM public.love_personal_intimacy;
INSERT INTO public.couple_sessions(id,couple_id) VALUES
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
INSERT INTO public.couple_evening_reviews VALUES
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000a');
SELECT public.expect_studio_purge_refused('Historique personnel extérieur au banc');
DELETE FROM public.couple_evening_reviews;
DELETE FROM public.couple_sessions WHERE id='20000000-0000-0000-0000-000000000002';
INSERT INTO public.love_eclat_sessions(couple_id,started_by,id) VALUES
 ('10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000002');
INSERT INTO public.love_eclat_private_notes VALUES
 ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b');
SELECT public.expect_studio_purge_refused('Historique personnel extérieur au banc');
DELETE FROM public.love_eclat_private_notes;
DELETE FROM public.love_eclat_sessions WHERE id='30000000-0000-0000-0000-000000000002';
-- The cost guard is unique per admin across ANY number of disposable pairs.
INSERT INTO public.love_studio_venice_daily_quota(admin_id,couple_id,utc_day) VALUES
 ('00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001','2026-10-28');
DO $quota$
BEGIN
 BEGIN
  INSERT INTO public.love_studio_venice_daily_quota(admin_id,couple_id,utc_day) VALUES
   ('00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002','2026-10-28');
  RAISE EXCEPTION 'QUOTA_SHOULD_HAVE_FAILED';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $quota$;
-- Registered users' legitimate game data is purged, not fabricated or skipped.
INSERT INTO public.couple_rolls(couple_id,actor) VALUES
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
 IF (SELECT count(*) FROM public.love_studio_test_audit
     WHERE action='create_requested')<>1 THEN
  RAISE EXCEPTION 'Private audit must remain after the synthetic couple is purged';
 END IF;
 IF (SELECT count(*) FROM public.love_studio_venice_daily_quota)<>1 THEN
  RAISE EXCEPTION 'Resetting the A/B pair must not reset paid Venice quota';
 END IF;
END $assert$;
SELECT 'LoveRoll Studio isolated PostgreSQL purge: ALL SECURITY ASSERTIONS PASSED' AS result;
