-- The first D6 MUST reveal its persisted result as soon as its owner rolls.
-- Previously the RPC explicitly replaced the saved face with NULL until the
-- second partner rolled. The 3D renderer then defaulted NULL to a fake 1.
-- RLS remains limited to verified authenticated members of the couple.
BEGIN;
CREATE OR REPLACE FUNCTION public.roll_my_evening_d6(p_session uuid)
RETURNS public.couple_personal_rolls
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE s public.couple_sessions%rowtype;
        r public.couple_personal_rolls%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO s FROM public.couple_sessions
 WHERE id=p_session AND finished_at IS NULL;
 IF NOT FOUND OR NOT couple_private.is_member(s.couple_id) THEN
   RAISE EXCEPTION 'Soirée inaccessible';
 END IF;
 PERFORM 1 FROM public.couple_sessions WHERE id=p_session FOR UPDATE;
 SELECT * INTO r FROM public.couple_personal_rolls
  WHERE session_id=p_session AND user_id=auth.uid();
 IF NOT FOUND THEN
  INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
   VALUES(p_session,auth.uid(),floor(random()*6)::integer+1) RETURNING * INTO r;
  INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
   VALUES(s.couple_id,'roll',auth.uid(),'D6 personnel lancé');
 END IF;
 -- IMPORTANT: return the real saved face immediately, never NULL or a fake 1.
 -- A second invocation returns the same record and DOES NOT reroll.
 RETURN r;
END;
$function$;

-- Before both roll, only the owner sees their saved result.
-- After both roll, each verified couple member can read BOTH official faces.
DROP POLICY IF EXISTS personal_rolls_read ON public.couple_personal_rolls;
CREATE POLICY personal_rolls_read
ON public.couple_personal_rolls
FOR SELECT TO authenticated
USING (
 EXISTS (
  SELECT 1 FROM public.couple_sessions s
  WHERE s.id=couple_personal_rolls.session_id
    AND couple_private.is_member(s.couple_id)
 )
 AND (
   user_id=auth.uid()
   OR couple_private.both_rolls_ready(session_id)
 )
);
-- Existing restrictive email-verification policy still applies.
COMMIT;
