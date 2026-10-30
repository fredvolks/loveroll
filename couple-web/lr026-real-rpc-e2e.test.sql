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
 a_replacement public.couple_challenges%rowtype;
 refusal_replacement public.couple_challenges%rowtype;
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

 -- NEW: the reverse B -> A route must also handle a genuine Refuser with
 -- exclusion, using the exact production function in this disposable DB.
 -- A has already exhausted her/his monthly Passer allowance; Refuser is
 -- independent of that quota and must keep recipient/offerer/category.
 SELECT * INTO a_replacement FROM public.couple_challenges
 WHERE id=(result->>'replacement_id')::uuid;
 IF NOT FOUND OR a_replacement.recipient IS DISTINCT FROM a
   OR a_replacement.offered_by IS DISTINCT FROM b
   OR a_replacement.category IS DISTINCT FROM a_draw.category
   OR a_replacement.card_id=a_draw.card_id
   OR a_replacement.face=a_draw.face
   OR a_replacement.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC: reverse pass replacement incorrect %',a_replacement;
 END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 blocked:=false;
 BEGIN
  PERFORM public.love_respond_and_redraw(a_replacement.id,'refuse',true);
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
  IF error_text<>'Seul le destinataire peut répondre' THEN
   RAISE EXCEPTION 'REAL RPC: unexpected reverse refusal denial: %',error_text;
  END IF;
  blocked:=true;
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'REAL RPC: B refused a challenge destined for A';
 END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT public.love_respond_and_redraw(a_replacement.id,'refuse',true) INTO result;
 IF result->>'action'<>'refuse'
   OR result->>'excluded'<>'true'
   OR result->>'already_processed'<>'false'
   OR result->>'replacement_unavailable'<>'false'
   OR result->>'replacement_id' IS NULL THEN
  RAISE EXCEPTION 'REAL RPC: reverse refusal/exclusion response incorrect %',result;
 END IF;
 SELECT * INTO refusal_replacement FROM public.couple_challenges
 WHERE id=(result->>'replacement_id')::uuid;
 IF NOT FOUND OR refusal_replacement.recipient IS DISTINCT FROM a
   OR refusal_replacement.offered_by IS DISTINCT FROM b
   OR refusal_replacement.category IS DISTINCT FROM a_draw.category
   OR refusal_replacement.replaces_challenge_id IS DISTINCT FROM a_replacement.id
   OR refusal_replacement.card_id IN (a_draw.card_id,a_replacement.card_id)
   OR refusal_replacement.face IN (a_draw.face,a_replacement.face)
   OR refusal_replacement.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC: reverse refusal replacement invalid %',refusal_replacement;
 END IF;
 IF (SELECT status FROM public.couple_challenges WHERE id=a_replacement.id)
     <>'refused'
    OR (SELECT refused_at FROM public.couple_challenges
        WHERE id=a_replacement.id) IS NULL
    OR NOT EXISTS(
      SELECT 1 FROM public.love_cycle_excluded_cards ex
      WHERE ex.couple_id=drawn.couple_id AND ex.cycle_number=1
        AND ex.category=a_replacement.category AND ex.card_id=a_replacement.card_id
        AND ex.excluded_by=a)
 THEN
  RAISE EXCEPTION 'REAL RPC: reverse refusal did not persist exclusion and timestamp';
 END IF;
 -- Repeated Refuser is idempotent despite already-refused status.
 SELECT public.love_respond_and_redraw(a_replacement.id,'refuse',true) INTO result;
 IF result->>'already_processed'<>'true'
   OR result->>'action'<>'refuse'
   OR result->>'excluded'<>'true'
   OR (result->>'replacement_id')::uuid IS DISTINCT FROM refusal_replacement.id
 THEN
  RAISE EXCEPTION 'REAL RPC: reverse refusal replay not idempotent %',result;
 END IF;
 SELECT count(*) INTO passed FROM public.couple_challenges
 WHERE couple_id=drawn.couple_id AND status='passed';
 IF passed<>2 OR
   (SELECT count(*) FROM public.love_challenge_redraws
     WHERE origin_id=a_replacement.id)<>1
 THEN
  RAISE EXCEPTION 'REAL RPC: reverse refusal consumed Passer quota or duplicated receipt';
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC: both directions, pass/refuse with exclusion, category and face uniqueness, A/B quota, idempotency, rollback and identity passed';
END; $lr026_real_e2e$;

