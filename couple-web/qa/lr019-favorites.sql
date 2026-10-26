-- PostgreSQL 17 isolated fixture: no production user data or secrets.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA couple_private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.couples(id uuid PRIMARY KEY);
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
INSERT INTO public.love_base_challenges VALUES ('SENSUEL',1);
INSERT INTO public.love_custom_challenges VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','SEXUEL',41);
INSERT INTO public.couple_challenges VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','SEXUEL',97);
\ir ../migrations/20261026_lr019_favorites_core.sql
-- Idempotent deployment on already migrated databases.
\ir ../migrations/20261026_lr019_favorites_core.sql
SELECT CASE WHEN has_table_privilege('authenticated','public.love_couple_favorites','SELECT')
 THEN 1/0 ELSE 1 END AS no_direct_table_read;
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
DO $test$
DECLARE p uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; n integer;
BEGIN
 IF NOT public.set_love_couple_favorite(p,'SENSUEL',1,true) THEN RAISE EXCEPTION 'mark failed'; END IF;
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
 IF NOT public.set_love_couple_favorite(p,'SENSUEL',1,true) THEN RAISE EXCEPTION 'partner mark failed'; END IF;
END $test$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
DO $test$
DECLARE p uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; n integer;
BEGIN
 IF NOT public.set_love_couple_favorite(p,'SENSUEL',1,false) THEN
   RAISE EXCEPTION 'one person removed the other member heart';
 END IF;
 SELECT count(*) INTO n FROM public.my_love_couple_favorites(p) WHERE category='SENSUEL' AND card_id=1;
 IF n<>1 THEN RAISE EXCEPTION 'partner heart not retained'; END IF;
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
END $test$;
ROLLBACK;
SELECT 'LR019_POSTGRES_OK private hearts, partner visibility, archive, idempotence, ACL' AS result;
