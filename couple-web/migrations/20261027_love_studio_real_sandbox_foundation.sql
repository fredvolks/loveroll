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

-- Separate private audit, retained after technical pairs are deleted.
-- Only structured action names: no customer data, emails, token hashes, or passwords.
CREATE TABLE IF NOT EXISTS public.love_studio_test_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN (
    'create_requested','create_succeeded','create_failed',
    'login_requested','delete_requested','delete_completed','delete_failed',
    'venice_preview_requested'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.love_studio_test_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.love_studio_test_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.love_studio_test_audit TO service_role;

-- Venice is an optional PAID inference provider. A technical test couple
-- can be reset at will, so its per-couple Venice daily limit alone is not enough.
-- Enforce a second immutable one-trial-per-UTC-day budget per platform admin.
-- This table is independent of pairs, and survives deleting/replacing A/B.
CREATE TABLE IF NOT EXISTS public.love_studio_venice_daily_quota (
 admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 -- Deliberately no FK: the old pair is deleted after each test.
 -- Bind the daily credit to THAT pair to block cross-reset replay.
 couple_id uuid NOT NULL,
 utc_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(admin_id,utc_day)
);
ALTER TABLE public.love_studio_venice_daily_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.love_studio_venice_daily_quota FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.love_studio_venice_daily_quota TO service_role;

-- Entirely privileged deletion: the service backend supplies its VERIFIED admin id;
-- direct browser access is revoked. All target IDs come from the registry.
CREATE OR REPLACE FUNCTION public.love_studio_purge_test_couple(p_admin uuid)
RETURNS TABLE(seat text,user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $purge$
DECLARE v_pool public.love_studio_test_pools%rowtype;
        v_actor_ref record;
        v_foreign_actor boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_pool FROM public.love_studio_test_pools
  WHERE admin_id=p_admin FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Banc de test introuvable'; END IF;
  IF v_pool.couple_id IS NOT NULL THEN
    -- Serialize test roll/session FK inserts against the purge. Row lock
    -- is held until all preflight checks and the couple deletion complete.
    -- Otherwise a client could add a challenge after the checks but
    -- before the ON DELETE CASCADE.
    PERFORM 1 FROM public.couples c WHERE c.id=v_pool.couple_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Couple enregistré absent : purge interrompue'
       USING ERRCODE='42501';
    END IF;
    -- A stale/corrupted pool ID must NEVER cause deletion of an unrelated
    -- couple, including an empty real couple without any members yet.
    -- A real Studio couple is only created AFTER both seats were registered.
    IF (SELECT count(*) FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.seat IN ('A','B')
          AND s.user_id IS NOT NULL) <> 2
       OR NOT EXISTS (
        SELECT 1 FROM public.couples c
        JOIN public.love_studio_test_seats owner_seat
          ON owner_seat.admin_id=p_admin
         AND owner_seat.seat='A'
         AND owner_seat.user_id=c.owner_user_id
        WHERE c.id=v_pool.couple_id
       )
    THEN
      RAISE EXCEPTION 'Propriétaire ou duo test non vérifié : suppression bloquée'
       USING ERRCODE='42501';
    END IF;
    -- Auth deletion cascades couple_members and SET NULLs couples.owner_user_id.
    -- Check both directions: technical A/B identities must be exclusive to
    -- their own pair, never a member or owner of another customer couple.
    IF EXISTS (
      SELECT 1 FROM public.couple_members cm
      JOIN public.love_studio_test_seats s ON s.user_id=cm.user_id
      WHERE s.admin_id=p_admin AND cm.couple_id<>v_pool.couple_id
    ) OR EXISTS (
      SELECT 1 FROM public.couples other_couple
      JOIN public.love_studio_test_seats s
        ON s.user_id=other_couple.owner_user_id
      WHERE s.admin_id=p_admin AND other_couple.id<>v_pool.couple_id
    ) THEN
      RAISE EXCEPTION 'Identité test utilisée dans un autre couple : purge interdite'
       USING ERRCODE='42501';
    END IF;
    -- Removing a technical Auth user cascades user-scoped data even beyond
    -- the couple FK. Never erase provider-backed credit use or foreign
    -- personal/review/Éclat contents as a side effect.
    IF EXISTS (
      SELECT 1 FROM public.love_referral_credit_usage u
      JOIN public.love_studio_test_seats s
        ON s.user_id=u.beneficiary_user_id
      WHERE s.admin_id=p_admin
    ) THEN
      RAISE EXCEPTION 'Crédit payé lié au banc : suppression bloquée'
       USING ERRCODE='42501';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.love_personal_intimacy x
      JOIN public.love_studio_test_seats s ON s.user_id=x.user_id
      WHERE s.admin_id=p_admin AND x.source_couple_id IS NOT NULL
        AND x.source_couple_id<>v_pool.couple_id
    ) OR EXISTS (
      SELECT 1 FROM public.couple_evening_reviews x
      JOIN public.couple_sessions cs ON cs.id=x.session_id
      JOIN public.love_studio_test_seats s ON s.user_id=x.author_id
      WHERE s.admin_id=p_admin AND cs.couple_id<>v_pool.couple_id
    ) OR EXISTS (
      SELECT 1 FROM public.love_eclat_private_notes x
      JOIN public.love_eclat_sessions es ON es.id=x.session_id
      JOIN public.love_studio_test_seats s ON s.user_id=x.user_id
      WHERE s.admin_id=p_admin AND es.couple_id<>v_pool.couple_id
    ) THEN
      RAISE EXCEPTION 'Historique personnel extérieur au banc : purge interdite'
       USING ERRCODE='42501';
    END IF;
    -- The Studio is billing-exempt and must never initiate a real Stripe
    -- charge. Retain any unexpected provider-backed financial record for
    -- manual investigation rather than silently cascade-delete evidence.
    IF EXISTS (SELECT 1 FROM public.love_monthly_paid_entitlements p
       WHERE p.couple_id=v_pool.couple_id)
     OR EXISTS (SELECT 1 FROM public.love_annual_discount_settlements p
       WHERE p.couple_id=v_pool.couple_id)
     OR EXISTS (SELECT 1 FROM public.love_promo_redemptions p
       WHERE p.couple_id=v_pool.couple_id)
    THEN
      RAISE EXCEPTION 'Écriture financière détectée : purge de test bloquée'
       USING ERRCODE='42501';
    END IF;
    IF EXISTS(
      SELECT 1 FROM public.couple_members cm
      WHERE cm.couple_id=v_pool.couple_id AND NOT EXISTS(
        SELECT 1 FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.user_id=cm.user_id
      )
    ) THEN RAISE EXCEPTION 'Membre réel détecté : suppression bloquée'; END IF;
    -- A Studio test must never delete, detach or alter a real user's
    -- records merely because a corrupted row points to the synthetic pair.
    -- If an external user/couple was ever linked, ABORT the entire transaction.
    IF EXISTS (
      SELECT 1 FROM public.love_user_library_backup x
      WHERE x.source_couple_id=v_pool.couple_id AND NOT EXISTS (
        SELECT 1 FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.user_id=x.user_id
      )
    ) OR EXISTS (
      SELECT 1 FROM public.love_trial_identity_claims x
      WHERE x.first_trial_couple_id=v_pool.couple_id AND NOT EXISTS (
        SELECT 1 FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.user_id=x.user_id
      )
    ) OR EXISTS (
      SELECT 1 FROM public.love_referral_links x
      WHERE x.couple_id=v_pool.couple_id AND NOT EXISTS (
        SELECT 1 FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.user_id=x.user_id
      )
    ) OR EXISTS (
      SELECT 1 FROM public.love_referral_credit_ledger x
      WHERE x.beneficiary_couple_id=v_pool.couple_id AND (
        (x.claim_couple_id IS NOT NULL AND x.claim_couple_id<>v_pool.couple_id)
        OR (x.beneficiary_user_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.love_studio_test_seats s
          WHERE s.admin_id=p_admin AND s.user_id=x.beneficiary_user_id
        ))
      )
    ) OR EXISTS (
      SELECT 1 FROM public.love_referral_claims x
      WHERE (x.referrer_couple_id=v_pool.couple_id OR x.referred_couple_id=v_pool.couple_id)
        AND (
          (x.referrer_couple_id IS NOT NULL AND x.referrer_couple_id<>v_pool.couple_id)
          OR (x.referred_couple_id IS NOT NULL AND x.referred_couple_id<>v_pool.couple_id)
          OR (x.referrer_user_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.love_studio_test_seats s
            WHERE s.admin_id=p_admin AND s.user_id=x.referrer_user_id
          ))
          OR (x.referred_owner_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.love_studio_test_seats s
            WHERE s.admin_id=p_admin AND s.user_id=x.referred_owner_id
          ))
        )
    ) THEN
      RAISE EXCEPTION 'Lien vers un utilisateur ou un couple réel : suppression du banc bloquée';
    END IF;
    -- LR-STUDIO deletion preflight: even a corrupted synthetic couple must
    -- NOT delete a real user's rolls, sessions, challenges or personal D6.
    -- These are the exact production Auth FK columns checked on 2026-10-27.
    IF EXISTS (
      SELECT 1 FROM public.couple_rolls r
      WHERE r.couple_id=v_pool.couple_id AND r.actor IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.love_studio_test_seats s
          WHERE s.admin_id=p_admin AND s.user_id=r.actor
        )
    ) OR EXISTS (
      SELECT 1 FROM public.couple_sessions ss
      WHERE ss.couple_id=v_pool.couple_id AND (
        (ss.opened_by IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.love_studio_test_seats s
          WHERE s.admin_id=p_admin AND s.user_id=ss.opened_by
        )) OR
        (ss.starting_user_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.love_studio_test_seats s
          WHERE s.admin_id=p_admin AND s.user_id=ss.starting_user_id
        ))
      )
    ) OR EXISTS (
      SELECT 1 FROM public.couple_challenges ch
      WHERE ch.couple_id=v_pool.couple_id AND (
        (ch.offered_by IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.love_studio_test_seats s
          WHERE s.admin_id=p_admin AND s.user_id=ch.offered_by
        )) OR
        (ch.recipient IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.love_studio_test_seats s
          WHERE s.admin_id=p_admin AND s.user_id=ch.recipient
        ))
      )
    ) OR EXISTS (
      SELECT 1 FROM public.couple_personal_rolls pr
      JOIN public.couple_sessions ss ON ss.id=pr.session_id
      WHERE ss.couple_id=v_pool.couple_id AND NOT EXISTS (
        SELECT 1 FROM public.love_studio_test_seats s
        WHERE s.admin_id=p_admin AND s.user_id=pr.user_id
      )
    ) THEN
      RAISE EXCEPTION 'Un lancer ou un défi appartient à un utilisateur réel : suppression du banc refusée';
    END IF;
    -- Cover other tables whose rows are cascaded with the couple. Every
    -- table+column pair below was verified against the live schema; both
    -- identifiers come from this constant list, never from a request.
    FOR v_actor_ref IN SELECT * FROM (VALUES
      ('couple_advent','opened_by'),('couple_advent','performed_by'),
      ('couple_challenge_gifts','donor_user_id'),
      ('couple_challenge_gifts','receiver_user_id'),
      ('couple_events','actor_id'),('couple_feedback','author_id'),
      ('couple_intimacy','author_id'),('couple_invitations','created_by'),
      ('couple_occasion_rolls','actor'),
      ('love_all_dice_reset_audit','actor_id'),
      ('love_card_draw_history','recipient_user_id'),
      ('love_challenge_redraws','actor_id'),
      ('love_cycle_excluded_cards','excluded_by'),
      ('love_custom_challenges','drawer_user_id'),
      ('love_custom_challenges','recipient_user_id'),
      ('love_cycle_responses','user_id'),
      ('love_eclat_sessions','started_by'),
      ('love_monthly_reservations','host_user_id'),
      ('love_personal_sexual_cards','drawer_user_id'),
      ('love_personal_sexual_cards','recipient_user_id'),
      ('love_venice_preview_trials','requested_by'),
      ('love_weekly_reset_audit','actor_id')
    ) AS known(table_name,actor_column) LOOP
      EXECUTE format(
        'SELECT EXISTS(
           SELECT 1 FROM public.%I x
           WHERE x.couple_id=$1 AND x.%I IS NOT NULL
             AND NOT EXISTS(
               SELECT 1 FROM public.love_studio_test_seats s
               WHERE s.admin_id=$2 AND s.user_id=x.%I
             )
         )',v_actor_ref.table_name,v_actor_ref.actor_column,v_actor_ref.actor_column
      ) INTO v_foreign_actor USING v_pool.couple_id,p_admin;
      IF v_foreign_actor THEN
        RAISE EXCEPTION 'Auteur externe dans les données du jeu : suppression du banc interdite';
      END IF;
    END LOOP;
    -- RESTRICT references also must never remove a real first or second
    -- user from a paid-trial identity trail.
    IF EXISTS (
      SELECT 1 FROM public.love_couple_free_trials t
      WHERE t.couple_id=v_pool.couple_id AND (
       (t.first_user_id IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.love_studio_test_seats s
         WHERE s.admin_id=p_admin AND s.user_id=t.first_user_id
       ))
       OR (t.second_user_id IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.love_studio_test_seats s
         WHERE s.admin_id=p_admin AND s.user_id=t.second_user_id
       ))
      )
    ) THEN
      RAISE EXCEPTION 'Essai lié à un utilisateur réel : purge interdite'
       USING ERRCODE='42501';
    END IF;
    -- This NO ACTION FK must be cleared ONLY for registered synthetic users.
    DELETE FROM public.love_user_library_backup x
    WHERE x.source_couple_id=v_pool.couple_id AND EXISTS (
      SELECT 1 FROM public.love_studio_test_seats s
      WHERE s.admin_id=p_admin AND s.user_id=x.user_id
    );
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
