-- Actual PostgreSQL RLS execution, as role authenticated; not mock SQL.
-- Only fabricated members and rows from lr026-staging-rls-fixture.sql.
-- DB is disposable CI PostgreSQL; no Supabase project connection.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('lr026.test_verified','yes',true);

DO $lr026_rls$
DECLARE
 a uuid:='11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 b uuid:='22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 c uuid:='33333333-cccc-4ccc-8ccc-cccccccccccc';
 d uuid:='44444444-dddd-4ddd-8ddd-dddddddddddd';
 ab uuid:='10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 other uuid:='20202020-cccc-4ccc-8ccc-cccccccccccc';
 ab_session uuid:='11111111-1111-4111-8111-222222222222';
 other_session uuid:='33333333-3333-4333-8333-444444444444';
 who uuid;
 n integer;
BEGIN
 -- Two valid members A/B can each read their duo's session and members,
 -- but not a different couple's session, members, D6 or challenges.
 FOREACH who IN ARRAY ARRAY[a,b] LOOP
   PERFORM pg_catalog.set_config('request.jwt.claim.sub',who::text,true);
   SELECT count(*) INTO n FROM public.couple_sessions;
   IF n<>1 THEN RAISE EXCEPTION 'RLS: A/B must see exactly one own session, got %',n; END IF;
   SELECT count(*) INTO n FROM public.couple_sessions WHERE id=other_session;
   IF n<>0 THEN RAISE EXCEPTION 'RLS: member saw outside session'; END IF;
   SELECT count(*) INTO n FROM public.couple_members;
   IF n<>2 THEN RAISE EXCEPTION 'RLS: A/B must see only own two memberships'; END IF;
   SELECT count(*) INTO n FROM public.couple_members WHERE couple_id=other;
   IF n<>0 THEN RAISE EXCEPTION 'RLS: member saw outsider memberships'; END IF;
   SELECT count(*) INTO n FROM public.couple_personal_rolls WHERE session_id=ab_session;
   IF n<>2 THEN RAISE EXCEPTION 'RLS: A/B must see their two D6 rolls'; END IF;
   SELECT count(*) INTO n FROM public.couple_personal_rolls WHERE session_id=other_session;
   IF n<>0 THEN RAISE EXCEPTION 'RLS: member saw outsider D6 rolls'; END IF;
   SELECT count(*) INTO n FROM public.couple_challenges WHERE session_id=other_session;
   IF n<>0 THEN RAISE EXCEPTION 'RLS: member saw outsider challenges'; END IF;
 END LOOP;

 -- Challenge RLS also protects partner's accepted card, even within duo.
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT count(*) INTO n FROM public.couple_challenges WHERE session_id=ab_session;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: drawer A saw partner B private card'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 SELECT count(*) INTO n FROM public.couple_challenges WHERE session_id=ab_session;
 IF n<>1 THEN RAISE EXCEPTION 'RLS: recipient B must see their challenge'; END IF;

 -- C must positively see their own separate couple, and no A/B data.
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',c::text,true);
 SELECT count(*) INTO n FROM public.couple_sessions WHERE id=other_session;
 IF n<>1 THEN RAISE EXCEPTION 'RLS: outsider C missing own session'; END IF;
 SELECT count(*) INTO n FROM public.couple_members WHERE couple_id=other;
 IF n<>1 THEN RAISE EXCEPTION 'RLS: outsider C missing own membership'; END IF;
 SELECT count(*) INTO n FROM public.couple_personal_rolls WHERE session_id=other_session;
 IF n<>1 THEN RAISE EXCEPTION 'RLS: outsider C missing own D6'; END IF;
 SELECT count(*) INTO n FROM public.couple_challenges WHERE session_id=other_session;
 IF n<>1 THEN RAISE EXCEPTION 'RLS: outsider C missing own challenge'; END IF;
 SELECT count(*) INTO n FROM public.couple_sessions WHERE id=ab_session;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: outsider C saw A/B session'; END IF;
 SELECT count(*) INTO n FROM public.couple_members WHERE couple_id=ab;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: outsider C saw A/B members'; END IF;
 SELECT count(*) INTO n FROM public.couple_personal_rolls WHERE session_id=ab_session;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: outsider C saw A/B D6'; END IF;
 SELECT count(*) INTO n FROM public.couple_challenges WHERE session_id=ab_session;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: outsider C saw A/B challenges'; END IF;

 -- Authenticated user with no couple should see nothing.
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',d::text,true);
 SELECT count(*) INTO n FROM public.couple_sessions;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unassociated authenticated account sees sessions'; END IF;
 SELECT count(*) INTO n FROM public.couple_members;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unassociated authenticated account sees members'; END IF;
 SELECT count(*) INTO n FROM public.couple_personal_rolls;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unassociated authenticated account sees D6'; END IF;
 SELECT count(*) INTO n FROM public.couple_challenges;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unassociated authenticated account sees challenges'; END IF;

 -- Verified email is RESTRICTIVE across all four tables, not OR bypass.
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 PERFORM pg_catalog.set_config('lr026.test_verified','no',true);
 SELECT count(*) INTO n FROM public.couple_sessions;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unverified user saw session'; END IF;
 SELECT count(*) INTO n FROM public.couple_members;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unverified user saw membership'; END IF;
 SELECT count(*) INTO n FROM public.couple_personal_rolls;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unverified user saw D6'; END IF;
 SELECT count(*) INTO n FROM public.couple_challenges;
 IF n<>0 THEN RAISE EXCEPTION 'RLS: unverified user saw challenge'; END IF;
END;
$lr026_rls$;

ROLLBACK;
