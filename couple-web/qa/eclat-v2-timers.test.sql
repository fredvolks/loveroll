-- Genuine PostgreSQL17 timing and opt-in, no production state.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then
  perform public.love_eclat_v2_act((s->>'session_id')::uuid,
   (s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(10,30,'two');sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_act(sid,1,'pass');
  raise exception 'Passed initial round without agreeing timer mode';
 exception when raise_exception then
  if sqlerrm<>'Choisir avec ou sans minuteur ensemble' then raise;end if;
 end;
 begin
  perform public.love_eclat_v2_act(sid,1,'continue');
  raise exception 'Continued without choosing timer mode';
 exception when raise_exception then
  if sqlerrm<>'Choisir avec ou sans minuteur ensemble' then raise;end if;
 end;
 s:=public.love_eclat_v2_timer_mode(sid,1,'with');
 if s->>'timer_mode' is not null then raise exception 'One account chose timer for both';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_timer_mode(sid,1,'without');
 if s->>'timer_mode' is not null then raise exception 'Disagreement forced a mode';end if;
 s:=public.love_eclat_v2_timer_mode(sid,1,'with');
 if s->>'timer_mode'<>'with' then raise exception 'Dual mode consent missing';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_timer_action(sid,1,'start');
 if s->>'timer_running'<>'true' or (s->>'timer_remaining_seconds')::int not between 85 and 90
 then raise exception 'Initial 90-second round not started';end if;
 s:=public.love_eclat_v2_timer_action(sid,1,'pause');
 if s->>'timer_running'<>'false' or (s->>'timer_remaining_seconds')::int not between 85 and 90
 then raise exception 'Round not paused';end if;
 s:=public.love_eclat_v2_timer_action(sid,1,'resume');
 if s->>'timer_running'<>'true' then raise exception 'Round not resumed';end if;
 s:=public.love_eclat_v2_act(sid,1,'pause');
 if s->>'timer_running'<>'false' or s->>'state'<>'paused' then
  raise exception 'App pause failed to freeze round';end if;
 s:=public.love_eclat_v2_act(sid,1,'resume');
 if s->>'timer_running'<>'false' then raise exception 'App resume should wait for user timer resume';end if;
end $$;
reset role;
do $$
begin
 update public.love_eclat_v2_sessions
  set timer_deadline=clock_timestamp()-interval '2 seconds',timer_remaining=90
  where coffret_id=10 and state='active';
end $$;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->>'timer_expired'<>'true' or s->>'state'<>'active' then
  raise exception 'Elapsed round must not complete the game';end if;
 s:=public.love_eclat_v2_timer_action(sid,1,'extend');
 if s->>'timer_extensions'<>'1' or s->>'timer_running'<>'true' then
  raise exception 'One-minute extension failed';end if;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' or s->>'timer_remaining_seconds' is not null
 then raise exception 'New scene retained old round';end if;
 s:=public.love_eclat_v2_timer_action(sid,2,'start');
 if (s->>'timer_remaining_seconds')::int not between 115 and 120 then
  raise exception 'Scene 3 must use 120 seconds';end if;
 perform public.love_eclat_v2_act(sid,2,'stop');
 s:=public.love_eclat_v2_start(10,30,'one');sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_timer_mode(sid,1,'without');
  raise exception 'Shared phone selected mode without oral consent';
 exception when raise_exception then
  if sqlerrm<>'Accord oral des deux requis' then raise;end if;
 end;
 s:=public.love_eclat_v2_timer_mode(sid,1,'without',true);
 if s->>'timer_mode'<>'without' then raise exception 'No-timer choice unavailable';end if;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' then raise exception 'Untimed round did not advance';end if;
end $$;
reset role;
