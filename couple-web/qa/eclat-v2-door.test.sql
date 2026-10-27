-- Execute after the parallel-start check. Uses a separate couple, never V1 production data.
set role authenticated;
select set_config('request.jwt.claim.sub',public.love_eclat_v2_status()->>'role_a',false);
select set_config('request.jwt.claim.sub',public.love_eclat_v2_status()->>'role_a',false);
do $$
declare s jsonb; sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->>'coffret_id'<>'4' or s->>'chapter_number'<>'1' then
  raise exception 'Expected first door scene for couple 2';end if;
 begin
  perform public.love_eclat_v2_act(sid,1,'continue');
  raise exception 'Unconfirmed door could be passed with continue';
 exception when raise_exception then
  if sqlerrm<>'Attendre le choix commun de la porte' then raise;end if;
 end;
 s:=public.love_eclat_v2_choose_door(sid,1,'Tendresse');
 if s->>'branch' is not null then raise exception 'One partner chose for both';end if;
 if s->>'my_door_vote'<>'Tendresse' then raise exception 'Own choice not retained';end if;
end $$;
select set_config('request.jwt.claim.sub',public.love_eclat_v2_status()->>'role_b',false);
do $$
declare s jsonb; sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_choose_door(sid,1,'Mystère');
 if s->>'branch' is not null then raise exception 'Disagreement was forced';end if;
 s:=public.love_eclat_v2_choose_door(sid,1,'Tendresse');
 if s->>'branch'<>'Tendresse' or s->>'door_confirmed'<>'true' then
  raise exception 'Mutual door vote not persisted';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare s jsonb; sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,1,'stop');
 if s->>'state'<>'interrupted' then raise exception 'Stop contract broken';end if;
 -- A new long session alternates to V1 and permits skipping opening door.
 s:=public.love_eclat_v2_start(4,90,'two');
 if s->>'variant'<>'1' or s->>'chapter_number'<>'1' then raise exception 'V1 start invalid';end if;
 sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,1,'pass');
 if s->>'branch'<>'Jeu' or s->>'chapter_number'<>'2' then
  raise exception 'Skipped initial door must choose Jeu';end if;
 for step in 2..4 loop
  s:=public.love_eclat_v2_act(sid,step,'continue');
 end loop;
 if s->>'chapter_number'<>'5' or s->>'branch'<>'Jeu' then
  raise exception 'Long path did not preserve branch';end if;
 s:=public.love_eclat_v2_choose_door(sid,5,'Mystère');
 if s->>'branch'<>'Jeu' then raise exception 'One vote changed existing branch';end if;
end $$;
select set_config('request.jwt.claim.sub',public.love_eclat_v2_status()->>'role_b',false);
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_choose_door(sid,5,'Mystère');
 if s->>'branch'<>'Mystère' or s->>'door_confirmed'<>'true' then
  raise exception 'Scene 5 did not switch branch with two votes';end if;

end $$;
-- Only the creator/controller may advance the agreed shared scene.
select set_config('request.jwt.claim.sub',public.love_eclat_v2_status()->>'role_a',false);
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,5,'continue');
 if s->>'chapter_number'<>'6' or s->>'branch'<>'Mystère' then
  raise exception 'New branch failed to continue to activity B';end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.love_eclat_v2_sessions
    where couple_id='10000000-0000-0000-0000-000000000002')<>2
 then raise exception 'Two and only two V2 starts expected';end if;
end $$;
