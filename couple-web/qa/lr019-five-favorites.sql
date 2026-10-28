\set ON_ERROR_STOP on
-- LR-019 official master: one collective 5-card limit, never 5 per member.
-- The first SENSUEL/1 was starred by Alice during draw-integration SQL.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $five$
DECLARE duo uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 n integer; blocked boolean:=false;
BEGIN
 FOR n IN 2..5 LOOP
  PERFORM public.set_love_couple_favorite(duo,'SENSUEL',n,true);
 END LOOP;
 IF (SELECT count(*) FROM public.love_couple_favorites WHERE couple_id=duo)<>5
 THEN RAISE EXCEPTION 'Expected exactly five shared hearts'; END IF;
 -- Sixth card across the second category must fail without deleting any.
 BEGIN
  PERFORM public.set_love_couple_favorite(duo,'SEXUEL',1,true);
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Maximum de 5 coups de cœur atteint%' THEN blocked:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Sixth shared favorite accepted'; END IF;
 IF NOT public.replace_love_couple_favorite(duo,'SENSUEL',2,'SEXUEL',1)
 THEN RAISE EXCEPTION 'Atomic replacement failed'; END IF;
 IF (SELECT count(*) FROM public.love_couple_favorites WHERE couple_id=duo)<>5
 OR EXISTS(SELECT 1 FROM public.love_couple_favorites WHERE couple_id=duo AND category='SENSUEL' AND card_id=2)
 OR NOT EXISTS(SELECT 1 FROM public.love_couple_favorites WHERE couple_id=duo AND category='SEXUEL' AND card_id=1)
 THEN RAISE EXCEPTION 'Single-click replacement was not atomic'; END IF;
 IF NOT public.replace_love_couple_favorite(duo,'SENSUEL',2,'SEXUEL',1)
 THEN RAISE EXCEPTION 'Lost-response retry was not idempotent'; END IF;
 BEGIN
  PERFORM public.replace_love_couple_favorite(duo,'SENSUEL',3,'SEXUEL',99);
  RAISE EXCEPTION 'Invalid replacement was accepted';
 EXCEPTION WHEN others THEN
  IF SQLERRM='Invalid replacement was accepted' THEN RAISE; END IF;
 END;
 IF NOT EXISTS(SELECT 1 FROM public.love_couple_favorites WHERE couple_id=duo AND category='SENSUEL' AND card_id=3)
 THEN RAISE EXCEPTION 'Failed replacement deleted an existing favorite'; END IF;
END $five$;

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $partner$
DECLARE duo uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; blocked boolean:=false;
BEGIN
 -- Two members share the same limit and can both manage the collective set.
 PERFORM public.set_love_couple_favorite(duo,'SENSUEL',1,true);
 IF (SELECT count(*) FROM public.love_couple_favorites WHERE couple_id=duo)<>5
 THEN RAISE EXCEPTION 'Duplicate shared favorite counted twice'; END IF;
 BEGIN
  PERFORM public.set_love_couple_favorite(duo,'SENSUEL',6,true);
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Maximum de 5 coups de cœur atteint%' THEN blocked:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Partner exceeded shared five limit'; END IF;
 IF public.set_love_couple_favorite(duo,'SENSUEL',3,false) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Partner could not remove a common favorite'; END IF;
 IF NOT public.set_love_couple_favorite(duo,'SENSUEL',6,true)
 THEN RAISE EXCEPTION 'Partner could not use the freed shared slot'; END IF;
 IF (SELECT count(*) FROM public.love_couple_favorites WHERE couple_id=duo)<>5
 THEN RAISE EXCEPTION 'Collective count was not restored to five'; END IF;
END $partner$;
SELECT 'LR019_FIVE_SHARED_FAVORITES_ATOMIC_OK' AS result;
