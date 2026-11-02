-- LR-SURPRISE-001: one real, shared "On l'a fait" per official monthly D100.
-- Two personal appreciations are private to the CURRENT couple members.
-- No automatic external booking, billing, photo storage or new dice roll.
CREATE TABLE IF NOT EXISTS public.love_monthly_completions (
 roll_id uuid PRIMARY KEY REFERENCES public.couple_rolls(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 completed_at timestamptz NOT NULL DEFAULT now(),
 completed_by uuid NOT NULL REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.love_monthly_feedback (
 roll_id uuid NOT NULL REFERENCES public.couple_rolls(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id),
 rating integer CHECK (rating BETWEEN 1 AND 5),
 memory_text text NOT NULL DEFAULT '' CHECK (char_length(memory_text)<=500),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (roll_id, author_id),
 CHECK (rating IS NOT NULL OR char_length(trim(memory_text))>0)
);
ALTER TABLE public.love_monthly_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_monthly_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.love_monthly_completions, public.love_monthly_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.love_monthly_completions, public.love_monthly_feedback TO authenticated;
CREATE POLICY love_monthly_completions_read ON public.love_monthly_completions
 FOR SELECT TO authenticated USING (
  couple_private.is_member(couple_id)
  AND EXISTS(
   SELECT 1 FROM public.couple_members active_member
   WHERE active_member.couple_id=love_monthly_completions.couple_id
    AND active_member.user_id=love_monthly_completions.completed_by
  )
  AND NOT EXISTS(
   SELECT 1 FROM public.couple_members newer_member
   WHERE newer_member.couple_id=love_monthly_completions.couple_id
    AND newer_member.joined_at>love_monthly_completions.completed_at
  )
 );
CREATE POLICY love_monthly_feedback_read ON public.love_monthly_feedback
 FOR SELECT TO authenticated USING (
  couple_private.is_member(couple_id)
  AND EXISTS(
   SELECT 1 FROM public.couple_members active_member
   WHERE active_member.couple_id=love_monthly_feedback.couple_id
     AND active_member.user_id=love_monthly_feedback.author_id
  )
  AND NOT EXISTS(
   SELECT 1 FROM public.couple_members newer_member
   WHERE newer_member.couple_id=love_monthly_feedback.couple_id
    AND newer_member.joined_at>love_monthly_feedback.created_at
  )
 );

CREATE OR REPLACE FUNCTION public.mark_love_monthly_completed(p_roll uuid)
RETURNS public.love_monthly_completions
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_roll public.couple_rolls%rowtype;
 v_result public.love_monthly_completions%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO v_roll FROM public.couple_rolls
  WHERE id=p_roll AND kind='monthly_activity';
 IF NOT FOUND OR NOT couple_private.is_member(v_roll.couple_id) OR
    (SELECT COUNT(*) FROM public.couple_members WHERE couple_id=v_roll.couple_id)<>2 THEN
  RAISE EXCEPTION 'Tirage Surprise inaccessible' USING errcode='42501';
 END IF;
 -- A previous couple's completion cannot be inherited when a member changes.
 IF EXISTS(
  SELECT 1 FROM public.love_monthly_completions old
  WHERE old.roll_id=p_roll AND NOT EXISTS(
   SELECT 1 FROM public.couple_members active_member
   WHERE active_member.couple_id=v_roll.couple_id
    AND active_member.user_id=old.completed_by
  )
  OR EXISTS(
   SELECT 1 FROM public.couple_members newer_member
   WHERE newer_member.couple_id=v_roll.couple_id
    AND newer_member.joined_at>old.completed_at
  )
 ) THEN
  RAISE EXCEPTION 'Ce souvenir appartient à un ancien duo' USING errcode='42501';
 END IF;
 INSERT INTO public.love_monthly_completions(roll_id,couple_id,completed_by)
 VALUES(p_roll,v_roll.couple_id,auth.uid())
 ON CONFLICT (roll_id) DO NOTHING;
 SELECT * INTO v_result FROM public.love_monthly_completions WHERE roll_id=p_roll;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_love_monthly_feedback(
 p_roll uuid,p_rating integer DEFAULT NULL,p_memory text DEFAULT ''
) RETURNS public.love_monthly_feedback
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_roll public.couple_rolls%rowtype;
 v_result public.love_monthly_feedback%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO v_roll FROM public.couple_rolls
  WHERE id=p_roll AND kind='monthly_activity';
 IF NOT FOUND OR NOT couple_private.is_member(v_roll.couple_id) OR
    (SELECT COUNT(*) FROM public.couple_members WHERE couple_id=v_roll.couple_id)<>2 THEN
  RAISE EXCEPTION 'Tirage Surprise inaccessible' USING errcode='42501';
 END IF;
 IF EXISTS(
  SELECT 1 FROM public.love_monthly_completions old
  WHERE old.roll_id=p_roll AND NOT EXISTS(
   SELECT 1 FROM public.couple_members active_member
   WHERE active_member.couple_id=v_roll.couple_id
    AND active_member.user_id=old.completed_by
  )
  OR EXISTS(
   SELECT 1 FROM public.couple_members newer_member
   WHERE newer_member.couple_id=v_roll.couple_id
    AND newer_member.joined_at>old.completed_at
  )
 ) THEN
  RAISE EXCEPTION 'Ce souvenir appartient à un ancien duo' USING errcode='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.love_monthly_completions WHERE roll_id=p_roll) THEN
  RAISE EXCEPTION 'Marquez la sortie réalisée avant de garder un souvenir' USING errcode='22023';
 END IF;
 IF (p_rating IS NULL AND char_length(trim(coalesce(p_memory,'')))=0) OR
    (p_rating IS NOT NULL AND p_rating NOT BETWEEN 1 AND 5) OR
    char_length(coalesce(p_memory,''))>500 THEN
  RAISE EXCEPTION 'Choisissez une appréciation ou écrivez un souvenir (500 caractères max.)' USING errcode='22023';
 END IF;
 INSERT INTO public.love_monthly_feedback(roll_id,couple_id,author_id,rating,memory_text)
 VALUES(p_roll,v_roll.couple_id,auth.uid(),p_rating,coalesce(trim(p_memory),''))
 ON CONFLICT (roll_id,author_id) DO UPDATE
 SET rating=excluded.rating,memory_text=excluded.memory_text,updated_at=now()
 RETURNING * INTO v_result;
 RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_love_monthly_completed(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_love_monthly_feedback(uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_love_monthly_completed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_love_monthly_feedback(uuid,integer,text) TO authenticated;
