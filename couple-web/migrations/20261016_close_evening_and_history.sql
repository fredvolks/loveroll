-- LoveRoll: close an incomplete evening while preserving every draw and its result.
-- History shares only per-user counts; private challenge descriptions stay owner-only.
BEGIN;

CREATE OR REPLACE FUNCTION public.close_love_evening_preserve(p_session uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_couple uuid;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT s.couple_id INTO v_couple FROM public.couple_sessions s
 WHERE s.id=p_session AND s.finished_at IS NULL FOR UPDATE;
 IF v_couple IS NULL OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Soirée inaccessible ou déjà clôturée';
 END IF;
 -- Count the session itself, even if zero or only some challenges were completed.
 -- Never delete, reset or overwrite challenge rows, outcomes, gifts or D6 rolls.
 UPDATE public.couple_sessions
 SET finished_at=now(), counted=true
 WHERE id=p_session;
 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(v_couple,'session',auth.uid(),'Soirée clôturée · résultats conservés');
END;
$fn$;
REVOKE ALL ON FUNCTION public.close_love_evening_preserve(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_love_evening_preserve(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.love_evening_session_stats(p_couple uuid)
RETURNS TABLE (
 session_id uuid, user_id uuid, target integer,
 drawn integer, completed integer, incomplete integer, passed integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès refusé';
 END IF;
 RETURN QUERY
 SELECT s.id, m.user_id,
  CASE WHEN r.face IS NULL THEN NULL::integer
   ELSE greatest(0,r.face::integer+
     (SELECT count(*)::integer FROM public.couple_challenge_gifts g
      WHERE g.session_id=s.id AND g.receiver_user_id=m.user_id)-
     (SELECT count(*)::integer FROM public.couple_challenge_gifts g
      WHERE g.session_id=s.id AND g.donor_user_id=m.user_id))
  END AS target,
  (SELECT count(*)::integer FROM public.couple_challenges q
    WHERE q.session_id=s.id AND q.recipient=m.user_id) AS drawn,
  (SELECT count(*)::integer FROM public.couple_challenges q
    WHERE q.session_id=s.id AND q.recipient=m.user_id AND q.status='completed') AS completed,
  (SELECT count(*)::integer FROM public.couple_challenges q
    WHERE q.session_id=s.id AND q.recipient=m.user_id AND q.status<>'completed') AS incomplete,
  (SELECT count(*)::integer FROM public.couple_challenges q
    WHERE q.session_id=s.id AND q.recipient=m.user_id AND q.status='passed') AS passed
 FROM public.couple_sessions s
 JOIN public.couple_members m ON m.couple_id=s.couple_id
 LEFT JOIN public.couple_personal_rolls r ON r.session_id=s.id AND r.user_id=m.user_id
 WHERE s.couple_id=p_couple
 ORDER BY s.started_at DESC,m.user_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.love_evening_session_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.love_evening_session_stats(uuid) TO authenticated;
COMMIT;
