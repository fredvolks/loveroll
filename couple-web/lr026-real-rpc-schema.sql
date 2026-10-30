-- Disposable PostgreSQL 17 SCHEMA ONLY for executing the actual production
-- LoveRoll D100 and Passer/Refuser RPC bodies. NO users or customer data.
-- This deliberately supplies a small, compatible subset of catalog tables.
-- No Supabase credentials, hosted connections or public migration.
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anon') THEN
  CREATE ROLE anon NOLOGIN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated') THEN
  CREATE ROLE authenticated NOLOGIN;
 END IF;
END; $roles$;

CREATE SCHEMA auth;
CREATE SCHEMA couple_private;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path=''
AS $uid$ SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid $uid$;

CREATE TABLE public.couples(
 id uuid PRIMARY KEY,
 owner_user_id uuid,
 no_repeat_challenges boolean NOT NULL DEFAULT true,
 category_weights_enabled boolean NOT NULL DEFAULT true,
 category_preference_percent integer NOT NULL DEFAULT 100,
 challenge_cycle_number integer NOT NULL DEFAULT 1,
 challenge_cycle_pending boolean NOT NULL DEFAULT false,
 challenge_cycle_started_at timestamptz NOT NULL DEFAULT now(),
 sexual_card_mode text NOT NULL DEFAULT 'custom',
 monthly_pass_limit integer NOT NULL DEFAULT 1
);
CREATE TABLE public.couple_members(
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 user_id uuid NOT NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(couple_id,user_id)
);
CREATE TABLE public.couple_profiles(
 id uuid PRIMARY KEY,
 gender text,
 play_style text DEFAULT 'medium'
);
CREATE TABLE public.couple_sessions(
 id uuid PRIMARY KEY,
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 opened_by uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 paired_turns boolean NOT NULL DEFAULT false,
 starting_user_id uuid,
 self_draws boolean NOT NULL DEFAULT false
);
CREATE TABLE public.couple_personal_rolls(
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 user_id uuid NOT NULL,
 face smallint NOT NULL,
 PRIMARY KEY(session_id,user_id)
);
CREATE TABLE public.couple_challenge_gifts(
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 donor_user_id uuid NOT NULL,
 receiver_user_id uuid NOT NULL
);
CREATE TABLE public.love_base_challenges(
 category text NOT NULL,
 card_id smallint NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 timer_minutes smallint NOT NULL DEFAULT 3,
 PRIMARY KEY(category,card_id)
);
CREATE TABLE public.love_custom_challenges(
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 category text NOT NULL,
 card_id smallint NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 timer_minutes smallint,
 recipient_user_id uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 drawer_user_id uuid,
 drawer_role text NOT NULL DEFAULT 'both',
 recipient_role text NOT NULL DEFAULT 'both',
 PRIMARY KEY(couple_id,category,card_id)
);
-- Real RPCs use the active view in custom mode. This is the minimal
-- compatible custom-mode projection, NOT a clone of the automatic pools.
CREATE VIEW couple_private.love_active_challenges AS
SELECT cc.couple_id,cc.category,cc.card_id,cc.title,cc.description,
 cc.timer_minutes,cc.recipient_user_id,cc.updated_at,cc.drawer_user_id,
 cc.drawer_role,cc.recipient_role
FROM public.love_custom_challenges cc
JOIN public.couples c ON c.id=cc.couple_id
WHERE cc.category<>'SEXUEL' OR c.sexual_card_mode='custom';

CREATE TABLE public.love_cycle_excluded_cards(
 couple_id uuid NOT NULL,
 cycle_number integer NOT NULL,
 category text NOT NULL,
 card_id integer NOT NULL,
 excluded_by uuid,
 PRIMARY KEY(couple_id,cycle_number,category,card_id)
);
CREATE TABLE public.love_card_draw_history(
 couple_id uuid NOT NULL,
 recipient_user_id uuid NOT NULL,
 category text NOT NULL,
 card_id smallint NOT NULL,
 drawn_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(couple_id,recipient_user_id,category,card_id)
);
CREATE TABLE public.couple_challenges(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 offered_by uuid NOT NULL,
 recipient uuid NOT NULL,
 category text NOT NULL,
 face smallint NOT NULL,
 status text NOT NULL DEFAULT 'proposed',
 created_at timestamptz NOT NULL DEFAULT now(),
 card_id smallint NOT NULL,
 card_title text,
 card_description text,
 card_timer_minutes smallint,
 is_gifted boolean NOT NULL DEFAULT false,
 passed_at timestamptz,
 refused_at timestamptz,
 replaces_challenge_id uuid,
 CONSTRAINT lr026_real_unique_card UNIQUE(session_id,recipient,category,card_id)
);
CREATE TABLE public.love_challenge_redraws(
 origin_id uuid PRIMARY KEY,
 replacement_id uuid,
 couple_id uuid NOT NULL,
 actor_id uuid,
 action text NOT NULL,
 excluded boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.couple_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 couple_id uuid NOT NULL,
 event_type text NOT NULL,
 actor_id uuid NOT NULL,
 title text NOT NULL DEFAULT '',
 happened_at timestamptz NOT NULL DEFAULT now()
);

-- Real production member and role eligibility logic (sources reviewed
-- read-only on 2026-10-30); identities are disposable simulated claims.
CREATE OR REPLACE FUNCTION couple_private.is_member(p_couple uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.couple_members m
  where m.couple_id=p_couple and m.user_id=(select auth.uid()))
$function$;

CREATE OR REPLACE FUNCTION couple_private.love_role_allows(
 p_role text,p_person uuid,p_owner uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT CASE p_role
  WHEN 'both' THEN true
  WHEN 'owner' THEN p_person=p_owner
  WHEN 'partner' THEN p_person<>p_owner
  WHEN 'him' THEN EXISTS(SELECT 1 FROM public.couple_profiles p WHERE p.id=p_person AND p.gender='him')
  WHEN 'her' THEN EXISTS(SELECT 1 FROM public.couple_profiles p WHERE p.id=p_person AND p.gender='her')
  ELSE false END;
$function$;

-- Fail visibly if the test accidentally activates the automatic-card path,
-- for which this custom-mode-only fixture has no real style pool.
CREATE FUNCTION couple_private.ensure_love_style_pool(uuid)
RETURNS void LANGUAGE plpgsql SET search_path=''
AS $forbidden$
BEGIN
 RAISE EXCEPTION 'LR-026 real RPC fixture is CUSTOM-card mode only';
END;$forbidden$;

-- Production identity RPC is real; only its verified-email predicate
-- is simulated by an explicitly set CI-only claim.
CREATE FUNCTION public.love_verified_identity()
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $verified$
 SELECT pg_catalog.current_setting('lr026.test_verified',true)='yes'
$verified$;
CREATE OR REPLACE FUNCTION public.love_require_verified_identity()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT public.love_verified_identity() THEN
  RAISE EXCEPTION 'Confirmez votre adresse courriel avant d’utiliser LoveRoll.'
   USING ERRCODE='28000';
 END IF;
END;
$function$;

-- Original EXECUTE rights of the real RPCs are assigned AFTER loading
-- lr026-real-rpc-snapshot.sql, before the guarded migration.
