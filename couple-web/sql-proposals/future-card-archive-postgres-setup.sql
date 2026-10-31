-- Disposable PostgreSQL 17 fixture for the future archive SQL proposal.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA couple_private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.couples(id uuid PRIMARY KEY);
CREATE TABLE public.couple_members (
 couple_id uuid NOT NULL REFERENCES public.couples(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 PRIMARY KEY(couple_id,user_id)
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE FUNCTION public.love_verified_identity()
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=auth.uid());
$$;
CREATE FUNCTION couple_private.is_member(p_couple uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.couple_members m
  WHERE m.couple_id=p_couple AND m.user_id=auth.uid()
 );
$$;
GRANT USAGE ON SCHEMA auth,couple_private TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.love_verified_identity() TO authenticated;
GRANT EXECUTE ON FUNCTION couple_private.is_member(uuid) TO authenticated;

