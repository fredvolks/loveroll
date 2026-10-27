-- Postgres 17, real transaction transitions, no production user records.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb; sid uuid;
begin
 s:=public.love_eclat_v2_status();
 perform public.love_eclat_v2_act((s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');
 s:=public.love_eclat_v2_start(1,30,'two');sid:=(s->>'session_id')::uuid;
 if s->>'chapter_number'<>'1' then raise exception 'New 30min game did not start at envelope 1';end if;
 perform public.love_eclat_v2_mark_ready(sid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 perform public.love_eclat_v2_mark_ready((public.love_eclat_v2_status()->>'session_id')::uuid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_reveal(sid,1);
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' then raise exception 'Enveloppe 2 must be scene 3';end if;
 perform public.love_eclat_v2_mark_ready(sid,2,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 perform public.love_eclat_v2_mark_ready((public.love_eclat_v2_status()->>'session_id')::uuid,2,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_reveal(sid,2);
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' or s->>'substep_index'<>'1'
 then raise exception 'Expected envelope 3 at stage 6';end if;
 perform public.love_eclat_v2_mark_ready(sid,3,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 perform public.love_eclat_v2_mark_ready((public.love_eclat_v2_status()->>'session_id')::uuid,3,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_reveal(sid,3);
 if s->>'substep_index'<>'2' or s->>'revealed'<>'false' or s->>'ready_count'<>'0'
 then raise exception 'First reveal did not lock the next envelope';end if;
 begin
  perform public.love_eclat_v2_act(sid,3,'continue');
  raise exception 'Could skip second envelope without pass';
 exception when raise_exception then
  if sqlerrm<>'Révélation convenue requise avant de continuer' then raise;end if;
 end;
 perform public.love_eclat_v2_mark_ready(sid,3,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 perform public.love_eclat_v2_mark_ready((public.love_eclat_v2_status()->>'session_id')::uuid,3,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_reveal(sid,3);
 if s->>'revealed'<>'true' or s->>'substep_index'<>'2' then
  raise exception 'Second envelope not revealed';end if;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'8' or s->>'substep_index'<>'1'
 then raise exception 'Final invitation did not open correctly';end if;
end $$;
