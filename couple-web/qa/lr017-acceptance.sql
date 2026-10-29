-- Integration contract: two distinct Auth identities, one outsider, three cards.
DO $test$
DECLARE
 a uuid:='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 c uuid:='cccccccc-cccc-4ccc-cccc-cccccccccccc';
 s uuid:='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
 x uuid:='11111111-1111-4111-8111-111111111111';
 y uuid:='22222222-2222-4222-8222-222222222222';
 z uuid:='33333333-3333-4333-8333-333333333333';
 v jsonb;
BEGIN
 IF has_table_privilege('authenticated','public.love_challenge_adaptations','INSERT') OR
    has_table_privilege('anon','public.love_challenge_adaptations','SELECT') THEN
  RAISE EXCEPTION 'SECURITY FAILURE: direct table grant'; END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 IF public.my_love_challenge_adaptations(s)<>'[]'::jsonb THEN
  RAISE EXCEPTION 'New session should not have proposals'; END IF;
 v:=public.love_adaptation_propose(x,'Plus doux, à notre rythme',12);
 IF v->>'status'<>'pending' THEN RAISE EXCEPTION 'Expected pending';END IF;
 IF (SELECT count(*) FROM public.love_challenge_adaptations)<>1 THEN
  RAISE EXCEPTION 'One occurrence should create one row';END IF;
 IF (SELECT card_description FROM public.couple_challenges WHERE id=x)<>
   'Défi original : découvrir ensemble' OR
    (SELECT card_timer_minutes FROM public.couple_challenges WHERE id=x)<>7 THEN
  RAISE EXCEPTION 'Original source must never be changed';END IF;
 BEGIN
  PERFORM public.love_adaptation_respond(x,true);
  RAISE EXCEPTION 'SECURITY FAILURE: self-approved';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='SECURITY FAILURE: self-approved' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.love_adaptation_propose(x,'Overwrite pending',5);
  RAISE EXCEPTION 'SECURITY FAILURE: overwrote pending';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='SECURITY FAILURE: overwrote pending' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.love_adaptation_propose(y,'',null);
  RAISE EXCEPTION 'SECURITY FAILURE: empty proposal';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='SECURITY FAILURE: empty proposal' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.love_adaptation_propose(y,'new',0);
  RAISE EXCEPTION 'SECURITY FAILURE: zero-minute proposal';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='SECURITY FAILURE: zero-minute proposal' THEN RAISE; END IF;
 END;
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 BEGIN
  PERFORM public.my_love_challenge_adaptations(s);
  RAISE EXCEPTION 'SECURITY FAILURE: outsider viewed';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 BEGIN
  PERFORM public.love_adaptation_propose(x,'Intruder',4);
  RAISE EXCEPTION 'SECURITY FAILURE: outsider proposed';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 BEGIN
  PERFORM public.love_adaptation_respond(x,true);
  RAISE EXCEPTION 'SECURITY FAILURE: outsider approved';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 v:=public.my_love_challenge_adaptations(s);
 IF jsonb_array_length(v)<>1 OR v->0->>'proposed_description'<>'Plus doux, à notre rythme'
    OR v->0->>'status'<>'pending' THEN
  RAISE EXCEPTION 'Other partner must see their own consent proposal: %',v;END IF;
 v:=public.love_adaptation_respond(x,true);
 IF v->>'status'<>'accepted' OR
   (public.love_adaptation_respond(x,true)->>'updated')<>'false' THEN
  RAISE EXCEPTION 'Approval must be idempotent';END IF;
 IF (public.love_adaptation_respond(x,false)->>'status')<>'accepted' THEN
  RAISE EXCEPTION 'Approved result must not be reverted'; END IF;
 IF (SELECT status FROM public.couple_challenges WHERE id=x)<>'proposed' THEN
  RAISE EXCEPTION 'Approval must not accept or complete original challenge';END IF;
 IF (SELECT card_timer_minutes FROM public.couple_challenges WHERE id=x)<>7 THEN
  RAISE EXCEPTION 'Approval must not rewrite original duration';END IF;
 v:=public.love_adaptation_propose(y,'Sans pression',15);
 IF v->>'status'<>'pending' THEN RAISE EXCEPTION 'Reverse-role proposal failed';END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 IF (public.love_adaptation_respond(y,false)->>'status')<>'declined' THEN
  RAISE EXCEPTION 'Free decline must work';END IF;
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 IF (public.love_adaptation_propose(y,'Autre suggestion',null)->>'status')<>'pending' THEN
  RAISE EXCEPTION 'A declined proposal may be voluntarily remade';END IF;
 IF (public.love_adaptation_cancel(y)->>'status')<>'cancelled' THEN
  RAISE EXCEPTION 'Author cancellation must work';END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 BEGIN
  PERFORM public.love_adaptation_cancel(y);
  RAISE EXCEPTION 'SECURITY FAILURE: nonauthor cancelled';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
 UPDATE public.couple_challenges SET status='accepted' WHERE id=z;
 BEGIN
  PERFORM public.love_adaptation_propose(z,'Started card',10);
  RAISE EXCEPTION 'SECURITY FAILURE: adapted a started challenge';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='SECURITY FAILURE: adapted a started challenge' THEN RAISE; END IF;
 END;
 UPDATE public.couple_sessions SET finished_at=now() WHERE id=s;
 BEGIN
  PERFORM public.love_adaptation_propose(y,'After closure',4);
  RAISE EXCEPTION 'SECURITY FAILURE: adapted closed session';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='SECURITY FAILURE: adapted closed session' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM public.couple_challenges)<>3 OR
    (SELECT count(*) FROM public.couple_challenges WHERE status IN('passed','completed'))<>0 THEN
  RAISE EXCEPTION 'Consent adaptation may not pass, complete or draw any challenge';END IF;
 RAISE NOTICE 'LR-017 PG17 A/B authorization, immutable cards, yes/no/cancel, expiry passed';
END
$test$;
