-- PostgreSQL 17 isolated fixture: no production user data or secrets.
\set ON_ERROR_STOP on
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $roles$;
CREATE SCHEMA auth;
CREATE SCHEMA couple_private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.couples(id uuid PRIMARY KEY);
CREATE TABLE public.couple_sessions(id uuid PRIMARY KEY,couple_id uuid NOT NULL,started_at timestamptz NOT NULL,finished_at timestamptz);
CREATE TABLE public.couple_members(couple_id uuid NOT NULL,user_id uuid NOT NULL,PRIMARY KEY(couple_id,user_id));
CREATE TABLE public.love_base_challenges(category text NOT NULL,card_id integer NOT NULL,PRIMARY KEY(category,card_id));
CREATE TABLE public.love_custom_challenges(couple_id uuid NOT NULL,category text NOT NULL,card_id integer NOT NULL);
CREATE TABLE public.couple_challenges(couple_id uuid NOT NULL,category text NOT NULL,card_id integer NOT NULL);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION public.love_require_verified_identity() RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Identité vérifiée requise'; END IF; END
$$;
CREATE FUNCTION couple_private.is_member(p_couple uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM public.couple_members m
 WHERE m.couple_id=p_couple AND m.user_id=auth.uid())
$$;
GRANT USAGE ON SCHEMA public,auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(),public.love_require_verified_identity() TO authenticated;
INSERT INTO auth.users VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.couples VALUES
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
INSERT INTO public.couple_members VALUES
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.couple_sessions VALUES
 ('11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd',now()-interval '1 hour',NULL),
 ('22222222-2222-4222-8222-222222222222','dddddddd-dddd-4ddd-8ddd-dddddddddddd',now()+interval '1 hour',NULL),
 ('33333333-3333-4333-8333-333333333333','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',now()-interval '1 hour',NULL);
INSERT INTO public.love_base_challenges VALUES ('SENSUEL',1);
INSERT INTO public.love_custom_challenges VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','SEXUEL',41);
INSERT INTO public.couple_challenges VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','SEXUEL',97);
\ir ../migrations/20261026_lr019_favorites_core.sql
-- Idempotent deployment on already migrated databases.
\ir ../migrations/20261026_lr019_favorites_core.sql
DO $acl$
BEGIN
 IF has_table_privilege('authenticated','public.love_couple_favorites','SELECT') THEN
  RAISE EXCEPTION 'Direct favorite table SELECT must remain revoked';
 END IF;
END $acl$;
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
DO $test$
DECLARE p uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; n integer;
BEGIN
 IF NOT public.set_love_couple_favorite(p,'SENSUEL',1,true) THEN RAISE EXCEPTION 'mark failed'; END IF;
 IF public.love_favorite_from_prior_evening(p,'11111111-1111-4111-8111-111111111111','SENSUEL',1) THEN
  RAISE EXCEPTION 'same-night favorite incorrectly unlocked'; END IF;
 IF NOT public.love_favorite_from_prior_evening(p,'22222222-2222-4222-8222-222222222222','SENSUEL',1) THEN
  RAISE EXCEPTION 'future-night favorite incorrectly blocked'; END IF;
 IF NOT public.set_love_couple_favorite(p,'SENSUEL',1,true) THEN RAISE EXCEPTION 'idempotence failed'; END IF;
 SELECT count(*) INTO n FROM public.my_love_couple_favorites(p);
 IF n<>1 THEN RAISE EXCEPTION 'duplicate favorite row: %',n; END IF;
 IF NOT public.set_love_couple_favorite(p,'SEXUEL',41,true) THEN RAISE EXCEPTION 'custom card failed'; END IF;
 IF NOT public.set_love_couple_favorite(p,'SEXUEL',97,true) THEN RAISE EXCEPTION 'archived card failed'; END IF;
 BEGIN
  PERFORM public.set_love_couple_favorite(p,'SEXUEL',98,true);
  RAISE EXCEPTION 'nonexistent card accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='nonexistent card accepted' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.set_love_couple_favorite(p,'SENSUEL',1,NULL);
  RAISE EXCEPTION 'null enabled accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='null enabled accepted' THEN RAISE; END IF;
 END;
END $test$;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
DO $test$
DECLARE p uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; n integer;
BEGIN
 SELECT count(*) INTO n FROM public.my_love_couple_favorites(p);
 IF n<>3 THEN RAISE EXCEPTION 'partner cannot see collective favorites: %',n; END IF;
 IF NOT public.set_love_couple_favorite(p,'SENSUEL',1,true) THEN RAISE EXCEPTION 'existing common heart should be idempotent'; END IF;
 IF (SELECT count(*) FROM public.my_love_couple_favorites(p))<>3 THEN
  RAISE EXCEPTION 'partner duplicated the shared heart'; END IF;
END $test$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
DO $test$
DECLARE p uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; n integer;
BEGIN
 IF public.set_love_couple_favorite(p,'SENSUEL',1,false) THEN
   RAISE EXCEPTION 'common heart not removed by couple member';
 END IF;
 SELECT count(*) INTO n FROM public.my_love_couple_favorites(p) WHERE category='SENSUEL' AND card_id=1;
 IF n<>0 THEN RAISE EXCEPTION 'shared heart survived explicit removal'; END IF;
 IF public.set_love_couple_favorite(p,'SEXUEL',41,false) THEN
   RAISE EXCEPTION 'removed heart remains set';
 END IF;
 IF public.set_love_couple_favorite(p,'SEXUEL',41,false) THEN
   RAISE EXCEPTION 'idempotent remove failed';
 END IF;
 BEGIN
  PERFORM public.my_love_couple_favorites('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  RAISE EXCEPTION 'cross-couple read accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='cross-couple read accepted' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.set_love_couple_favorite('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','SENSUEL',1,true);
  RAISE EXCEPTION 'cross-couple write accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='cross-couple write accepted' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.love_favorite_from_prior_evening(p,'33333333-3333-4333-8333-333333333333','SENSUEL',1);
  RAISE EXCEPTION 'cross-couple session accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='cross-couple session accepted' THEN RAISE; END IF;
 END;
END $test$;
ROLLBACK;
SELECT 'LR019_POSTGRES_OK shared hearts, partner visibility, archive, idempotence, ACL' AS result;
