-- LoveRoll • two real Supabase Auth sandbox accounts per authorized platform admin.
-- This is FOUNDATION ONLY: no users are created by this migration.
CREATE TABLE IF NOT EXISTS public.love_studio_test_pools (
  admin_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id uuid UNIQUE REFERENCES public.couples(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'creating'
    CHECK (state IN ('creating','ready','deleting')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.love_studio_test_seats (
  admin_id uuid NOT NULL REFERENCES public.love_studio_test_pools(admin_id) ON DELETE CASCADE,
  seat text NOT NULL CHECK (seat IN ('A','B')),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  synthetic_email text NOT NULL,
  PRIMARY KEY(admin_id,seat)
);
ALTER TABLE public.love_studio_test_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_studio_test_seats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.love_studio_test_pools FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.love_studio_test_seats FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.love_studio_test_pools,public.love_studio_test_seats TO service_role;

-- Entirely privileged deletion: the service backend supplies its VERIFIED admin id;
-- direct browser access is revoked. All target IDs come from the registry.
CREATE OR REPLACE FUNCTION public.love_studio_purge_test_couple(p_admin uuid)
RETURNS TABLE(seat text,user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $purge$
DECLARE v_pool public.love_studio_test_pools%rowtype;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_pool FROM public.love_studio_test_pools
  WHERE admin_id=p_admin FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Banc de test introuvable'; END IF;
  IF v_pool.couple_id IS NOT NULL THEN
    IF EXISTS(
      SELECT 1 FROM public.couple_members cm
      WHERE cm.couple_id=v_pool.couple_id AND NOT EXISTS(
        SELECT 1 FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.user_id=cm.user_id
      )
    ) THEN RAISE EXCEPTION 'Membre réel détecté : suppression bloquée'; END IF;
    -- Restrict/NO ACTION references must be removed before deleting the couple.
    DELETE FROM public.love_couple_free_trials
    WHERE couple_id=v_pool.couple_id;
    DELETE FROM public.love_trial_identity_claims
    WHERE first_trial_couple_id=v_pool.couple_id;
    DELETE FROM public.love_referral_credit_ledger
    WHERE beneficiary_couple_id=v_pool.couple_id;
    DELETE FROM public.love_referral_claims
    WHERE referrer_couple_id=v_pool.couple_id
      OR referred_couple_id=v_pool.couple_id;
    DELETE FROM public.love_referral_links
    WHERE couple_id=v_pool.couple_id;
    DELETE FROM public.couples WHERE id=v_pool.couple_id;
  END IF;
  UPDATE public.love_studio_test_pools
  SET state='deleting',couple_id=null,updated_at=now() WHERE admin_id=p_admin;
  RETURN QUERY SELECT s.seat,s.user_id FROM public.love_studio_test_seats s
  WHERE s.admin_id=p_admin ORDER BY s.seat;
END;$purge$;
REVOKE ALL ON FUNCTION public.love_studio_purge_test_couple(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_studio_purge_test_couple(uuid) TO service_role;
COMMENT ON TABLE public.love_studio_test_pools IS
 'Strictly registered platform-admin test couples. Never merge with real customer data or let browser alter.';
