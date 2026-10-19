-- LoveRoll email verification enforced at BOTH RLS and SECURITY DEFINER RPC boundaries.
-- Existing user rows and policies preserved; no data is deleted.
CREATE OR REPLACE FUNCTION public.love_verified_identity()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $guard$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM auth.users
  WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL
 );
$guard$;
REVOKE ALL ON FUNCTION public.love_verified_identity() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.love_verified_identity() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.love_require_verified_identity()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
 IF NOT public.love_verified_identity() THEN
  RAISE EXCEPTION 'Confirmez votre adresse courriel avant d’utiliser LoveRoll.'
   USING ERRCODE='28000';
 END IF;
END;
$guard$;
REVOKE ALL ON FUNCTION public.love_require_verified_identity() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.love_require_verified_identity() TO authenticated,service_role;

-- Security-definer RPCs would bypass RLS; inject one consistent entry guard.
DO $migration$
DECLARE f record; ddl text; revised text; updated integer:=0;
BEGIN
 FOR f IN
  SELECT p.oid,p.proname FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_language lang ON lang.oid=p.prolang
  WHERE n.nspname='public' AND lang.lanname='plpgsql'
   AND p.proname IN ('add_my_love_event','answer_challenge','complete_love_registration','create_love_match','create_my_couple','create_pair_invite','cancel_pair_invite','delete_love_custom_card','draw_for_partner','end_love_match','ensure_couple_session','finish_couple_session','get_love_guidance','give_love_challenge','import_love_advent_2026','import_love_evening_library','import_love_monthly_library','import_love_special_events','mark_pair_invite_sent','my_love_roll_status','my_love_special_event_keys','open_advent_day','reset_love_monthly_activity','reset_love_weekly_roll_admin','roll_couple_once','roll_love_occasion_once','roll_my_evening_d6','save_love_card_with_roles','save_love_custom_card','save_love_monthly_activity','save_love_monthly_activity_with_timer','save_my_profile','save_my_wellbeing','set_love_celebrant','set_love_draw_rule','set_love_occasion_date','set_love_relationship_date','love_push_test_me')
 LOOP
  ddl:=pg_get_functiondef(f.oid);
  IF position('public.love_require_verified_identity()' in ddl)>0 THEN CONTINUE; END IF;
  revised:=regexp_replace(ddl,E'\\nbegin[[:space:]]*\\n',
   E'\nBEGIN\n PERFORM public.love_require_verified_identity();\n','i');
  IF revised=ddl THEN RAISE EXCEPTION 'Could not protect RPC %',f.proname; END IF;
  EXECUTE revised;
  updated:=updated+1;
 END LOOP;
 IF updated<38 THEN RAISE EXCEPTION 'Expected >= 38 protected RPCs; only %',updated; END IF;
END;
$migration$;

DO $policies$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['couple_advent','couple_challenge_gifts','couple_challenges','couple_events','couple_feedback','couple_intimacy','couple_invitations','couple_members','couple_occasion_rolls','couple_occasion_settings','couple_personal_rolls','couple_profiles','couple_rolls','couple_sessions','couples','love_advent_2026_config','love_advent_2026_days','love_card_draw_history','love_custom_challenges','love_monthly_activity_overrides','love_personal_intimacy','love_push_outbox','love_push_preferences','love_push_subscriptions','love_special_event_catalogue','love_special_modifier_snapshots','love_user_library_backup','love_weekly_reset_audit','love_wellbeing']
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS loveroll_confirmed_email_required ON public.%I',t);
  EXECUTE format('CREATE POLICY loveroll_confirmed_email_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.love_verified_identity())) WITH CHECK ((SELECT public.love_verified_identity()))',t);
 END LOOP;
END;
$policies$;
