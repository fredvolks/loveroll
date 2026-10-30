-- These assertions run against a disposable PostgreSQL CI database only.
DO $lr026_rank_test$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        first_session uuid:='11111111-1111-4111-8111-111111111111';
        other_session uuid:='22222222-2222-4222-8222-222222222222';
BEGIN
 -- The exact already drawn card is similar.
 IF couple_private.love_variety_rank(first_session,a,'SENSUEL',1)<>1 THEN
   RAISE EXCEPTION 'LR-026: failed to rank previously drawn card';
 END IF;
 -- A different eligible activity must retain priority.
 IF couple_private.love_variety_rank(first_session,a,'SENSUEL',2)<>0 THEN
   RAISE EXCEPTION 'LR-026: unrelated activity falsely penalized';
 END IF;
 -- A custom card from the active bank with an equivalent title ranks as similar.
 IF couple_private.love_variety_rank(first_session,a,'SENSUEL',3)<>1 THEN
   RAISE EXCEPTION 'LR-026: failed active custom card similarity';
 END IF;
 -- No cross-session or cross-couple history leakage.
 IF couple_private.love_variety_rank(other_session,a,'SENSUEL',1)<>0 THEN
   RAISE EXCEPTION 'LR-026: leaked history between sessions';
 END IF;
 IF couple_private.love_variety_rank(first_session,b,'SENSUEL',1)<>0 THEN
   RAISE EXCEPTION 'LR-026: leaked history between couples';
 END IF;
 -- Official category remains independent.
 IF couple_private.love_variety_rank(first_session,a,'SEXUEL',1)<>0 THEN
   RAISE EXCEPTION 'LR-026: penalized unrelated category/activity';
 END IF;
END; $lr026_rank_test$;

-- The SQL comparator never edits the library, history, or played challenges.
SELECT
 (SELECT count(*) FROM public.couple_challenges) AS original_history_rows,
 (SELECT count(*) FROM public.love_base_challenges) AS original_base_cards,
 (SELECT count(*) FROM couple_private.love_active_challenges) AS original_custom_cards;
