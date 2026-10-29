-- LR-017: adaptation for ONE occurrence, only with both participants' consent.
-- Never update challenge source cards, official D100 results, pass quotas or draw history.
BEGIN;
CREATE TABLE IF NOT EXISTS public.love_challenge_adaptations (
 challenge_id uuid PRIMARY KEY REFERENCES public.couple_challenges(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id) ON DELETE CASCADE,
 proposer_id uuid NOT NULL REFERENCES auth.users(id),
 approver_id uuid NOT NULL REFERENCES auth.users(id),
 proposed_description text,
 proposed_minutes integer,
 status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','accepted','declined','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 CONSTRAINT love_adaptation_distinct_people CHECK (proposer_id <> approver_id),
 CONSTRAINT love_adaptation_nonempty CHECK (
  (proposed_description IS NOT NULL AND length(btrim(proposed_description)) BETWEEN 1 AND 1200)
  OR proposed_minutes IS NOT NULL
 ),
 CONSTRAINT love_adaptation_duration CHECK (proposed_minutes IS NULL OR proposed_minutes BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS love_adaptation_session ON public.love_challenge_adaptations(session_id);
ALTER TABLE public.love_challenge_adaptations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS love_adaptation_participants_read ON public.love_challenge_adaptations;
CREATE POLICY love_adaptation_participants_read ON public.love_challenge_adaptations
 FOR SELECT TO authenticated USING (
  couple_private.is_member(couple_id)
  AND ((select auth.uid())=proposer_id OR (select auth.uid())=approver_id)
 );
REVOKE ALL ON public.love_challenge_adaptations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.love_challenge_adaptations TO authenticated;

CREATE OR REPLACE FUNCTION public.love_adaptation_propose(
 p_challenge uuid,p_description text,p_minutes integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_me uuid:=auth.uid(); v_other uuid; v_description text:=nullif(btrim(p_description),'');
 v_card public.couple_challenges%rowtype;
 v_pending public.love_challenge_adaptations%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF v_me IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF v_description IS NULL AND p_minutes IS NULL THEN
  RAISE EXCEPTION 'Propose une consigne ou une durée'; END IF;
 IF length(v_description)>1200 OR p_minutes IS NOT NULL AND
    (p_minutes<1 OR p_minutes>120) THEN
  RAISE EXCEPTION 'Adaptation hors limites'; END IF;
 -- Same couple-first order as official drawing and response actions.
 SELECT * INTO v_card FROM public.couple_challenges WHERE id=p_challenge;
 IF NOT FOUND OR NOT couple_private.is_member(v_card.couple_id) THEN
  RAISE EXCEPTION 'Défi inaccessible' USING errcode='42501'; END IF;
 PERFORM 1 FROM public.couples WHERE id=v_card.couple_id FOR UPDATE;
 SELECT * INTO v_card FROM public.couple_challenges WHERE id=p_challenge FOR UPDATE;
 IF v_card.status<>'proposed' THEN
  RAISE EXCEPTION 'Adaptation possible avant le démarrage du défi seulement'; END IF;
 PERFORM 1 FROM public.couple_sessions
  WHERE id=v_card.session_id AND couple_id=v_card.couple_id
   AND finished_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Soirée déjà terminée'; END IF;
 IF v_me=v_card.recipient THEN v_other:=v_card.offered_by;
 ELSIF v_me=v_card.offered_by THEN v_other:=v_card.recipient;
 ELSE RAISE EXCEPTION 'Cette carte ne vous appartient pas' USING errcode='42501'; END IF;
 IF v_other IS NULL OR v_other=v_me OR
    (select count(*) from public.couple_members
     WHERE couple_id=v_card.couple_id
       AND user_id IN (v_me,v_other))<>2 THEN
  RAISE EXCEPTION 'Deux partenaires distincts sont requis'; END IF;
 SELECT * INTO v_pending FROM public.love_challenge_adaptations
  WHERE challenge_id=p_challenge FOR UPDATE;
 IF FOUND AND v_pending.status IN ('pending','accepted') THEN
  RAISE EXCEPTION 'Une adaptation est déjà en cours ou acceptée'; END IF;
 INSERT INTO public.love_challenge_adaptations(
  challenge_id,couple_id,session_id,proposer_id,approver_id,
  proposed_description,proposed_minutes,status,created_at,resolved_at)
 VALUES(p_challenge,v_card.couple_id,v_card.session_id,v_me,v_other,
  v_description,p_minutes,'pending',now(),NULL)
 ON CONFLICT(challenge_id) DO UPDATE SET
  proposer_id=excluded.proposer_id,approver_id=excluded.approver_id,
  proposed_description=excluded.proposed_description,
  proposed_minutes=excluded.proposed_minutes,status='pending',
  created_at=now(),resolved_at=NULL;
 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(v_card.couple_id,'challenge',v_me,'Adaptation de défi proposée');
 RETURN jsonb_build_object('challenge_id',p_challenge,'status','pending');
END
$fn$;
REVOKE ALL ON FUNCTION public.love_adaptation_propose(uuid,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_adaptation_propose(uuid,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.love_adaptation_respond(
 p_challenge uuid,p_accept boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_card public.couple_challenges%rowtype;
 v_row public.love_challenge_adaptations%rowtype;
 v_status text;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_accept IS NULL THEN RAISE EXCEPTION 'Réponse invalide'; END IF;
 SELECT * INTO v_card FROM public.couple_challenges WHERE id=p_challenge;
 IF NOT FOUND OR NOT couple_private.is_member(v_card.couple_id) THEN
  RAISE EXCEPTION 'Défi inaccessible' USING errcode='42501'; END IF;
 PERFORM 1 FROM public.couples WHERE id=v_card.couple_id FOR UPDATE;
 SELECT * INTO v_card FROM public.couple_challenges WHERE id=p_challenge FOR UPDATE;
 SELECT * INTO v_row FROM public.love_challenge_adaptations
  WHERE challenge_id=p_challenge FOR UPDATE;
 IF NOT FOUND OR v_row.approver_id IS DISTINCT FROM auth.uid()
  OR v_row.couple_id<>v_card.couple_id OR v_row.session_id<>v_card.session_id
  OR NOT EXISTS(SELECT 1 FROM public.couple_members
   WHERE couple_id=v_card.couple_id AND user_id=v_row.proposer_id) THEN
  RAISE EXCEPTION 'Accès à la proposition refusé' USING errcode='42501'; END IF;
 IF v_row.status<>'pending' THEN
  RETURN jsonb_build_object('challenge_id',p_challenge,'status',v_row.status,'updated',false);
 END IF;
 PERFORM 1 FROM public.couple_sessions
  WHERE id=v_card.session_id AND couple_id=v_card.couple_id
   AND finished_at IS NULL FOR UPDATE;
 IF NOT FOUND OR v_card.status<>'proposed' THEN
  RAISE EXCEPTION 'Ce défi a déjà commencé ou cette soirée est terminée'; END IF;
 v_status:=CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END;
 UPDATE public.love_challenge_adaptations SET status=v_status,resolved_at=now()
  WHERE challenge_id=p_challenge;
 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(v_card.couple_id,'challenge',auth.uid(),
  CASE WHEN p_accept THEN 'Adaptation acceptée' ELSE 'Adaptation refusée' END);
 RETURN jsonb_build_object('challenge_id',p_challenge,'status',v_status,'updated',true);
END
$fn$;
REVOKE ALL ON FUNCTION public.love_adaptation_respond(uuid,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_adaptation_respond(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.love_adaptation_cancel(p_challenge uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_row public.love_challenge_adaptations%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO v_row FROM public.love_challenge_adaptations
 WHERE challenge_id=p_challenge FOR UPDATE;
 IF NOT FOUND OR v_row.proposer_id IS DISTINCT FROM auth.uid()
  OR NOT couple_private.is_member(v_row.couple_id) THEN
  RAISE EXCEPTION 'Adaptation inaccessible' USING errcode='42501'; END IF;
 IF v_row.status<>'pending' THEN
  RETURN jsonb_build_object('status',v_row.status,'updated',false);
 END IF;
 UPDATE public.love_challenge_adaptations
  SET status='cancelled',resolved_at=now() WHERE challenge_id=p_challenge;
 RETURN jsonb_build_object('status','cancelled','updated',true);
END
$fn$;
REVOKE ALL ON FUNCTION public.love_adaptation_cancel(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_adaptation_cancel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_love_challenge_adaptations(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_couple uuid; v_rows jsonb;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT couple_id INTO v_couple FROM public.couple_sessions WHERE id=p_session;
 IF NOT FOUND OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Soirée inaccessible' USING errcode='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'challenge_id',a.challenge_id,'proposer_id',a.proposer_id,
  'approver_id',a.approver_id,'proposed_description',a.proposed_description,
  'proposed_minutes',a.proposed_minutes,
  'status',CASE WHEN a.status='pending' AND
   (c.status<>'proposed' OR session.finished_at IS NOT NULL)
   THEN 'obsolete' ELSE a.status END)
  ORDER BY a.created_at),'[]'::jsonb)
 INTO v_rows
 FROM public.love_challenge_adaptations a
 JOIN public.couple_challenges c ON c.id=a.challenge_id
 JOIN public.couple_sessions session ON session.id=c.session_id
 WHERE a.session_id=p_session AND a.couple_id=v_couple
  AND c.session_id=p_session AND c.couple_id=v_couple
  AND (a.proposer_id=auth.uid() OR a.approver_id=auth.uid());
 RETURN v_rows;
END
$fn$;
REVOKE ALL ON FUNCTION public.my_love_challenge_adaptations(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_love_challenge_adaptations(uuid) TO authenticated;
COMMIT;
