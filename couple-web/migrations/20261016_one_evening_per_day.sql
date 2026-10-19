-- Deployed to Supabase under migration loveroll_one_evening_per_quebec_day_v100.
-- Enforces one session per local Québec day across both partner accounts,
-- without removing existing sessions, reports, or reset audit.
CREATE OR REPLACE FUNCTION public.ensure_couple_session(p_couple uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 id_now uuid; start_user uuid;
 start_week date; today_qc date; limit_week int; already int;
 last_reset timestamptz; weekly_created timestamptz;
 stale_id uuid; already_today int;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF NOT couple_private.is_member(p_couple) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 PERFORM 1 FROM public.couples WHERE id=p_couple FOR UPDATE;
 today_qc:=(now() AT TIME ZONE 'America/Toronto')::date;
 start_week:=today_qc-(extract(isodow from today_qc)::int-1);
 SELECT r.face,r.created_at INTO limit_week,weekly_created
 FROM public.couple_rolls r
 WHERE r.couple_id=p_couple AND r.kind='weekly'
  AND r.key=to_char(start_week,'YYYY-MM-DD');
 IF limit_week IS NULL THEN RAISE EXCEPTION 'Brassez d’abord le dé de la semaine'; END IF;
 SELECT s.id INTO stale_id FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.finished_at IS NULL
  AND s.started_at<weekly_created FOR UPDATE;
 IF stale_id IS NOT NULL THEN
  UPDATE public.couple_sessions SET finished_at=now(),counted=false
  WHERE id=stale_id AND finished_at IS NULL;
 END IF;
 SELECT s.id INTO id_now FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.finished_at IS NULL;
 IF id_now IS NOT NULL THEN RETURN id_now; END IF;
 SELECT max(reset_at) INTO last_reset FROM public.love_all_dice_reset_audit
 WHERE couple_id=p_couple AND week_key=to_char(start_week,'YYYY-MM-DD');
 SELECT count(*) INTO already FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.counted=true
  AND (s.started_at AT TIME ZONE 'America/Toronto')::date>=start_week
  AND (last_reset IS NULL OR s.started_at>=last_reset);
 IF already>=limit_week THEN RAISE EXCEPTION 'Rituel de la semaine déjà complété'; END IF;
 -- Enforce daily limit even after manual closure; old stale sessions from
 -- before the current weekly roll must not disable the new week's session.
 SELECT count(*) INTO already_today FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.started_at>=weekly_created
 AND ((s.started_at AT TIME ZONE 'America/Toronto')::date=today_qc
   OR (s.finished_at IS NOT NULL
    AND (s.finished_at AT TIME ZONE 'America/Toronto')::date=today_qc));
 IF already_today>0 THEN
  RAISE EXCEPTION 'Une seule soirée par jour. Revenez demain (heure du Québec).';
 END IF;
 SELECT m.user_id INTO start_user FROM public.couple_members m
 WHERE m.couple_id=p_couple ORDER BY random() LIMIT 1;
 IF start_user IS NULL OR
  (SELECT count(*) FROM public.couple_members WHERE couple_id=p_couple)<>2
 THEN RAISE EXCEPTION 'Les deux partenaires doivent être connectés'; END IF;
 INSERT INTO public.couple_sessions(couple_id,opened_by,paired_turns,starting_user_id,self_draws)
 VALUES(p_couple,auth.uid(),true,start_user,true) RETURNING id INTO id_now;
 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(p_couple,'session',auth.uid(),'Soirée commencée');
 RETURN id_now;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_couple_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_couple_session(uuid) TO authenticated;