-- Verify the ORIGINAL production RPC's custom-card assignment rules,
-- including owner/partner, gender and hard user locks, in both directions.
-- The only reachable card for owner A -> partner B must be #30.
DO $lr026_real_roles$
DECLARE
 pair uuid:='cccccccc-aaaa-4aaa-8aaa-cccccccccccc';
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 s uuid:='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
 drawn public.couple_challenges%rowtype;
 blocked boolean:=false;
 rejection text;
BEGIN
 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 INSERT INTO public.couples(id,owner_user_id,category_preference_percent)
 VALUES(pair,a,100);
 INSERT INTO public.couple_members(couple_id,user_id)
 VALUES(pair,a),(pair,b);
 INSERT INTO public.couple_sessions(id,couple_id,opened_by)
 VALUES(s,pair,a);
 INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
 VALUES(s,a,2),(s,b,2);

 INSERT INTO public.love_cycle_excluded_cards(
  couple_id,cycle_number,category,card_id)
 SELECT pair,1,category,g
 FROM (VALUES ('SENSUEL'::text),('SEXUEL'::text)) cats(category)
 CROSS JOIN pg_catalog.generate_series(1,25) g;
 INSERT INTO public.love_custom_challenges(
  couple_id,category,card_id,title,description,
  drawer_role,recipient_role,recipient_user_id,drawer_user_id)
 VALUES
  (pair,'SENSUEL',26,'Owner only',
   'Excluded by recipient owner rule','owner','owner',NULL,NULL),
  (pair,'SENSUEL',27,'Partner only',
   'Excluded by drawer partner rule','partner','partner',NULL,NULL),
  (pair,'SENSUEL',28,'Recipient user A',
   'Excluded by recipient lock', 'both','both',a,a),
  (pair,'SENSUEL',29,'Drawer user B',
   'Excluded by drawer lock','both','both',b,b),
  (pair,'SENSUEL',30,'Allowed A to B',
   'Exactly one eligible gender-aware custom card','him','her',NULL,NULL);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT * INTO drawn FROM public.draw_for_partner(s,'SENSUEL',false);
 IF drawn.card_id IS DISTINCT FROM 30 OR
    drawn.offered_by IS DISTINCT FROM a OR drawn.recipient IS DISTINCT FROM b
 THEN
  RAISE EXCEPTION 'REAL RPC: custom role or identity filters bypassed %',
   drawn;
 END IF;

 -- Reverse direction must have zero valid cards, even though four other
 -- custom cards exist. An unrelated SQL error must not count as denial.
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 BEGIN
  PERFORM public.draw_for_partner(s,'SENSUEL',false);
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS rejection=MESSAGE_TEXT;
  IF rejection<>'Toutes les cartes ont déjà été proposées' THEN
   RAISE EXCEPTION 'REAL RPC: unexpected reverse-role rejection %',rejection;
  END IF;
  blocked:=true;
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'REAL RPC: wrong-direction custom role restriction bypass';
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC role assignment: gender, owner/partner and per-user custom-card locks passed';
END; $lr026_real_roles$;

-- Cover the live SEXUEL category with the exact same two real SQL RPCs,
-- in both directions. All identities and rows are disposable, rolled back.
DO $lr026_real_sexuel$
DECLARE
 pair uuid:='dddddddd-aaaa-4aaa-8aaa-dddddddddddd';
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 s uuid:='dddddddd-2222-4222-8222-dddddddddddd';
 for_b public.couple_challenges%rowtype;
 for_a public.couple_challenges%rowtype;
 next_b public.couple_challenges%rowtype;
 next_a public.couple_challenges%rowtype;
 reply jsonb;
 blocked boolean;
 rejection text;
