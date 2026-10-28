-- LR-017: an optional, consensual per-occurrence adjustment. Never rewrite
-- challenge/card originals, change D100, create rolls, consume passes or timers.
-- Do not install into production until the A/B UI and staging are validated.
BEGIN;
CREATE TABLE IF NOT EXISTS public.love_challenge_adaptations(
 challenge_id uuid PRIMARY KEY REFERENCES public.couple_challenges(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id) ON DELETE CASCADE,
 proposed_by uuid NOT NULL REFERENCES auth.users(id),
 proposed_text text,
 proposed_minutes integer,
 status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','accepted','declined')),
 created_at timestamptz NOT NULL DEFAULT now(),
 responded_at timestamptz,
 responded_by uuid REFERENCES auth.users(id),
 CONSTRAINT love_adaptation_nonempty
  CHECK (NULLIF(btrim(coalesce(proposed_text,'')),'') IS NOT NULL OR proposed_minutes IS NOT NULL),
 CONSTRAINT love_adaptation_text_length
  CHECK (proposed_text IS NULL OR length(proposed_text) BETWEEN 1 AND 500),
 CONSTRAINT love_adaptation_minutes_range
  CHECK (proposed_minutes IS NULL OR proposed_minutes BETWEEN 1 AND 360)
);
CREATE INDEX IF NOT EXISTS love_adaptations_couple_created_idx
 ON public.love_challenge_adaptations(couple_id,session_id,created_at DESC);
ALTER TABLE public.love_challenge_adaptations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS love_adaptations_pair_read ON public.love_challenge_adaptations;
CREATE POLICY love_adaptations_pair_read ON public.love_challenge_adaptations
 FOR SELECT TO authenticated USING (
   couple_private.is_member(couple_id)
   AND EXISTS (SELECT 1 FROM public.couple_challenges q
    WHERE q.id=love_challenge_adaptations.challenge_id
      AND q.couple_id=love_challenge_adaptations.couple_id
      AND q.session_id=love_challenge_adaptations.session_id)
 );
REVOKE ALL ON public.love_challenge_adaptations FROM public,anon,authenticated;
GRANT SELECT ON public.love_challenge_adaptations TO authenticated;

