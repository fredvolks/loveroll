-- Execute the TWO ACTUAL reviewed LoveRoll RPC bodies, after the real
-- guarded LR-026 migration, on disposable PostgreSQL 17. Synthetic A/B
-- identity claims replace real Supabase Auth; no real customers or sessions.
-- This is stronger than the old stand-in RPC fixture, but NOT an actual
-- Supabase Auth/JWT end-to-end deployment and not a replica of every table.
BEGIN;

-- Fixed, fabricated user/couple/session IDs.
INSERT INTO public.couples(
 id,owner_user_id,category_preference_percent,monthly_pass_limit,
 challenge_cycle_number,challenge_cycle_started_at,sexual_card_mode)
VALUES(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',100,1,1,
 now()-interval '7 days','custom');
INSERT INTO public.couple_members(couple_id,user_id)
VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');
INSERT INTO public.couple_profiles(id,gender,play_style)
VALUES
 ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','him','medium'),
 ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb','her','medium');
INSERT INTO public.couple_sessions(
 id,couple_id,opened_by,paired_turns,self_draws)
VALUES(
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',false,false);
INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',2),
 ('11111111-1111-4111-8111-111111111111','bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',2);

INSERT INTO public.love_base_challenges(category,card_id,title,description,timer_minutes)
SELECT cat,g,
 CASE WHEN cat='SENSUEL' AND g IN (1,2)
      THEN 'Baisers au clair de lune'
      ELSE 'Proposition nouvelle numéro '||g END,
 CASE WHEN g=1 THEN 'Un moment tendre et plein de douceur'
      WHEN g=2 THEN 'Une scène différente avec une ambiance romantique'
      ELSE 'Une expérience amusante et inédite pour le duo '||g END,
 3::smallint
FROM (VALUES('SENSUEL'::text),('SEXUEL'::text)) cats(cat)
CROSS JOIN pg_catalog.generate_series(1,25) g;
-- Leave only cards 1,2,3 of SENSUEL available. Card 1 has already been
-- completed by B. Card 2 is a different ID but SAME semantic title.
-- Card 3 is genuinely novel, so the first real D100 RPC must pick 3.
INSERT INTO public.love_cycle_excluded_cards(
 couple_id,cycle_number,category,card_id,excluded_by)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'SENSUEL',g,
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
FROM pg_catalog.generate_series(4,25) g;
INSERT INTO public.couple_challenges(
 id,session_id,couple_id,offered_by,recipient,category,face,card_id,
 card_title,card_description,status)
VALUES(
 'cccccccc-1111-4111-8111-cccccccccccc',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
 'SENSUEL',1,1,'Baisers au clair de lune',
 'Un moment tendre et plein de douceur','completed');
INSERT INTO public.love_card_draw_history(
 couple_id,recipient_user_id,category,card_id)
VALUES(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb','SENSUEL',1);

DO $lr026_real_e2e$
DECLARE
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 outsider uuid:='ffffffff-ffff-4fff-8fff-ffffffffffff';
 s uuid:='11111111-1111-4111-8111-111111111111';
 drawn public.couple_challenges%rowtype;
 a_draw public.couple_challenges%rowtype;
 replacement public.couple_challenges%rowtype;
 result jsonb;
 stamp timestamptz;
 passed integer;
 blocked boolean;
 error_text text;
BEGIN
 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);

 -- Membership and verified-email gates from the original real RPC.
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',outsider::text,true);
 blocked:=false;
 BEGIN
  PERFORM public.draw_for_partner(s,'SENSUEL',false);
 EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
    IF error_text<>'Soirée inaccessible' THEN
      RAISE EXCEPTION 'REAL RPC: unexpected outsider rejection: %',error_text;
    END IF;
    blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'REAL RPC: outsider managed to draw';END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 PERFORM pg_catalog.set_config('lr026.test_verified','no',true);
 blocked:=false;
 BEGIN
  PERFORM public.draw_for_partner(s,'SENSUEL',false);
 EXCEPTION WHEN SQLSTATE '28000' THEN blocked:=true;
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'REAL RPC: unverified identity managed to draw';
 END IF;
 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);

 -- The original draw's category, role, cycle and bag guards execute here.
 SELECT * INTO drawn FROM public.draw_for_partner(s,'SENSUEL',false);
 IF drawn.card_id IS DISTINCT FROM 3
   OR drawn.recipient IS DISTINCT FROM b
   OR drawn.offered_by IS DISTINCT FROM a
   OR drawn.category IS DISTINCT FROM 'SENSUEL'
   OR drawn.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC: first D100 draw changed eligibility %',drawn;
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.love_card_draw_history
   WHERE couple_id=drawn.couple_id AND recipient_user_id=b
    AND category='SENSUEL' AND card_id=3
 ) THEN
  RAISE EXCEPTION 'REAL RPC: selected card missing from persistent bag';
 END IF;
 -- Repeat draw is denied until B responds.
 blocked:=false;
 BEGIN
  PERFORM public.draw_for_partner(s,'SENSUEL',false);
 EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
    IF error_text<>'Attendre la réponse au défi précédent' THEN
      RAISE EXCEPTION 'REAL RPC: unexpected repeat-draw rejection: %',error_text;
    END IF;
    blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'REAL RPC: overlapping open challenge'; END IF;

 -- Only B may pass B's card; A must be rejected by the real RPC.
 blocked:=false;
 BEGIN
  PERFORM public.love_respond_and_redraw(drawn.id,'pass',false);
 EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
    IF error_text<>'Seul le destinataire peut répondre' THEN
      RAISE EXCEPTION 'REAL RPC: unexpected wrong-recipient rejection: %',error_text;
    END IF;
    blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'REAL RPC: wrong recipient passed'; END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 SELECT public.love_respond_and_redraw(drawn.id,'pass',false) INTO result;
 IF result->>'action'<>'pass' OR
     result->>'already_processed'<>'false' OR
     result->>'replacement_id' IS NULL THEN
  RAISE EXCEPTION 'REAL RPC: invalid successful pass result %',result;
 END IF;
 SELECT * INTO replacement FROM public.couple_challenges
 WHERE id=(result->>'replacement_id')::uuid;
 IF replacement.card_id IS DISTINCT FROM 2
   OR replacement.recipient IS DISTINCT FROM b
   OR replacement.replaces_challenge_id IS DISTINCT FROM drawn.id
   OR replacement.category IS DISTINCT FROM 'SENSUEL' THEN
  RAISE EXCEPTION 'REAL RPC: replacement violated category/turn %',
      replacement;
 END IF;
 SELECT passed_at INTO stamp FROM public.couple_challenges WHERE id=drawn.id;
 IF stamp IS NULL THEN
  RAISE EXCEPTION 'REAL RPC: production pass-stamp trigger failed';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.love_challenge_redraws
  WHERE origin_id=drawn.id AND replacement_id=replacement.id)
 THEN RAISE EXCEPTION 'REAL RPC: idempotency receipt missing';END IF;

 -- Double-tap is idempotent; it does not consume another pass or repick.
 SELECT public.love_respond_and_redraw(drawn.id,'pass',false) INTO result;
 IF result->>'already_processed'<>'true'
  OR (result->>'replacement_id')::uuid IS DISTINCT FROM replacement.id
 THEN RAISE EXCEPTION 'REAL RPC: repeated pass not idempotent %',result;END IF;

 -- B has now used monthly pass 1/1. A has a distinct, independent quota.
 blocked:=false;
 BEGIN
  PERFORM public.love_respond_and_redraw(replacement.id,'pass',false);
 EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
    IF error_text NOT LIKE 'Limite mensuelle de passes atteinte%' THEN
      RAISE EXCEPTION 'REAL RPC: unexpected quota rejection: %',error_text;
    END IF;
    blocked:=true;
 END;
 IF NOT blocked OR (SELECT status FROM public.couple_challenges
      WHERE id=replacement.id)<>'proposed' THEN
  RAISE EXCEPTION 'REAL RPC: monthly pass quota not atomic';
 END IF;

 -- Refusing the final B challenge cannot consume it if the category
 -- has no admissible replacement: everything must roll back.
 blocked:=false;
 BEGIN
  PERFORM public.love_respond_and_redraw(replacement.id,'refuse',true);
 EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
    IF error_text<>'Aucun autre défi admissible dans cette catégorie pour ce soir' THEN
      RAISE EXCEPTION 'REAL RPC: unexpected refusal rollback error: %',error_text;
    END IF;
    blocked:=true;
 END;
 IF NOT blocked
    OR (SELECT status FROM public.couple_challenges WHERE id=replacement.id)
      <>'proposed'
    OR EXISTS(SELECT 1 FROM public.love_cycle_excluded_cards
      WHERE couple_id=drawn.couple_id AND category='SENSUEL'
       AND card_id=2)
 THEN
  RAISE EXCEPTION 'REAL RPC: exhausted refusal failed to roll back';
 END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 SELECT * INTO a_draw FROM public.draw_for_partner(s,'SENSUEL',false);
 IF a_draw.recipient IS DISTINCT FROM a THEN
  RAISE EXCEPTION 'REAL RPC: B did not draw for partner A';
 END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT public.love_respond_and_redraw(a_draw.id,'pass',false) INTO result;
 IF result->>'action'<>'pass' OR result->>'already_processed'<>'false'
 THEN RAISE EXCEPTION 'REAL RPC: A independent pass failed %',result;END IF;
 SELECT count(*) INTO passed FROM public.couple_challenges
 WHERE couple_id=drawn.couple_id AND status='passed';
 IF passed<>2 THEN
  RAISE EXCEPTION 'REAL RPC: expected A+B independent monthly passes, got %',
     passed;
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC: normal D100, semantic priority, pass/redraw, A/B quota, idempotency, rollback and identity passed';
END; $lr026_real_e2e$;

-- SQL ACL protection is preserved in the isolated snapshot.
DO $lr026_real_rights$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
  'public.draw_for_partner(uuid,text,boolean)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
  'public.love_respond_and_redraw(uuid,text,boolean)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('authenticated',
  'public.draw_for_partner(uuid,text,boolean)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('authenticated',
  'public.love_respond_and_redraw(uuid,text,boolean)','EXECUTE') THEN
  RAISE EXCEPTION 'REAL RPC: browser RPC rights widened in test clone';
 END IF;
END; $lr026_real_rights$;

ROLLBACK;