BEGIN
 INSERT INTO public.couples(
  id,owner_user_id,category_preference_percent,monthly_pass_limit,
  sexual_card_mode
 ) VALUES(pair,a,100,1,'custom');
 INSERT INTO public.couple_members(couple_id,user_id)
 VALUES(pair,a),(pair,b);
 INSERT INTO public.couple_sessions(id,couple_id,opened_by,paired_turns,self_draws)
 VALUES(s,pair,a,false,false);
 INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
 VALUES(s,a,2),(s,b,2);
 -- Keep a small but non-exhausted SEXUEL-only pool; the real base cards
 -- from the preceding fixture are still present in both categories.
 INSERT INTO public.love_cycle_excluded_cards(
  couple_id,cycle_number,category,card_id
 )
 SELECT pair,1,cat.category,g
 FROM (VALUES ('SENSUEL'::text),('SEXUEL'::text)) cat(category)
 CROSS JOIN pg_catalog.generate_series(1,25) g
 WHERE cat.category='SENSUEL' OR g>8;

 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT * INTO for_b FROM public.draw_for_partner(s,'SEXUEL',false);
 IF for_b.category IS DISTINCT FROM 'SEXUEL'
   OR for_b.offered_by IS DISTINCT FROM a
   OR for_b.recipient IS DISTINCT FROM b
   OR for_b.face NOT BETWEEN 1 AND 100
   OR for_b.card_id NOT BETWEEN 1 AND 8
   OR for_b.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: A-to-B draw invalid %',for_b;
 END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 SELECT * INTO for_a FROM public.draw_for_partner(s,'SEXUEL',false);
 IF for_a.category IS DISTINCT FROM 'SEXUEL'
   OR for_a.offered_by IS DISTINCT FROM b
   OR for_a.recipient IS DISTINCT FROM a
   OR for_a.face NOT BETWEEN 1 AND 100
   OR for_a.card_id NOT BETWEEN 1 AND 8
   OR for_a.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: B-to-A draw invalid %',for_a;
 END IF;

 -- Both active challenges are recipient-private: the giver cannot
 -- respond to the card they offered in either direction.
 blocked:=false;
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 BEGIN
  PERFORM public.love_respond_and_redraw(for_b.id,'pass',false);
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS rejection=MESSAGE_TEXT;
  IF rejection<>'Seul le destinataire peut répondre' THEN
   RAISE EXCEPTION 'REAL RPC SEXUEL: wrong A response error: %',rejection;
  END IF;
  blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'REAL RPC SEXUEL: A passed B card'; END IF;
 blocked:=false;
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 BEGIN
  PERFORM public.love_respond_and_redraw(for_a.id,'refuse',true);
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS rejection=MESSAGE_TEXT;
  IF rejection<>'Seul le destinataire peut répondre' THEN
   RAISE EXCEPTION 'REAL RPC SEXUEL: wrong B refusal error: %',rejection;
  END IF;
  blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'REAL RPC SEXUEL: B refused A card'; END IF;

 -- B spends one Passer; A instead refuses and excludes their own original.
 SELECT public.love_respond_and_redraw(for_b.id,'pass',false) INTO reply;
 IF reply->>'action'<>'pass' OR reply->>'excluded'<>'false'
   OR reply->>'already_processed'<>'false'
   OR reply->>'replacement_unavailable'<>'false' THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: B Passer result invalid %',reply;
 END IF;
 SELECT * INTO next_b FROM public.couple_challenges
 WHERE id=(reply->>'replacement_id')::uuid;
 IF NOT FOUND OR next_b.status IS DISTINCT FROM 'proposed'
   OR next_b.category IS DISTINCT FROM 'SEXUEL'
   OR next_b.recipient IS DISTINCT FROM b
   OR next_b.offered_by IS DISTINCT FROM a
   OR next_b.replaces_challenge_id IS DISTINCT FROM for_b.id
   OR next_b.card_id IS NOT DISTINCT FROM for_b.card_id
   OR next_b.face IS NOT DISTINCT FROM for_b.face THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: B replacement invalid %',next_b;
 END IF;
 IF (SELECT status FROM public.couple_challenges WHERE id=for_b.id)<>'passed'
   OR (SELECT passed_at FROM public.couple_challenges WHERE id=for_b.id) IS NULL THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: B Passer status or stamp missing';
 END IF;
 SELECT public.love_respond_and_redraw(for_b.id,'pass',false) INTO reply;
 IF reply->>'already_processed'<>'true'
   OR reply->>'action'<>'pass' OR reply->>'excluded'<>'false'
   OR (reply->>'replacement_id')::uuid IS DISTINCT FROM next_b.id THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: B Passer replay changed %',reply;
 END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT public.love_respond_and_redraw(for_a.id,'refuse',true) INTO reply;
 IF reply->>'action'<>'refuse' OR reply->>'excluded'<>'true'
   OR reply->>'already_processed'<>'false'
   OR reply->>'replacement_unavailable'<>'false' THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: A refusal result invalid %',reply;
 END IF;
 SELECT * INTO next_a FROM public.couple_challenges
 WHERE id=(reply->>'replacement_id')::uuid;
 IF NOT FOUND OR next_a.status IS DISTINCT FROM 'proposed'
   OR next_a.category IS DISTINCT FROM 'SEXUEL'
   OR next_a.recipient IS DISTINCT FROM a
   OR next_a.offered_by IS DISTINCT FROM b
   OR next_a.replaces_challenge_id IS DISTINCT FROM for_a.id
   OR next_a.card_id IS NOT DISTINCT FROM for_a.card_id
   OR next_a.face IS NOT DISTINCT FROM for_a.face THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: A replacement invalid %',next_a;
 END IF;
 IF (SELECT status FROM public.couple_challenges WHERE id=for_a.id)<>'refused'
   OR (SELECT refused_at FROM public.couple_challenges WHERE id=for_a.id) IS NULL
   OR NOT EXISTS(
     SELECT 1 FROM public.love_cycle_excluded_cards ex
     WHERE ex.couple_id=pair AND ex.cycle_number=1
       AND ex.category='SEXUEL' AND ex.card_id=for_a.card_id
       AND ex.excluded_by=a
   ) THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: A refusal exclusion or stamp missing';
 END IF;
 SELECT public.love_respond_and_redraw(for_a.id,'refuse',true) INTO reply;
 IF reply->>'already_processed'<>'true'
   OR reply->>'action'<>'refuse' OR reply->>'excluded'<>'true'
   OR (reply->>'replacement_id')::uuid IS DISTINCT FROM next_a.id THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: A refusal replay changed %',reply;
 END IF;
 IF (SELECT count(*) FROM public.couple_challenges WHERE couple_id=pair)<>4
   OR (SELECT count(*) FROM public.love_challenge_redraws WHERE couple_id=pair)<>2
   OR (SELECT count(*) FROM public.couple_challenges
       WHERE couple_id=pair AND status='passed' AND recipient=b)<>1
   OR (SELECT count(*) FROM public.couple_challenges
       WHERE couple_id=pair AND status='refused' AND recipient=a)<>1 THEN
  RAISE EXCEPTION 'REAL RPC SEXUEL: duplicated challenge, receipt or changed recipient';
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC SEXUEL: bidirectional D100, Passer, Refuser/exclusion and idempotency passed';
END; $lr026_real_sexuel$;

