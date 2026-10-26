-- LR-015, phase 1: return non-completed cards to the eligible draw bag
-- only upon an actual evening closure. Keep challenge occurrences/history immutable.
-- IMPORTANT: this does not yet implement rejected/excluded cards or replacement
-- turns, which must be delivered together with the coordinated client / LR-016.
BEGIN;

CREATE OR REPLACE FUNCTION public.close_love_evening_preserve(p_session uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $close$
DECLARE v_couple uuid; v_closed boolean;
BEGIN
 PERFORM public.love_require_verified_identity();
 -- Read identifier before any lock, then use the same lock order as
 -- draw_for_partner (couple FIRST, session SECOND) to avoid deadlocks.
 SELECT s.couple_id INTO v_couple
 FROM public.couple_sessions s WHERE s.id=p_session;
 IF v_couple IS NULL OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Soirée inaccessible';
 END IF;
 PERFORM 1 FROM public.couples WHERE id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 SELECT s.finished_at IS NOT NULL INTO v_closed
 FROM public.couple_sessions s
 WHERE s.id=p_session AND s.couple_id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Soirée introuvable'; END IF;
 -- Two clients closing the same session may race. The second call is
 -- idempotent: no second history recycle and no duplicate event.
 IF v_closed THEN RETURN; END IF;

 UPDATE public.couple_sessions SET finished_at=now(), counted=true
 WHERE id=p_session AND couple_id=v_couple AND finished_at IS NULL;

 -- Only the draw-bag marks are removed. Never remove/overwrite the
 -- original challenge, its result, passed_at, per-person stats or D6 rolls.
 -- Do NOT restore completed cards within this session.
 DELETE FROM public.love_card_draw_history h
 USING public.couple_challenges q
 WHERE q.session_id=p_session AND q.couple_id=v_couple
   AND q.status<>'completed'
   AND h.couple_id=v_couple
   AND h.recipient_user_id=q.recipient
   AND h.category=q.category AND h.card_id=q.card_id
   AND NOT EXISTS(
    SELECT 1 FROM public.couple_challenges done
    WHERE done.session_id=p_session AND done.couple_id=v_couple
      AND done.recipient=q.recipient AND done.category=q.category
      AND done.card_id=q.card_id AND done.status='completed'
   );

 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(v_couple,'session',auth.uid(),'Soirée clôturée · résultats conservés');
END;
$close$;

REVOKE ALL ON FUNCTION public.close_love_evening_preserve(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.close_love_evening_preserve(uuid)
 TO authenticated;
COMMIT;
