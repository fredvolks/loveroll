-- LR-016 (phase 1): secure monthly pass ceiling, per recipient, per couple.
-- No historical rows are rewritten. The existing pass stamp trigger remains
-- responsible for passed_at, and the existing calendar free_pass history stays.
-- Safe to reapply; deploy only with the coordinated client release.
BEGIN;

ALTER TABLE public.couples
 ADD COLUMN IF NOT EXISTS monthly_pass_limit integer NOT NULL DEFAULT 3;

DO $check$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_constraint
  WHERE conname='love_couple_monthly_pass_limit_valid'
   AND conrelid='public.couples'::regclass
 ) THEN
  ALTER TABLE public.couples
   ADD CONSTRAINT love_couple_monthly_pass_limit_valid
   CHECK (monthly_pass_limit BETWEEN 0 AND 30);
 END IF;
END
$check$;

CREATE INDEX IF NOT EXISTS love_pass_monthly_audit_idx
 ON public.couple_challenges(couple_id,recipient,passed_at)
 WHERE status='passed' AND passed_at IS NOT NULL;

-- Only the owner can change a shared limit. The other partner may read it.
CREATE OR REPLACE FUNCTION public.save_couple_monthly_pass_limit(
 p_couple uuid,p_limit integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $save$
DECLARE v_owner uuid;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL OR p_couple IS NULL THEN
  RAISE EXCEPTION 'Connexion requise';
 END IF;
 IF p_limit IS NULL OR p_limit < 0 OR p_limit > 30 THEN
  RAISE EXCEPTION 'La limite doit être comprise entre 0 et 30';
 END IF;
 SELECT owner_user_id INTO v_owner
 FROM public.couples WHERE id=p_couple FOR UPDATE;
 IF NOT FOUND OR v_owner IS DISTINCT FROM (select auth.uid())
   OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Seul l’administrateur du couple peut modifier la limite';
 END IF;
 UPDATE public.couples SET monthly_pass_limit=p_limit WHERE id=p_couple;
 RETURN p_limit;
END
$save$;
REVOKE ALL ON FUNCTION public.save_couple_monthly_pass_limit(uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_couple_monthly_pass_limit(uuid,integer)
 TO authenticated;

-- Read-only quota for the authenticated recipient, not another person's cards.
-- Month is anchored in America/Toronto; the server is always authoritative.
CREATE OR REPLACE FUNCTION public.my_love_monthly_pass_quota(p_couple uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $quota$
DECLARE v_limit integer; v_used integer;
 v_month text:=to_char(now() AT TIME ZONE 'America/Toronto','YYYY-MM');
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR (select auth.uid()) IS NULL
   OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 SELECT monthly_pass_limit INTO v_limit FROM public.couples WHERE id=p_couple;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 SELECT count(*)::integer INTO v_used
 FROM public.couple_challenges q
 WHERE q.couple_id=p_couple
   AND q.recipient=(select auth.uid())
   AND q.status='passed' AND q.passed_at IS NOT NULL
   AND to_char(q.passed_at AT TIME ZONE 'America/Toronto','YYYY-MM')=v_month;
 RETURN jsonb_build_object(
  'month',v_month,'used',v_used,'limit',v_limit,
  'remaining',greatest(v_limit-v_used,0),'can_pass',v_used<v_limit
 );
END
$quota$;
REVOKE ALL ON FUNCTION public.my_love_monthly_pass_quota(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_love_monthly_pass_quota(uuid)
 TO authenticated;

-- Supersedes the old RPC so ALL clients, including an outdated PWA, get the
-- same hard ceiling. Lock COUPLE first (as draw_for_partner already does),
-- then the challenge, to serialize two phones and avoid inverted lock order.
CREATE OR REPLACE FUNCTION public.answer_challenge(p_id uuid,p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $answer$
DECLARE
 c public.couple_challenges%rowtype;
 v_couple uuid;
 v_limit integer;
 v_used integer;
 v_month text:=to_char(now() AT TIME ZONE 'America/Toronto','YYYY-MM');
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_status NOT IN ('accepted','passed','completed') THEN
  RAISE EXCEPTION 'Statut invalide';
 END IF;
 SELECT couple_id INTO v_couple FROM public.couple_challenges WHERE id=p_id;
 IF NOT FOUND OR v_couple IS NULL OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Défi inaccessible';
 END IF;
 SELECT monthly_pass_limit INTO v_limit
 FROM public.couples WHERE id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 SELECT * INTO c FROM public.couple_challenges
  WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR c.couple_id IS DISTINCT FROM v_couple
   OR c.recipient IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'Seul le destinataire peut répondre';
 END IF;
 IF p_status='completed' AND c.status<>'accepted' THEN
  RAISE EXCEPTION 'Acceptez d’abord le défi';
 END IF;
 IF c.status NOT IN ('proposed','accepted') THEN
  RAISE EXCEPTION 'Défi déjà terminé';
 END IF;
 IF p_status='passed' THEN
  SELECT count(*)::integer INTO v_used
  FROM public.couple_challenges q
  WHERE q.couple_id=v_couple AND q.recipient=c.recipient
    AND q.status='passed' AND q.passed_at IS NOT NULL
    AND to_char(q.passed_at AT TIME ZONE 'America/Toronto','YYYY-MM')=v_month;
  IF v_used>=v_limit THEN
   RAISE EXCEPTION 'Limite mensuelle de passes atteinte (% / %)',v_used,v_limit;
  END IF;
 END IF;
 -- Existing BEFORE UPDATE trigger stamps passed_at exactly on this transition.
 UPDATE public.couple_challenges SET status=p_status WHERE id=p_id;
 IF p_status='passed' THEN
  -- Preserve existing bag recycling until LR-015 replaces its turn logic
  -- with an atomic, idempotent replacement draw.
  DELETE FROM public.love_card_draw_history h
  WHERE h.couple_id=c.couple_id AND h.recipient_user_id=c.recipient
    AND h.category=c.category AND h.card_id=c.card_id;
 END IF;
END
$answer$;
REVOKE ALL ON FUNCTION public.answer_challenge(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.answer_challenge(uuid,text)
 TO authenticated;
COMMIT;