-- The REAL functions must remain playable when every eligible card
-- is semantically similar to tonight's history: variety is a ranking,
-- never an implicit ban or a change to official category probability.
DO $lr026_real_variety_fallback$
DECLARE
 pair uuid:='eeeeeeee-aaaa-4aaa-8aaa-eeeeeeeeeeee';
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 s uuid:='eeeeeeee-2222-4222-8222-eeeeeeeeeeee';
 drawn public.couple_challenges%rowtype;
 replacement public.couple_challenges%rowtype;
 result jsonb;
BEGIN
 INSERT INTO public.couples(
  id,owner_user_id,category_preference_percent,monthly_pass_limit,
  sexual_card_mode
 ) VALUES(pair,a,100,1,'custom');
 INSERT INTO public.couple_members(couple_id,user_id)
 VALUES(pair,a),(pair,b);
 INSERT INTO public.couple_sessions(id,couple_id,opened_by,paired_turns,self_draws)
 VALUES(s,pair,a,false,false);
 INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
 VALUES(s,a,2),(s,b,2);

 -- The base fixture already gives SENSUEL cards 1 and 2 the exact same
 -- meaningful title. Card 1 has been shown to A, not B; both are still
 -- eligible to B (the game's exclusions are recipient-specific).
 INSERT INTO public.couple_challenges(
  session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,status
 ) VALUES(
  s,pair,b,a,'SENSUEL',1,1,'Baisers au clair de lune',
  'Un moment tendre et plein de douceur','completed'
 );
 INSERT INTO public.love_cycle_excluded_cards(
  couple_id,cycle_number,category,card_id
 )
 SELECT pair,1,cat.category,g
 FROM (VALUES('SENSUEL'::text),('SEXUEL'::text)) cat(category)
 CROSS JOIN pg_catalog.generate_series(1,25) g
 WHERE cat.category='SEXUEL' OR g>2;

 IF couple_private.love_variety_rank(s,pair,'SENSUEL',1)<>1
   OR couple_private.love_variety_rank(s,pair,'SENSUEL',2)<>1 THEN
  RAISE EXCEPTION 'REAL RPC FALLBACK: fixture must rank both candidates as similar';
 END IF;

 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT * INTO drawn FROM public.draw_for_partner(s,'SENSUEL',false);
 IF drawn.category IS DISTINCT FROM 'SENSUEL'
   OR drawn.card_id NOT IN (1,2)
   OR drawn.recipient IS DISTINCT FROM b
   OR drawn.offered_by IS DISTINCT FROM a
   OR drawn.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC FALLBACK: all-similar D100 should remain playable %',drawn;
 END IF;

 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 SELECT public.love_respond_and_redraw(drawn.id,'pass',false) INTO result;
 IF result->>'action'<>'pass'
   OR result->>'already_processed'<>'false'
   OR result->>'replacement_unavailable'<>'false'
   OR result->>'replacement_id' IS NULL THEN
  RAISE EXCEPTION 'REAL RPC FALLBACK: all-similar Passer should still work %',result;
 END IF;
 SELECT * INTO replacement FROM public.couple_challenges
 WHERE id=(result->>'replacement_id')::uuid;
 IF NOT FOUND OR replacement.category IS DISTINCT FROM 'SENSUEL'
   OR replacement.recipient IS DISTINCT FROM b
   OR replacement.offered_by IS DISTINCT FROM a
   OR replacement.card_id NOT IN (1,2)
   OR replacement.card_id IS NOT DISTINCT FROM drawn.card_id
   OR replacement.face IS NOT DISTINCT FROM drawn.face
   OR replacement.replaces_challenge_id IS DISTINCT FROM drawn.id
   OR replacement.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC FALLBACK: replacement lost category or reused card %',
    replacement;
 END IF;
 SELECT public.love_respond_and_redraw(drawn.id,'pass',false) INTO result;
 IF result->>'already_processed'<>'true'
   OR (result->>'replacement_id')::uuid IS DISTINCT FROM replacement.id
   OR (SELECT count(*) FROM public.couple_challenges
       WHERE couple_id=pair AND recipient=b)<>2
   OR (SELECT count(*) FROM public.love_challenge_redraws
       WHERE couple_id=pair)<>1 THEN
  RAISE EXCEPTION 'REAL RPC FALLBACK: Passer replay created a duplicate';
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC FALLBACK: all eligible cards similar, D100 and Passer remain playable';
END; $lr026_real_variety_fallback$;

-- REAL RPC regression: Refuser WITHOUT cycle exclusion remains possible
-- when Passer is disabled (monthly limit zero). A refused card stays in
-- historical challenges, is released from the recipient's future-cycle bag,
-- and cannot be redrawn inside the very same evening.
DO $lr026_real_refuse_without_exclusion$
DECLARE
 pair uuid:='fefefefe-aaaa-4aaa-8aaa-fefefefefefe';
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 s uuid:='fefefefe-2222-4222-8222-fefefefefefe';
 first_card public.couple_challenges%rowtype;
 next_card public.couple_challenges%rowtype;
 result jsonb;
 rejected boolean:=false;
 rejection text;
BEGIN
 INSERT INTO public.couples(
  id,owner_user_id,category_preference_percent,monthly_pass_limit,
  sexual_card_mode
 ) VALUES(pair,a,100,0,'custom');
 INSERT INTO public.couple_members(couple_id,user_id)
 VALUES(pair,a),(pair,b);
 INSERT INTO public.couple_sessions(id,couple_id,opened_by,paired_turns,self_draws)
 VALUES(s,pair,a,false,false);
 INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
 VALUES(s,a,2),(s,b,2);
 -- Exactly 3 SENSUEL library cards are eligible (1..3); all unrelated
 -- SEXUEL cards and other SENSUEL cards are excluded before the real RPC.
 INSERT INTO public.love_cycle_excluded_cards(
  couple_id,cycle_number,category,card_id
 )
 SELECT pair,1,cat.category,g
 FROM (VALUES('SENSUEL'::text),('SEXUEL'::text)) cat(category)
 CROSS JOIN pg_catalog.generate_series(1,25) g
 WHERE cat.category='SEXUEL' OR g>3;

 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT * INTO first_card FROM public.draw_for_partner(s,'SENSUEL',false);
 IF first_card.offered_by IS DISTINCT FROM a
   OR first_card.recipient IS DISTINCT FROM b
   OR first_card.category IS DISTINCT FROM 'SENSUEL'
   OR first_card.card_id NOT BETWEEN 1 AND 3
   OR first_card.status IS DISTINCT FROM 'proposed'
   OR NOT EXISTS(
    SELECT 1 FROM public.love_card_draw_history h
    WHERE h.couple_id=pair AND h.recipient_user_id=b
      AND h.category='SENSUEL' AND h.card_id=first_card.card_id
   ) THEN
  RAISE EXCEPTION 'REAL RPC REFUSE FALSE: initial D100/bag invalid %',first_card;
 END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 -- The limit 0/0 must block Passer but never block Refuser.
 BEGIN
  PERFORM public.love_respond_and_redraw(first_card.id,'pass',false);
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS rejection=MESSAGE_TEXT;
  IF rejection NOT LIKE 'Limite mensuelle de passes atteinte%' THEN
   RAISE EXCEPTION 'REAL RPC REFUSE FALSE: unexpected pass denial %',rejection;
  END IF;
  rejected:=true;
 END;
 IF NOT rejected
   OR (SELECT status FROM public.couple_challenges WHERE id=first_card.id)
      <> 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC REFUSE FALSE: pass limit did not roll back';
 END IF;
 SELECT public.love_respond_and_redraw(first_card.id,'refuse',false) INTO result;
 IF result->>'action'<>'refuse'
   OR result->>'excluded'<>'false'
   OR result->>'already_processed'<>'false'
   OR result->>'replacement_unavailable'<>'false'
   OR result->>'replacement_id' IS NULL THEN
  RAISE EXCEPTION 'REAL RPC REFUSE FALSE: original response invalid %',result;
 END IF;
 SELECT * INTO next_card FROM public.couple_challenges
 WHERE id=(result->>'replacement_id')::uuid;
 IF NOT FOUND OR next_card.offered_by IS DISTINCT FROM a
   OR next_card.recipient IS DISTINCT FROM b
   OR next_card.category IS DISTINCT FROM 'SENSUEL'
   OR next_card.card_id NOT BETWEEN 1 AND 3
   OR next_card.card_id IS NOT DISTINCT FROM first_card.card_id
   OR next_card.face IS NOT DISTINCT FROM first_card.face
   OR next_card.replaces_challenge_id IS DISTINCT FROM first_card.id
   OR next_card.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC REFUSE FALSE: replacement incorrect %',next_card;
 END IF;
 IF (SELECT status FROM public.couple_challenges WHERE id=first_card.id)
     <> 'refused'
   OR (SELECT refused_at FROM public.couple_challenges WHERE id=first_card.id)
      IS NULL
   OR (SELECT passed_at FROM public.couple_challenges WHERE id=first_card.id)
      IS NOT NULL
   OR EXISTS(
    SELECT 1 FROM public.love_cycle_excluded_cards ex
    WHERE ex.couple_id=pair AND ex.cycle_number=1
      AND ex.category='SENSUEL' AND ex.card_id=first_card.card_id
   )
   OR EXISTS(
    SELECT 1 FROM public.love_card_draw_history h
    WHERE h.couple_id=pair AND h.recipient_user_id=b
      AND h.category='SENSUEL' AND h.card_id=first_card.card_id
   )
   OR NOT EXISTS(
    SELECT 1 FROM public.love_card_draw_history h
    WHERE h.couple_id=pair AND h.recipient_user_id=b
      AND h.category='SENSUEL' AND h.card_id=next_card.card_id
   ) THEN
  RAISE EXCEPTION 'REAL RPC REFUSE FALSE: history, exclusion, or timestamps invalid';
 END IF;
 -- Even a replay using exclude=true must return the stored false receipt;
 -- it must not change the original request after refresh/double-tap.
 SELECT public.love_respond_and_redraw(first_card.id,'refuse',true) INTO result;
 IF result->>'already_processed'<>'true'
   OR result->>'action'<>'refuse'
   OR result->>'excluded'<>'false'
   OR (result->>'replacement_id')::uuid IS DISTINCT FROM next_card.id
   OR (SELECT count(*) FROM public.couple_challenges WHERE couple_id=pair)<>2
   OR (SELECT count(*) FROM public.love_challenge_redraws WHERE couple_id=pair)<>1
   OR (SELECT count(*) FROM public.couple_challenges
       WHERE couple_id=pair AND status='passed')<>0 THEN
  RAISE EXCEPTION 'REAL RPC REFUSE FALSE: replay altered choice or quota %',result;
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC: zero Passer quota, Refuser(false), future-bag release, no exclusion and replay passed';
END; $lr026_real_refuse_without_exclusion$;

-- A completed card must stay in the 200-card cycle history even when a
-- later replay of that SAME card is Refused WITHOUT excluding it.
-- This exercises the actual RPC draw + actual Refuser (not stand-ins).
DO $lr026_real_completed_then_refused$
DECLARE
 pair uuid:='eeeeaaaa-aaaa-4aaa-8aaa-eeeeaaaaeeee';
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 earlier_session uuid:='eeeeaaaa-1111-4111-8111-eeeeaaaaeeee';
 current_session uuid:='eeeeaaaa-2222-4222-8222-eeeeaaaaeeee';
 earlier uuid:='eeeeaaaa-3333-4333-8333-eeeeaaaaeeee';
 drawn public.couple_challenges%rowtype;
 replacement public.couple_challenges%rowtype;
 result jsonb;
BEGIN
 INSERT INTO public.couples(
  id,owner_user_id,category_preference_percent,monthly_pass_limit,
  no_repeat_challenges,challenge_cycle_started_at,sexual_card_mode
 ) VALUES(pair,a,100,0,false,now()-interval '10 days','custom');
 INSERT INTO public.couple_members(couple_id,user_id)
 VALUES(pair,a),(pair,b);
 INSERT INTO public.couple_sessions(
  id,couple_id,opened_by,started_at,finished_at,paired_turns,self_draws
 ) VALUES
 (earlier_session,pair,a,now()-interval '2 days',
  now()-interval '1 day',false,false),
 (current_session,pair,a,now(),NULL,false,false);
 INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
 VALUES(current_session,a,2),(current_session,b,2);
 -- Card 1 was truly completed earlier in the ACTIVE challenge cycle.
 INSERT INTO public.couple_challenges(
  id,session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,status
 ) VALUES (
  earlier,earlier_session,pair,a,b,'SENSUEL',17,1,
  'Baisers au clair de lune','Un moment tendre et plein de douceur','completed'
 );
 INSERT INTO public.love_card_draw_history(
  couple_id,recipient_user_id,category,card_id
 ) VALUES(pair,b,'SENSUEL',1);

 -- Only card 1 can be drawn while repeating is temporarily allowed.
 -- A subsequent change back to normal anti-repeat must preserve the
 -- completed-card bag even if that replay is rejected by recipient B.
 INSERT INTO public.love_cycle_excluded_cards(
  couple_id,cycle_number,category,card_id
 )
 SELECT pair,1,cat.category,g
 FROM (VALUES('SENSUEL'::text),('SEXUEL'::text)) cat(category)
 CROSS JOIN pg_catalog.generate_series(1,25) g
 WHERE cat.category='SEXUEL' OR g>1;
 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
 SELECT * INTO drawn FROM public.draw_for_partner(current_session,'SENSUEL',false);
 IF drawn.card_id IS DISTINCT FROM 1
   OR drawn.recipient IS DISTINCT FROM b
   OR drawn.offered_by IS DISTINCT FROM a
   OR drawn.category IS DISTINCT FROM 'SENSUEL'
   OR drawn.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC COMPLETED-REFUSED: replay draw invalid %',drawn;
 END IF;

 UPDATE public.couples SET no_repeat_challenges=true WHERE id=pair;
 DELETE FROM public.love_cycle_excluded_cards ex
 WHERE ex.couple_id=pair AND ex.category='SENSUEL' AND ex.card_id IN (2,3);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
 SELECT public.love_respond_and_redraw(drawn.id,'refuse',false) INTO result;
 IF result->>'action'<>'refuse'
   OR result->>'excluded'<>'false'
   OR result->>'already_processed'<>'false'
   OR result->>'replacement_unavailable'<>'false'
   OR result->>'replacement_id' IS NULL THEN
  RAISE EXCEPTION 'REAL RPC COMPLETED-REFUSED: response invalid %',result;
 END IF;
 SELECT * INTO replacement FROM public.couple_challenges
 WHERE id=(result->>'replacement_id')::uuid;
 IF NOT FOUND OR replacement.card_id NOT IN (2,3)
   OR replacement.recipient IS DISTINCT FROM b
   OR replacement.offered_by IS DISTINCT FROM a
   OR replacement.category IS DISTINCT FROM 'SENSUEL'
   OR replacement.replaces_challenge_id IS DISTINCT FROM drawn.id
   OR replacement.face IS NOT DISTINCT FROM drawn.face
   OR replacement.status IS DISTINCT FROM 'proposed' THEN
  RAISE EXCEPTION 'REAL RPC COMPLETED-REFUSED: replacement invalid %',
    replacement;
 END IF;
 IF (SELECT status FROM public.couple_challenges WHERE id=earlier)
      IS DISTINCT FROM 'completed'
   OR (SELECT status FROM public.couple_challenges WHERE id=drawn.id)
      IS DISTINCT FROM 'refused'
   OR (SELECT refused_at FROM public.couple_challenges WHERE id=drawn.id)
      IS NULL
   OR NOT EXISTS(
    SELECT 1 FROM public.love_card_draw_history h
    WHERE h.couple_id=pair AND h.recipient_user_id=b
      AND h.category='SENSUEL' AND h.card_id=1
   )
   OR NOT EXISTS(
    SELECT 1 FROM public.love_card_draw_history h
    WHERE h.couple_id=pair AND h.recipient_user_id=b
      AND h.category='SENSUEL' AND h.card_id=replacement.card_id
   )
   OR EXISTS(
    SELECT 1 FROM public.love_cycle_excluded_cards ex
    WHERE ex.couple_id=pair AND ex.category='SENSUEL' AND ex.card_id=1
   ) THEN
  RAISE EXCEPTION 'REAL RPC COMPLETED-REFUSED: completed cycle card was unlocked or excluded';
 END IF;

 -- The original completed card must not re-enter the current cycle's bag.
 -- Replaying with a different exclusion flag cannot rewrite the receipt.
 SELECT public.love_respond_and_redraw(drawn.id,'refuse',true) INTO result;
 IF result->>'already_processed'<>'true'
   OR result->>'excluded'<>'false'
   OR (result->>'replacement_id')::uuid IS DISTINCT FROM replacement.id
   OR (SELECT count(*) FROM public.couple_challenges WHERE couple_id=pair)<>3
   OR (SELECT count(*) FROM public.love_challenge_redraws WHERE couple_id=pair)<>1
   OR (SELECT count(*) FROM public.love_card_draw_history
       WHERE couple_id=pair AND recipient_user_id=b AND category='SENSUEL')<>2 THEN
  RAISE EXCEPTION 'REAL RPC COMPLETED-REFUSED: idempotent replay changed completion or bag %',result;
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC: previously completed card stays in cycle bag after Refuser(false) replay';
END; $lr026_real_completed_then_refused$;

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
