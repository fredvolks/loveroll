-- Private PostgreSQL 17 contract fixture. No real Auth users or production data.
CREATE SCHEMA auth;
CREATE SCHEMA couple_private;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
GRANT USAGE ON SCHEMA public,auth,couple_private TO authenticated,anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.couples(id uuid PRIMARY KEY);
CREATE TABLE public.couple_members(
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 PRIMARY KEY(couple_id,user_id)
);
CREATE FUNCTION couple_private.is_member(p_couple uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM public.couple_members m
 WHERE m.couple_id=p_couple AND m.user_id=auth.uid())
$$;
CREATE FUNCTION public.love_require_verified_identity()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required' USING errcode='42501'; END IF;
END
$$;
CREATE TABLE public.couple_sessions(
 id uuid PRIMARY KEY,
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 finished_at timestamptz
);
CREATE TABLE public.couple_challenges(
 id uuid PRIMARY KEY,
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 session_id uuid NOT NULL REFERENCES public.couple_sessions(id),
 offered_by uuid NOT NULL REFERENCES auth.users(id),
 recipient uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'proposed',
 card_description text NOT NULL DEFAULT 'Consigne officielle originale',
 card_timer_minutes integer NOT NULL DEFAULT 5
);
-- The real Supabase schema already grants authorized member reads under RLS.
GRANT SELECT ON public.couple_challenges,public.couple_members TO authenticated;
-- Real LoveRoll only exposes the personal challenge to its recipient.
ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY synthetic_recipient_cards ON public.couple_challenges
 FOR SELECT TO authenticated USING (recipient=auth.uid() AND couple_private.is_member(couple_id));
INSERT INTO auth.users VALUES
 ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-4ccc-cccc-cccccccccccc');
INSERT INTO public.couples VALUES
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd');
INSERT INTO public.couple_members VALUES
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
INSERT INTO public.couple_sessions VALUES
 ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee','dddddddd-dddd-4ddd-dddd-dddddddddddd',NULL);
INSERT INTO public.couple_challenges(id,couple_id,session_id,offered_by,recipient)
VALUES
 ('11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'),
 ('22222222-2222-4222-8222-222222222222','dddddddd-dddd-4ddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('33333333-3333-4333-8333-333333333333','dddddddd-dddd-4ddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
