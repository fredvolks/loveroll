-- LR-026: execute the actual reviewed D100 RPC source with authentic
-- server-side paired-turn rules on an isolated PostgreSQL 17 database.
-- All identities and data are fabricated; request.jwt.claim.sub is a local
-- simulation, NOT a real Supabase Auth session. Entire fixture rolls back.
BEGIN;

INSERT INTO public.couples(
 id,owner_user_id,no_repeat_challenges,category_weights_enabled,
 category_preference_percent,challenge_cycle_number,sexual_card_mode
) VALUES(
 'dddddddd-aaaa-4ddd-8ddd-dddddddddddd',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 true,true,100,1,'custom'
);
INSERT INTO public.couple_members(couple_id,user_id)
VALUES
 ('dddddddd-aaaa-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 ('dddddddd-aaaa-4ddd-8ddd-dddddddddddd',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');
INSERT INTO public.couple_profiles(id,gender,play_style) VALUES
 ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','him','medium'),
 ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb','her','medium');
INSERT INTO public.love_base_challenges(
 category,card_id,title,description,timer_minutes)
SELECT cats.category,g::smallint,
       'Défi D100 scénario '||g,
       'Une activité entièrement fictive numéro '||g,
       3::smallint
FROM (VALUES ('SENSUEL'::text),('SEXUEL'::text)) cats(category)
CROSS JOIN pg_catalog.generate_series(1,25) g;
INSERT INTO public.couple_sessions(
 id,couple_id,opened_by,paired_turns,starting_user_id,self_draws)
VALUES
 ('dddddddd-1111-4111-8111-dddddddddddd',
  'dddddddd-aaaa-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  true,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',false),
 ('dddddddd-2222-4222-8222-dddddddddddd',
  'dddddddd-aaaa-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  true,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',true);

DO $lr026_paired_turns$
DECLARE
 a uuid:='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 pair uuid:='dddddddd-aaaa-4ddd-8ddd-dddddddddddd';
 one_session uuid:='dddddddd-1111-4111-8111-dddddddddddd';
 two_session uuid:='dddddddd-2222-4222-8222-dddddddddddd';
 sid uuid;
 self_mode boolean;
 pass integer;
 first_draw public.couple_challenges%rowtype;
 second_draw public.couple_challenges%rowtype;
 third_draw public.couple_challenges%rowtype;
 reject_text text;
 rejected boolean;
 draw_count integer;
 distinct_count integer;
