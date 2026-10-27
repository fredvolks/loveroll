-- Real unbiased D6 rolls in isolated PG17. Validates persistence and concurrence semantics.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;d jsonb;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then perform public.love_eclat_v2_act(
  (s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(12,30,'two');sid:=(s->>'session_id')::uuid;
 d:=s->'story_dice';
 if (d->>'decor')::int not between 1 and 6 or
    (d->>'roles')::int not between 1 and 6 or
    (d->>'constraint')::int not between 1 and 6
 then raise exception 'Initial D6 values out of range';end if;
 if public.love_eclat_v2_status(sid)->'story_dice'<>d
 then raise exception 'Reconnection rerolled story dice';end if;
 s:=public.love_eclat_v2_story_vote(sid,1,'reroll',0);
 if s->>'constraint_rerolls'<>'0' then raise exception 'Single vote rerolled';end if;
 if s->>'my_story_vote'<>'reroll' then raise exception 'Own vote unavailable';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_story_vote(sid,1,'keep',0);
 if s->>'constraint_rerolls'<>'0' then raise exception 'Disagreement forced roll';end if;
 s:=public.love_eclat_v2_story_vote(sid,1,'reroll',0);
 if s->>'constraint_rerolls'<>'1' or jsonb_array_length(s->'story_reroll_history')<>1
 then raise exception 'Two distinct voters failed reroll';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;before_draw jsonb;after_draw jsonb;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 after_draw:=s->'story_dice';
 s:=public.love_eclat_v2_story_vote(sid,1,'reroll',0);
 if s->>'constraint_rerolls'<>'1' then raise exception 'Stale retry caused duplicate reroll';end if;
 s:=public.love_eclat_v2_story_vote(sid,1,'reroll',1);
 if s->>'constraint_rerolls'<>'1' then raise exception 'Single new vote rerolled';end if;
 before_draw:=s->'story_dice';
 if (before_draw->>'decor')::int not between 1 and 6 or
  (before_draw->>'roles')::int not between 1 and 6 then
  raise exception 'Decor or roles invalid';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_story_vote(sid,1,'reroll',1);
 if s->>'constraint_rerolls'<>'2' or jsonb_array_length(s->'story_reroll_history')<>2
 then raise exception 'Second voluntary reroll not recorded';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,1,'pass');
 perform public.love_eclat_v2_act(sid,2,'continue');
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'6' then raise exception 'Scene 6 was not reached';end if;
 s:=public.love_eclat_v2_story_vote(sid,3,'off',2);
 if s->>'constraint_enabled'<>'true' then
  raise exception 'One role turned off the shared constraint';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_story_vote(sid,3,'off',2);
 if s->>'constraint_enabled'<>'false' then raise exception 'Off vote needs mutual agreement';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,3,'stop');
 s:=public.love_eclat_v2_start(12,30,'one');sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_story_vote(sid,1,'reroll',0);
  raise exception 'Shared mode reroll without oral agreement accepted';
 exception when raise_exception then
  if sqlerrm<>'Accord oral des deux requis' then raise;end if;
 end;
 s:=public.love_eclat_v2_story_vote(sid,1,'reroll',0,true);
 if s->>'constraint_rerolls'<>'1' then raise exception 'Explicit oral shared reroll failed';end if;
end $$;
reset role;
