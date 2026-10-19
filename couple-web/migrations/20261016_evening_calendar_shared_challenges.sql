-- LoveRoll: both authenticated partners can consult the names and outcomes
-- of the challenges drawn on every day of their OWN couple's calendar.
-- Keep couple_challenges SELECT RLS recipient-only for the main game;
-- do not expose challenge descriptions, preferences, or journal entries.
BEGIN;
CREATE OR REPLACE FUNCTION public.love_evening_calendar_challenges(p_couple uuid)
RETURNS TABLE(
 id uuid,
 session_id uuid,
 recipient uuid,
 category text,
 face smallint,
 card_id smallint,
 card_title text,
 status text,
 created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR NOT couple_private.is_member(p_couple) THEN
   RAISE EXCEPTION 'Accès refusé';
 END IF;
 RETURN QUERY
 SELECT q.id,q.session_id,q.recipient,q.category,q.face,q.card_id,
        q.card_title,q.status,q.created_at
 FROM public.couple_challenges q
 JOIN public.couple_sessions s ON s.id=q.session_id
 WHERE s.couple_id=p_couple AND q.couple_id=p_couple
 ORDER BY s.started_at DESC,q.created_at ASC,q.id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.love_evening_calendar_challenges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.love_evening_calendar_challenges(uuid) TO authenticated;
COMMIT;
