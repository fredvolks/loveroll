-- LR-015: a restored card must be eligible again unless already completed
-- in the same 200-challenge cycle. Everything here uses fake records.
\set ON_ERROR_STOP on
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
-- Card 1 was refused/excluded; reconstruct its old bag marker to demonstrate
-- that merely deleting the exclusion would not have restored eligibility.
INSERT INTO public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'11111111-1111-4111-8111-111111111111','SENSUEL',1)
ON CONFLICT DO NOTHING;
DO $test$
BEGIN
 IF public.restore_love_cycle_exclusion('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SENSUEL',1) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Excluded card was not restored';END IF;
 IF EXISTS(SELECT 1 FROM public.love_cycle_excluded_cards
 WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND category='SENSUEL' AND card_id=1)
 THEN RAISE EXCEPTION 'Restored card remains excluded';END IF;
 IF EXISTS(SELECT 1 FROM public.love_card_draw_history
 WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND category='SENSUEL' AND card_id=1)
 THEN RAISE EXCEPTION 'Restored card remains blocked in shuffle bag';END IF;
END
$test$;
-- Card 15 has a completed occurrence in the current cycle; restoration
-- must preserve that achievement and its protected no-repeat history.
INSERT INTO public.love_cycle_excluded_cards(
 couple_id,cycle_number,category,card_id,excluded_by)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'SENSUEL',15,
'11111111-1111-4111-8111-111111111111')
ON CONFLICT DO NOTHING;
DO $test$
BEGIN
 IF public.restore_love_cycle_exclusion('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SENSUEL',15) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Completed card exclusion could not be removed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.love_card_draw_history
 WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND category='SENSUEL' AND card_id=15)
 THEN RAISE EXCEPTION 'Restoration reintroduced a completed card';END IF;
END
$test$;
SELECT 'LR015_RESTORED_BAG_OK' AS result;
