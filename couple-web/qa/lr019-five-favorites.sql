\set ON_ERROR_STOP on
-- Runs on PostgreSQL 17 after the isolated LR-015/LR-019 fixture and draw tests.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $five$
DECLARE duo uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 n integer; blocked boolean:=false;
BEGIN
 -- SENSUEL 1 is already starred in lr019-draw-integration.sql.
 FOR n IN 2..5 LOOP
   PERFORM public.set_love_couple_favorite(duo,'SENSUEL',n,true);
 END LOOP;
 IF (SELECT count(*) FROM public.love_couple_favorites
      WHERE couple_id=duo AND marked_by=(SELECT auth.uid()))<>5
 THEN RAISE EXCEPTION 'Expected five own hearts'; END IF;
 PERFORM public.set_love_couple_favorite(duo,'SENSUEL',5,true);
 BEGIN
   PERFORM public.set_love_couple_favorite(duo,'SEXUEL',1,true);
 EXCEPTION WHEN others THEN
   IF SQLERRM LIKE 'Maximum de 5 coups de cœur atteint%' THEN blocked:=true;
   ELSE RAISE; END IF;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Sixth favorite accepted'; END IF;
 PERFORM public.set_love_couple_favorite(duo,'SENSUEL',2,false);
 PERFORM public.set_love_couple_favorite(duo,'SEXUEL',1,true);
 IF (SELECT count(*) FROM public.love_couple_favorites
      WHERE couple_id=duo AND marked_by=(SELECT auth.uid()))<>5
 THEN RAISE EXCEPTION 'Exchange broke five-heart quota'; END IF;
END $five$;

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $partner$
DECLARE duo uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 n integer; blocked boolean:=false;
BEGIN
 FOR n IN 1..5 LOOP
   PERFORM public.set_love_couple_favorite(duo,'SEXUEL',n,true);
 END LOOP;
 BEGIN
   PERFORM public.set_love_couple_favorite(duo,'SENSUEL',6,true);
 EXCEPTION WHEN others THEN
   IF SQLERRM LIKE 'Maximum de 5 coups de cœur atteint%' THEN blocked:=true;
   ELSE RAISE; END IF;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Partner exceeded own limit'; END IF;
 IF (SELECT count(*) FROM public.love_couple_favorites WHERE couple_id=duo)<>10
 THEN RAISE EXCEPTION 'Member quota leaked to the other member'; END IF;
END $partner$;
SELECT 'LR019_FIVE_FAVORITES_PER_MEMBER_OK' AS result;
