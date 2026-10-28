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
 fourth uuid:='44444444-4444-4444-8444-444444444444';
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
 PERFORM set_config('request.jwt.claim.email_verified','false',true);
 IF (SELECT count(*) FROM public.love_challenge_adaptations WHERE challenge_id=first)<>0 THEN
  RAISE EXCEPTION 'Unverified member can read intimate adaptation';END IF;
 PERFORM set_config('request.jwt.claim.email_verified','true',true);
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
 IF (SELECT original_text FROM public.love_challenge_adaptations WHERE challenge_id=first)
   IS DISTINCT FROM 'Consigne officielle originale' OR
    (SELECT original_minutes FROM public.love_challenge_adaptations WHERE challenge_id=first)<>5 THEN
  RAISE EXCEPTION 'Informed consent must display the exact original instructions and minutes';END IF;
 v:=public.love_adaptation_respond(first,true);
 IF v->>'status'<>'accepted' OR v->>'updated'<>'true' THEN
  RAISE EXCEPTION 'Other partner failed to approve: %',v;END IF;
 v:=public.love_adaptation_respond(first,true);
 IF v->>'updated'<>'false' THEN RAISE EXCEPTION 'Approval must be idempotent';END IF;
 -- B may propose TEXT ONLY on a started challenge. A duration change is
 -- forbidden even when the other person would otherwise be able to accept.
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 BEGIN
  PERFORM public.love_adaptation_propose(second,'Minuterie modifiée',30);
  RAISE EXCEPTION 'Unexpected permission to propose a new timer after start';
 EXCEPTION WHEN others THEN
  IF SQLERRM NOT LIKE 'La durée ne peut être adaptée%' THEN RAISE; END IF;
 END;
 v:=public.love_adaptation_propose(second,'Autre texte',NULL);
 IF v->>'created'<>'true' THEN RAISE EXCEPTION 'Text-only proposal failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 v:=public.love_adaptation_respond(second,false);
 IF v->>'status'<>'declined' THEN RAISE EXCEPTION 'Declining must be free';END IF;
 -- A creates pending proposals for membership replacement and for an
 -- interrupted consent: the partner must not approve a modified duration
 -- after the official challenge has already started.
 PERFORM public.love_adaptation_propose(third,'Consentement privé',NULL);
 PERFORM public.love_adaptation_propose(fourth,'Durée souhaitée',25);
END $$;
RESET ROLE;
-- Synthetic server transition: the challenge starts before B has approved.
UPDATE public.couple_challenges SET status='accepted'
 WHERE id='44444444-4444-4444-8444-444444444444';
SET ROLE authenticated;
DO $$
DECLARE
 fourth uuid:='44444444-4444-4444-8444-444444444444';
BEGIN
 PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',true);
 PERFORM set_config('request.jwt.claim.email_verified','true',true);
 BEGIN
  PERFORM public.love_adaptation_respond(fourth,true);
  RAISE EXCEPTION 'Unexpected approval of timer changed after start';
 EXCEPTION WHEN others THEN
  IF SQLERRM NOT LIKE 'Impossible de modifier la minuterie%' THEN RAISE; END IF;
 END;
 IF (SELECT status FROM public.love_challenge_adaptations WHERE challenge_id=fourth)<>'pending' THEN
  RAISE EXCEPTION 'Rejected mid-game timer approval mutated consent state';
 END IF;
END $$;
RESET ROLE;
-- Self-draw uses offered_by = recipient = A; B must explicitly consent.
-- A's private challenge remains completely hidden to B even after consent.
SET ROLE authenticated;
DO $$
DECLARE
 self_draw uuid:='55555555-5555-4555-8555-555555555555';
 v jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
 PERFORM set_config('request.jwt.claim.email_verified','true',true);
 v:=public.love_adaptation_propose(self_draw,'Version qui convient aux deux',NULL);
 IF v->>'status'<>'pending' THEN
  RAISE EXCEPTION 'Self-draw recipient cannot propose consensual adaptation'; END IF;
 PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',true);
 IF (SELECT count(*) FROM public.couple_challenges WHERE id=self_draw)<>0 THEN
  RAISE EXCEPTION 'Partner accessed private self-drawn card'; END IF;
 IF (SELECT count(*) FROM public.love_challenge_adaptations WHERE challenge_id=self_draw)<>1 THEN
  RAISE EXCEPTION 'Second partner cannot see consent request for self-draw'; END IF;
 v:=public.love_adaptation_respond(self_draw,true);
 IF v->>'status'<>'accepted' OR v->>'updated'<>'true' THEN
  RAISE EXCEPTION 'Second partner cannot approve self-drawn adaptation'; END IF;
 IF (SELECT count(*) FROM public.couple_challenges WHERE id=self_draw)<>0 THEN
  RAISE EXCEPTION 'Adaptation approval revealed private self-drawn challenge'; END IF;
END $$;
RESET ROLE;
-- The original card is byte-for-byte unchanged, including its duration.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.couple_challenges WHERE
  card_description<>'Consigne officielle originale' OR card_timer_minutes<>5) THEN
  RAISE EXCEPTION 'A proposal or approval changed the original card';END IF;
 IF (SELECT count(*) FROM public.couple_challenges)<>5 OR
    (SELECT count(*) FROM public.couple_sessions)<>2 THEN
  RAISE EXCEPTION 'An adaptation created a new card/session';END IF;
END $$;
-- A closed evening must reject even a previously pending proposal.
-- The respondent RPC holds the active session row until its decision commits.
UPDATE public.couple_sessions SET finished_at=now();
SET ROLE authenticated;
DO $$
DECLARE
 third uuid:='33333333-3333-4333-8333-333333333333';
BEGIN
 PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',true);
 PERFORM set_config('request.jwt.claim.email_verified','true',true);
 BEGIN
  PERFORM public.love_adaptation_respond(third,true);
  RAISE EXCEPTION 'A closed evening unexpectedly accepted an adaptation';
 EXCEPTION WHEN others THEN
  IF SQLERRM NOT LIKE 'Le défi ou la soirée n’est plus disponible%' AND
     SQLERRM NOT LIKE 'Cette soirée est clôturée%' THEN RAISE; END IF;
 END;
 IF (SELECT status FROM public.love_challenge_adaptations WHERE challenge_id=third)<>'pending' THEN
  RAISE EXCEPTION 'Closed-evening rejection modified a pending adaptation';
 END IF;
END $$;
RESET ROLE;
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
