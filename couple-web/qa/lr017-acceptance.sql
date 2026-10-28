-- Execute real, production SQL functions under separate synthetic JWT identities.
SET ROLE authenticated;
DO $$
DECLARE
 a uuid:='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 c uuid:='cccccccc-cccc-4ccc-cccc-cccccccccccc';
 first uuid:='11111111-1111-4111-8111-111111111111';
 second uuid:='22222222-2222-4222-8222-222222222222';
 third uuid:='33333333-3333-4333-8333-333333333333';
 v jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 v:=public.love_adaptation_propose(first,'Version plus douce',12);
 IF v->>'status'<>'pending' OR v->>'created'<>'true' THEN
  RAISE EXCEPTION 'A did not propose: %',v; END IF;
 IF (SELECT count(*) FROM public.couple_challenges WHERE id=first)<>0 THEN
  RAISE EXCEPTION 'Recipient-only challenge RLS must hide that private card from A';END IF;
 IF (SELECT count(*) FROM public.love_challenge_adaptations WHERE challenge_id=first)<>1 THEN
  RAISE EXCEPTION 'Proposer A cannot view their proposal without revealing the private challenge';END IF;
 v:=public.love_adaptation_propose(first,'Version plus douce',12);
 IF v->>'created'<>'false' THEN RAISE EXCEPTION 'Double click was not idempotent'; END IF;
 BEGIN
  PERFORM public.love_adaptation_respond(first,true);
  RAISE EXCEPTION 'A illegally approved their own proposal';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 IF (SELECT count(*) FROM public.love_challenge_adaptations)<>0 THEN
  RAISE EXCEPTION 'Outsider can read private adaptation';END IF;
 BEGIN
  PERFORM public.love_adaptation_propose(second,'intrusion',5);
  RAISE EXCEPTION 'Outsider could propose';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 IF (SELECT count(*) FROM public.love_challenge_adaptations)<>1 THEN
  RAISE EXCEPTION 'Other partner cannot read their invitation';END IF;
 v:=public.love_adaptation_respond(first,true);
 IF v->>'status'<>'accepted' OR v->>'updated'<>'true' THEN
  RAISE EXCEPTION 'Other partner failed to approve: %',v;END IF;
 v:=public.love_adaptation_respond(first,true);
 IF v->>'updated'<>'false' THEN RAISE EXCEPTION 'Approval must be idempotent';END IF;
 -- B proposes plain text on a running challenge; no duration replacement.
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 v:=public.love_adaptation_propose(second,'Autre texte',NULL);
 IF v->>'created'<>'true' THEN RAISE EXCEPTION 'Text-only proposal failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 v:=public.love_adaptation_respond(second,false);
 IF v->>'status'<>'declined' THEN RAISE EXCEPTION 'Declining must be free';END IF;
 -- A creates a new pending proposal to validate membership changes later.
 PERFORM public.love_adaptation_propose(third,'Consentement privé',NULL);
END $$;
RESET ROLE;
-- The original card is byte-for-byte unchanged, including its duration.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.couple_challenges WHERE
  card_description<>'Consigne officielle originale' OR card_timer_minutes<>5) THEN
  RAISE EXCEPTION 'A proposal or approval changed the original card';END IF;
 IF (SELECT count(*) FROM public.couple_challenges)<>3 OR
    (SELECT count(*) FROM public.couple_sessions)<>1 THEN
  RAISE EXCEPTION 'An adaptation created a new card/session';END IF;
END $$;
-- A partner is replaced: the new C must not see or approve A/B's proposals.
DELETE FROM public.couple_members
WHERE user_id='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
INSERT INTO public.couple_members VALUES
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd','cccccccc-cccc-4ccc-cccc-cccccccccccc');
SET ROLE authenticated;
DO $$
DECLARE
 a uuid:='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 c uuid:='cccccccc-cccc-4ccc-cccc-cccccccccccc';
 third uuid:='33333333-3333-4333-8333-333333333333';
BEGIN
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 IF (SELECT count(*) FROM public.love_challenge_adaptations)<>0 THEN
  RAISE EXCEPTION 'Replacement partner can read prior private proposal';END IF;
 BEGIN
  PERFORM public.love_adaptation_respond(third,true);
  RAISE EXCEPTION 'Replacement partner accepted a former pair proposal';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 IF (SELECT count(*) FROM public.love_challenge_adaptations)<>0 THEN
  RAISE EXCEPTION 'Member can read former pair proposal after replacement';END IF;
END $$;
RESET ROLE;