CREATE OR REPLACE FUNCTION public.love_adaptation_propose(
 p_challenge uuid,p_text text DEFAULT NULL,p_minutes integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_couple uuid; v_q public.couple_challenges%rowtype;
 v_session public.couple_sessions%rowtype;
 v_old public.love_challenge_adaptations%rowtype;
 v_text text:=NULLIF(btrim(coalesce(p_text,'')),'');
 v_actor uuid:=auth.uid();
BEGIN
 PERFORM public.love_require_verified_identity();
 IF v_actor IS NULL OR p_challenge IS NULL THEN
  RAISE EXCEPTION 'Connexion et défi nécessaires' USING errcode='42501'; END IF;
 IF (v_text IS NULL AND p_minutes IS NULL)
   OR length(v_text)>500 OR (p_minutes IS NOT NULL AND (p_minutes<1 OR p_minutes>360)) THEN
  RAISE EXCEPTION 'Proposition invalide (texte ≤ 500 caractères, durée 1–360 minutes)'; END IF;
 SELECT couple_id INTO v_couple FROM public.couple_challenges WHERE id=p_challenge;
 IF NOT FOUND OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Défi inaccessible' USING errcode='42501'; END IF;
 PERFORM 1 FROM public.couples WHERE id=v_couple FOR UPDATE;
 SELECT * INTO v_q FROM public.couple_challenges
  WHERE id=p_challenge AND couple_id=v_couple FOR UPDATE;
 IF NOT FOUND OR v_q.status NOT IN ('proposed','accepted') THEN
  RAISE EXCEPTION 'Ce défi ne peut plus être adapté'; END IF;
 SELECT * INTO v_session FROM public.couple_sessions
  WHERE id=v_q.session_id AND couple_id=v_couple FOR UPDATE;
 IF NOT FOUND OR v_session.finished_at IS NOT NULL THEN
  RAISE EXCEPTION 'Soirée déjà terminée'; END IF;
 IF NOT (v_actor IN (v_q.offered_by,v_q.recipient))
  OR (SELECT count(*) FROM public.couple_members WHERE couple_id=v_couple)<>2 THEN
  RAISE EXCEPTION 'Deux partenaires associés sont nécessaires' USING errcode='42501'; END IF;
 -- A running timer must never be silently replaced. A changed duration
 -- can be proposed/approved only before the challenge begins.
 IF p_minutes IS NOT NULL AND v_q.status<>'proposed' THEN
  RAISE EXCEPTION 'La durée ne peut être adaptée qu’avant de commencer le défi'; END IF;
 SELECT * INTO v_old FROM public.love_challenge_adaptations
  WHERE challenge_id=p_challenge FOR UPDATE;
 IF FOUND THEN
  IF v_old.proposed_by=v_actor AND v_old.proposed_text IS NOT DISTINCT FROM v_text
     AND v_old.proposed_minutes IS NOT DISTINCT FROM p_minutes THEN
   RETURN jsonb_build_object('status',v_old.status,'created',false);
  END IF;
  RAISE EXCEPTION 'Une proposition existe déjà pour ce défi';
 END IF;
 INSERT INTO public.love_challenge_adaptations(
  challenge_id,couple_id,session_id,proposed_by,proposed_text,proposed_minutes)
 VALUES(p_challenge,v_couple,v_q.session_id,v_actor,v_text,p_minutes);
 RETURN jsonb_build_object('status','pending','created',true);
END
$fn$;
REVOKE ALL ON FUNCTION public.love_adaptation_propose(uuid,text,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_adaptation_propose(uuid,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.love_adaptation_respond(
 p_challenge uuid,p_accept boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_couple uuid; v_q public.couple_challenges%rowtype;
 v_adaptation public.love_challenge_adaptations%rowtype;
 v_actor uuid:=auth.uid();
BEGIN
 PERFORM public.love_require_verified_identity();
 IF v_actor IS NULL OR p_accept IS NULL THEN
  RAISE EXCEPTION 'Réponse invalide' USING errcode='42501'; END IF;
 SELECT couple_id INTO v_couple FROM public.couple_challenges WHERE id=p_challenge;
 IF NOT FOUND OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Défi inaccessible' USING errcode='42501'; END IF;
 PERFORM 1 FROM public.couples WHERE id=v_couple FOR UPDATE;
 SELECT * INTO v_q FROM public.couple_challenges
  WHERE id=p_challenge AND couple_id=v_couple FOR UPDATE;
 IF NOT FOUND OR v_q.status NOT IN ('proposed','accepted') OR
  NOT EXISTS(SELECT 1 FROM public.couple_sessions s
   WHERE s.id=v_q.session_id AND s.couple_id=v_couple AND s.finished_at IS NULL) THEN
  RAISE EXCEPTION 'Le défi ou la soirée n’est plus disponible'; END IF;
 SELECT * INTO v_adaptation FROM public.love_challenge_adaptations
  WHERE challenge_id=p_challenge AND couple_id=v_couple FOR UPDATE;
 IF NOT FOUND OR NOT (v_actor IN (v_q.offered_by,v_q.recipient))
   OR v_actor=v_adaptation.proposed_by THEN
  RAISE EXCEPTION 'Seul l’autre partenaire peut répondre' USING errcode='42501'; END IF;
 IF v_adaptation.status<>'pending' THEN
  RETURN jsonb_build_object('status',v_adaptation.status,'updated',false);
 END IF;
 IF p_accept AND v_adaptation.proposed_minutes IS NOT NULL AND v_q.status<>'proposed' THEN
  RAISE EXCEPTION 'Impossible de modifier la minuterie d’un défi commencé'; END IF;
 UPDATE public.love_challenge_adaptations
 SET status=CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
     responded_at=now(),responded_by=v_actor WHERE challenge_id=p_challenge;
 -- Deliberately no UPDATE of couple_challenges or any roll, pass or timer.
 RETURN jsonb_build_object('status',CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,'updated',true);
END
$fn$;
REVOKE ALL ON FUNCTION public.love_adaptation_respond(uuid,boolean) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_adaptation_respond(uuid,boolean) TO authenticated;
COMMIT;
