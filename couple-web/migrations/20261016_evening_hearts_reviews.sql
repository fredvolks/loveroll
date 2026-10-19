-- Each verified partner writes their OWN evening feedback; both members of
-- the currently linked couple can see the results in their shared calendar.
-- Older encrypted couple_feedback records are preserved, untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS public.couple_evening_reviews (
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 overall smallint NOT NULL CHECK(overall BETWEEN 1 AND 5),
 connection smallint NOT NULL CHECK(connection BETWEEN 1 AND 5),
 appreciation smallint NOT NULL CHECK(appreciation BETWEEN 1 AND 5),
 again smallint NOT NULL CHECK(again BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '' CHECK(char_length(comment)<=500),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(session_id,author_id)
);
CREATE INDEX IF NOT EXISTS couple_evening_reviews_author_idx
 ON public.couple_evening_reviews(author_id,submitted_at DESC);
ALTER TABLE public.couple_evening_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.couple_evening_reviews FROM PUBLIC, anon, authenticated;
-- Only the member-authorized RPCs below access this table.
CREATE OR REPLACE FUNCTION public.save_love_evening_review(
 p_session uuid,p_overall integer,p_connection integer,
 p_appreciation integer,p_again integer,p_comment text DEFAULT ''
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_couple uuid;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT s.couple_id INTO v_couple FROM public.couple_sessions s
 WHERE s.id=p_session AND s.finished_at IS NOT NULL AND s.counted IS TRUE;
 IF v_couple IS NULL OR NOT couple_private.is_member(v_couple)
  OR NOT EXISTS(SELECT 1 FROM public.couple_members m
   WHERE m.couple_id=v_couple AND m.user_id=auth.uid()) THEN
   RAISE EXCEPTION 'Bilan réservé aux membres de cette soirée clôturée';
 END IF;
 IF p_overall NOT BETWEEN 1 AND 5 OR p_connection NOT BETWEEN 1 AND 5
   OR p_appreciation NOT BETWEEN 1 AND 5 OR p_again NOT BETWEEN 1 AND 5
   OR char_length(coalesce(p_comment,''))>500 THEN
  RAISE EXCEPTION 'Chaque note doit être de 1 à 5 cœurs, commentaire 500 caractères maximum';
 END IF;
 INSERT INTO public.couple_evening_reviews(
  session_id,author_id,overall,connection,appreciation,again,comment,submitted_at)
 VALUES(p_session,auth.uid(),p_overall,p_connection,p_appreciation,p_again,
  coalesce(p_comment,''),now())
 ON CONFLICT (session_id,author_id) DO UPDATE
 SET overall=EXCLUDED.overall,connection=EXCLUDED.connection,
     appreciation=EXCLUDED.appreciation,again=EXCLUDED.again,
     comment=EXCLUDED.comment,submitted_at=now();
END;
$fn$;
REVOKE ALL ON FUNCTION public.save_love_evening_review(uuid,integer,integer,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_love_evening_review(uuid,integer,integer,integer,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.love_evening_reviews_for_couple(p_couple uuid)
RETURNS TABLE(session_id uuid,author_id uuid,overall smallint,
 connection smallint,appreciation smallint,again smallint,
 comment text,submitted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès refusé';
 END IF;
 RETURN QUERY
 SELECT r.session_id,r.author_id,r.overall,r.connection,r.appreciation,
        r.again,r.comment,r.submitted_at
 FROM public.couple_evening_reviews r
 JOIN public.couple_sessions s ON s.id=r.session_id
 WHERE s.couple_id=p_couple AND s.finished_at IS NOT NULL AND s.counted IS TRUE
 ORDER BY s.started_at DESC,r.submitted_at;
END;
$fn$;
REVOKE ALL ON FUNCTION public.love_evening_reviews_for_couple(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.love_evening_reviews_for_couple(uuid) TO authenticated;
COMMIT;
