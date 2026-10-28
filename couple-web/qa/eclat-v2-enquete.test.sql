-- Postgres 17 isolated genuine RPCs. No production identities.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then
  perform public.love_eclat_v2_act((s->>'session_id')::uuid,
   (s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(6,30,'two');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_mark_ready(sid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ begin
 perform public.love_eclat_v2_mark_ready((public.love_eclat_v2_status()->>'session_id')::uuid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_reveal(sid,1);
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' then raise exception 'Scene 3 required';end if;
 begin
  perform public.love_eclat_v2_act(sid,2,'continue');
  raise exception 'Premature puzzle advance';
 exception when raise_exception then
  if sqlerrm<>'Résolvez l’enquête ou révélez la solution avec l’aide' then raise;end if;
 end;
 s:=public.love_eclat_v2_puzzle_try(sid,2,'Salon','21 h 20');
 if s->>'correct'<>'false' or s->>'puzzle_solved'<>'false' then
  raise exception 'Wrong answer accepted';end if;
 s:=public.love_eclat_v2_puzzle_try(sid,2,'Verrière','21 h 30');
 if s->>'correct'<>'true' then raise exception 'V0 place time rejected';end if;
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' or s->>'puzzle_solved'<>'false' then
  raise exception 'Scene advance did not reset puzzle';end if;
 s:=public.love_eclat_v2_puzzle_try(sid,3,null,null,'481');
 if s->>'correct'<>'false' then raise exception 'Wrong V0 code accepted';end if;
 s:=public.love_eclat_v2_puzzle_help(sid,3);
 if s->>'puzzle_hint_level'<>'1' then raise exception 'Hint 1 missing';end if;
 s:=public.love_eclat_v2_puzzle_help(sid,3);
 if s->>'puzzle_hint_level'<>'2' or s->>'puzzle_helped'<>'true'
 then raise exception 'Hint 2 must mark assistance';end if;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'8' or s->>'puzzle_helped'<>'true'
 then raise exception 'Assisted finale missing';end if;
 perform public.love_eclat_v2_act(sid,4,'stop');
 s:=public.love_eclat_v2_start(6,30,'two');
 if s->>'variant'<>'1' then raise exception 'Alternation failed';end if;
 sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_mark_ready(sid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ begin
 perform public.love_eclat_v2_mark_ready((public.love_eclat_v2_status()->>'session_id')::uuid,1,true);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_reveal(sid,1);
 perform public.love_eclat_v2_act(sid,1,'continue');
 s:=public.love_eclat_v2_puzzle_try(sid,2,'Pavillon','20 h 45');
 if s->>'correct'<>'true' then raise exception 'V1 place/time rejected';end if;
 perform public.love_eclat_v2_act(sid,2,'continue');
 s:=public.love_eclat_v2_puzzle_try(sid,3,null,null,'562');
 if s->>'correct'<>'true' then raise exception 'V1 code rejected';end if;
end $$;
reset role;