BEGIN
 PERFORM pg_catalog.set_config('lr026.test_verified','yes',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);

 -- Both D6 are mandatory before any D100 draw. Check two separate phases,
 -- not only the first uninitialized state.
 FOR sid IN SELECT one_session UNION ALL SELECT two_session LOOP
   FOR pass IN 0..1 LOOP
     rejected:=false;
     BEGIN
       PERFORM public.draw_for_partner(sid,'SENSUEL',false);
     EXCEPTION WHEN OTHERS THEN
       GET STACKED DIAGNOSTICS reject_text=MESSAGE_TEXT;
       IF reject_text<>'Attendre les deux D6 personnels' THEN
         RAISE EXCEPTION 'LR-026 actual D6 expected gate, got %',reject_text;
       END IF;
       rejected:=true;
     END;
     IF NOT rejected THEN
       RAISE EXCEPTION 'LR-026 actual D100 ignored incomplete D6 in %',sid;
     END IF;
     IF pass=0 THEN
       INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
       VALUES(sid,a,2);
     END IF;
   END LOOP;
   INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
   VALUES(sid,b,1);
 END LOOP;

 -- Two complete sessions: traditional give-to-partner and self-draw.
 -- In both modes, an A(2) / B(1) D6 creates exact A/B/A turn order.
 FOR pass IN 1..2 LOOP
   sid:=CASE WHEN pass=1 THEN one_session ELSE two_session END;
   self_mode:=(pass=2);
   PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
   SELECT * INTO first_draw FROM public.draw_for_partner(sid,'SENSUEL',false);
   IF first_draw.offered_by IS DISTINCT FROM
      (CASE WHEN self_mode THEN b ELSE a END)
     OR first_draw.recipient IS DISTINCT FROM
      (CASE WHEN self_mode THEN a ELSE b END)
     OR first_draw.category IS DISTINCT FROM 'SENSUEL'
     OR first_draw.status IS DISTINCT FROM 'proposed'
     OR first_draw.is_gifted IS DISTINCT FROM false THEN
     RAISE EXCEPTION 'LR-026 actual first paired turn mismatch: %',first_draw;
   END IF;

   rejected:=false;
   BEGIN
     PERFORM public.draw_for_partner(sid,'SENSUEL',false);
   EXCEPTION WHEN OTHERS THEN
     GET STACKED DIAGNOSTICS reject_text=MESSAGE_TEXT;
     IF reject_text<>'Ce n’est pas votre tour : attendez le lancer de votre partenaire' THEN
       RAISE EXCEPTION 'LR-026 actual second A turn rejected for wrong reason %',reject_text;
     END IF;
     rejected:=true;
   END;
   IF NOT rejected THEN
     RAISE EXCEPTION 'LR-026 actual paired queue let A draw twice in succession';
   END IF;

   PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
   SELECT * INTO second_draw FROM public.draw_for_partner(sid,'SENSUEL',false);
   IF second_draw.offered_by IS DISTINCT FROM
      (CASE WHEN self_mode THEN a ELSE b END)
     OR second_draw.recipient IS DISTINCT FROM
      (CASE WHEN self_mode THEN b ELSE a END) THEN
     RAISE EXCEPTION 'LR-026 actual second paired turn mismatch: %',second_draw;
   END IF;
   rejected:=false;
   BEGIN
     PERFORM public.draw_for_partner(sid,'SENSUEL',false);
   EXCEPTION WHEN OTHERS THEN
     GET STACKED DIAGNOSTICS reject_text=MESSAGE_TEXT;
     IF reject_text<>'Ce n’est pas votre tour : attendez le lancer de votre partenaire' THEN
       RAISE EXCEPTION 'LR-026 actual B turn rejected for wrong reason %',reject_text;
     END IF;
     rejected:=true;
   END;
   IF NOT rejected THEN RAISE EXCEPTION 'LR-026 actual queue let B overdraw';END IF;

   PERFORM pg_catalog.set_config('request.jwt.claim.sub',a::text,true);
   SELECT * INTO third_draw FROM public.draw_for_partner(sid,'SENSUEL',false);
   IF third_draw.offered_by IS DISTINCT FROM first_draw.offered_by
      OR third_draw.recipient IS DISTINCT FROM first_draw.recipient
      OR third_draw.card_id=first_draw.card_id THEN
     RAISE EXCEPTION 'LR-026 actual third paired turn broke ownership or no-repeat: %',third_draw;
   END IF;

   PERFORM pg_catalog.set_config('request.jwt.claim.sub',b::text,true);
   rejected:=false;
   BEGIN
     PERFORM public.draw_for_partner(sid,'SENSUEL',false);
   EXCEPTION WHEN OTHERS THEN
     GET STACKED DIAGNOSTICS reject_text=MESSAGE_TEXT;
     IF reject_text<>'Tous les défis de la soirée sont déjà pigés' THEN
       RAISE EXCEPTION 'LR-026 actual finished queue wrong rejection %',reject_text;
     END IF;
     rejected:=true;
   END;
   IF NOT rejected THEN RAISE EXCEPTION 'LR-026 actual overran evening D6 budget';END IF;

   IF (SELECT count(*) FROM public.couple_challenges WHERE session_id=sid)<>3
     OR (SELECT count(*) FROM public.couple_challenges
         WHERE session_id=sid AND category='SENSUEL')<>3 THEN
     RAISE EXCEPTION 'LR-026 actual paired queue count/category mismatch';
   END IF;
 END LOOP;

 -- The historical shuffle bag is scoped to couple and recipient, and
 -- persists across paired-turn modes and across separate evenings.
 FOR sid IN SELECT a UNION ALL SELECT b LOOP
   SELECT count(*),count(DISTINCT card_id)
     INTO draw_count,distinct_count
   FROM public.couple_challenges
   WHERE couple_id=pair AND recipient=sid AND category='SENSUEL';
   IF draw_count<>3
      OR draw_count<>distinct_count THEN
     RAISE EXCEPTION 'LR-026 actual history repeats for recipient % (% vs %)',
       sid,draw_count,distinct_count;
   END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.love_card_draw_history
    WHERE couple_id=pair AND category='SENSUEL')<>6 THEN
   RAISE EXCEPTION 'LR-026 real bag did not persist across A/B/self sessions';
 END IF;
 RAISE NOTICE
 'LR-026 REAL RPC: two D6 gating, paired A/B/A, self-draw ownership, D100 budgets and cross-evening bags passed';
END; $lr026_paired_turns$;

ROLLBACK;
