-- LR-015 isolated PostgreSQL 17 fixture. Never run on real Supabase.
-- Scope: only relations/functions referenced by the three LR-015 migrations.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA couple_private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE public.couples(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 monthly_pass_limit integer NOT NULL DEFAULT 3,
 challenge_cycle_number integer NOT NULL DEFAULT 1,
 challenge_cycle_target integer NOT NULL DEFAULT 200,
 challenge_cycle_started_at timestamptz NOT NULL DEFAULT now()-interval '30 days',
 challenge_cycle_pending boolean NOT NULL DEFAULT false,
 no_repeat_challenges boolean NOT NULL DEFAULT true,
 category_weights_enabled boolean NOT NULL DEFAULT true,
 category_preference_percent integer NOT NULL DEFAULT 88,
 sexual_card_mode text NOT NULL DEFAULT 'custom'
);
CREATE TABLE public.couple_members(
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 PRIMARY KEY(couple_id,user_id)
);
CREATE FUNCTION couple_private.is_member(p_couple uuid)
RETURNS boolean LANGUAGE sql STABLE AS
$$SELECT EXISTS(SELECT 1 FROM public.couple_members m
WHERE m.couple_id=p_couple AND m.user_id=(SELECT auth.uid()))$$;
CREATE FUNCTION public.love_require_verified_identity()
RETURNS void LANGUAGE plpgsql AS
$$BEGIN IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Identity missing'; END IF; END$$;
CREATE TABLE public.couple_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 opened_by uuid NOT NULL REFERENCES auth.users(id),
 finished_at timestamptz,
 counted boolean NOT NULL DEFAULT false,
 started_at timestamptz NOT NULL DEFAULT now(),
 paired_turns boolean NOT NULL DEFAULT true,
 self_draws boolean NOT NULL DEFAULT true,
 starting_user_id uuid
);
CREATE TABLE public.couple_personal_rolls(
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 face integer NOT NULL,
 PRIMARY KEY(session_id,user_id)
);
CREATE TABLE public.couple_challenge_gifts(
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 receiver_user_id uuid,
 donor_user_id uuid
);
CREATE TABLE public.couple_challenges(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 offered_by uuid NOT NULL REFERENCES auth.users(id),
 recipient uuid NOT NULL REFERENCES auth.users(id),
 category text NOT NULL,
 face smallint NOT NULL,
 card_id smallint NOT NULL,
 card_title text,
 card_description text,
 card_timer_minutes smallint,
 is_gifted boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'proposed',
 created_at timestamptz NOT NULL DEFAULT now(),
 passed_at timestamptz,
 CONSTRAINT couple_challenges_status_check
 CHECK(status IN ('proposed','accepted','passed','completed'))
);
CREATE FUNCTION public.lr015_stamp_pass() RETURNS trigger LANGUAGE plpgsql AS
$$BEGIN
 IF NEW.status='passed' AND OLD.status IS DISTINCT FROM 'passed' THEN NEW.passed_at=now(); END IF;
 RETURN NEW;
END$$;
CREATE TRIGGER stamp_pass BEFORE UPDATE OF status
ON public.couple_challenges FOR EACH ROW EXECUTE FUNCTION public.lr015_stamp_pass();
CREATE TABLE public.love_card_draw_history(
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 recipient_user_id uuid NOT NULL REFERENCES auth.users(id),
 category text NOT NULL,
 card_id smallint NOT NULL,
 PRIMARY KEY(couple_id,recipient_user_id,category,card_id)
);
CREATE TABLE public.love_custom_challenges(
 couple_id uuid,category text,card_id smallint,title text,description text,
 timer_minutes smallint,recipient_user_id uuid,updated_at timestamptz,
 drawer_user_id uuid,drawer_role text,recipient_role text
);
CREATE VIEW couple_private.love_active_challenges AS
SELECT * FROM public.love_custom_challenges;
CREATE TABLE public.love_base_challenges(
 category text NOT NULL,card_id smallint NOT NULL,title text NOT NULL,
 description text NOT NULL,timer_minutes smallint NOT NULL,
 PRIMARY KEY(category,card_id)
);
INSERT INTO public.love_base_challenges(category,card_id,title,description,timer_minutes)
SELECT x.category,n,'Défi officiel '||n,'Consigne de test '||n,5
FROM (VALUES('SENSUEL'),('SEXUEL')) AS x(category),generate_series(1,25) n;
CREATE FUNCTION couple_private.love_role_allows(text,uuid,uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$SELECT true$$;
CREATE FUNCTION couple_private.ensure_love_style_pool(uuid)
RETURNS void LANGUAGE plpgsql AS $$BEGIN RETURN; END$$;
CREATE TABLE public.couple_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 event_type text NOT NULL,actor_id uuid NOT NULL,
 title text NOT NULL DEFAULT ''
);
