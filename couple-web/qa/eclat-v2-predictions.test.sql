-- Real 2-account prediction flow, saved only for author until dual reveal.
-- Uses fixture duo 1, after all former tests. No personal accounts.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then
  perform public.love_eclat_v2_act((s->>'session_id')::uuid,
   (s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(7,30,'two');
 sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_mark_ready(sid,1,true);
  raise exception 'Ready without own prediction accepted';
 exception when raise_exception then
  if sqlerrm<>'Réponse et prédiction requises avant de confirmer' then raise;end if;
 end;
 s:=public.love_eclat_v2_predict(sid,1,0,1);
 if s->>'my_answer'<>'0' or s->>'my_prediction'<>'1' then
  raise exception 'Author answer was not saved';end if;
 perform public.love_eclat_v2_mark_ready(sid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->>'my_answer' is not null or s->>'reveal_answers' is not null then
  raise exception 'A private prediction leaked to B';end if;
 s:=public.love_eclat_v2_predict(sid,1,2,0);
 perform public.love_eclat_v2_mark_ready(sid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_reveal(sid,1);
 if s->'reveal_answers'->'players'->'A'->>'answer'<>'0'
  or s->'reveal_answers'->'players'->'B'->>'answer'<>'2'
  or s->'reveal_answers'->>'question'<>'1' then
  raise exception 'Joint reveal failed';end if;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' or s->>'reveal_answers' is not null
 then raise exception 'Previous answers retained past next scene';end if;
 s:=public.love_eclat_v2_predict(sid,2,1,2);
 perform public.love_eclat_v2_mark_ready(sid,2,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_predict(sid,2,0,1);
 perform public.love_eclat_v2_mark_ready(sid,2,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_reveal(sid,2);
 if s->>'substep_index'<>'2' or s->>'ready_count'<>'0'
  or s->'reveal_answers'->>'question'<>'2' then
  raise exception 'Question 2 did not reveal and hand off to 3';end if;
 begin
  perform public.love_eclat_v2_mark_ready(sid,2,true);
  raise exception 'Stale readiness leaked to question 3';
 exception when raise_exception then
  if sqlerrm<>'Réponse et prédiction requises avant de confirmer' then raise;end if;
 end;
 s:=public.love_eclat_v2_act(sid,2,'pass');
 if s->>'chapter_number'<>'6' then
  raise exception 'Second question pass must advance scene';end if;
 if s->>'reveal_answers' is not null then raise exception 'Skipped question revealed previous data';end if;
end $$;
reset role;
