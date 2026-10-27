-- Test genuine SQL and permission boundaries with PostgreSQL 17, no mocks of the V2 RPCs.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb; again jsonb;
begin
 begin
  perform public.love_eclat_v2_start(1,30,'two',1);
  raise exception 'New couple replayed V1 without history';
 exception when raise_exception then
  if sqlerrm<>'Version à rejouer introuvable dans cet historique' then raise; end if;
 end;
 s:=public.love_eclat_v2_start(1,30,'two');
 if s->>'variant'<>'0' or s->>'role_a'<>'00000000-0000-0000-0000-000000000001'
    or s->>'role_b'<>'00000000-0000-0000-0000-000000000002'
    or s->>'chapter_number'<>'1' or s->>'chapter_total'<>'4'
 then raise exception 'First session contract invalid: %',s; end if;
 again:=public.love_eclat_v2_start(2,90,'one');
 if again->>'session_id'<>s->>'session_id' then raise exception 'Start did not resume active session'; end if;
 begin
  perform * from public.love_eclat_v2_sessions;
  raise exception 'Direct read leaked';
 exception when insufficient_privilege then null; end;
 begin
  perform public.love_eclat_v2_reveal((s->>'session_id')::uuid,1,false);
  raise exception 'Premature reveal permitted';
 exception when raise_exception then
  if sqlerrm<>'Attendre les deux confirmations distinctes' then raise; end if;
 end;
 perform public.love_eclat_v2_mark_ready((s->>'session_id')::uuid,1,true);
 again:=public.love_eclat_v2_status((s->>'session_id')::uuid);
 if again->>'ready_count'<>'1' or again->>'can_reveal'<>'false' then
  raise exception 'One partner readiness not isolated'; end if;
end $$;
select set_config('eclat.test.session',
 (public.love_eclat_v2_status()->>'session_id'), false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare s uuid;
begin
 s:=current_setting('eclat.test.session')::uuid;
 begin
  perform public.love_eclat_v2_status(s);
  raise exception 'Cross-couple status leaked';
 exception when insufficient_privilege then null; end;
 begin
  perform public.love_eclat_v2_mark_ready(s,1,true);
  raise exception 'Cross-couple readiness permitted';
 exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s uuid; x jsonb;
begin
 -- RPC status omits session identifiers when no active id is requested? Use guarded own couple status.
 x:=public.love_eclat_v2_status();
 s:=(x->>'session_id')::uuid;
 x:=public.love_eclat_v2_mark_ready(s,1,true);
 if x->>'ready_count'<>'2' or x->>'can_reveal'<>'true' then raise exception 'Two-person readiness broken';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s uuid;x jsonb; y jsonb;
begin
 x:=public.love_eclat_v2_status(); s:=(x->>'session_id')::uuid;
 x:=public.love_eclat_v2_reveal(s,1,false);
 if x->>'revealed'<>'true' then raise exception 'Reveal not persisted';end if;
 x:=public.love_eclat_v2_act(s,1,'pass');
 if x->>'chapter_number'<>'3' or x->>'chapter_index'<>'2' or x->'skipped_scenes'<>'[1]'::jsonb
 then raise exception 'Skip must advance once %',x; end if;
 y:=public.love_eclat_v2_act(s,1,'pass');
 if y->>'chapter_index'<>'2' then raise exception 'Stale retry advanced twice';end if;
 y:=public.love_eclat_v2_act(s,2,'pause');
 if y->>'state'<>'paused' then raise exception 'Pause failed'; end if;
 begin
  perform public.love_eclat_v2_act(s,2,'continue');
  raise exception 'Advanced a paused scene';
 exception when raise_exception then
  if sqlerrm<>'Reprendre la séance avant de continuer' then raise; end if;
 end;
 y:=public.love_eclat_v2_act(s,2,'resume');
 if y->>'state'<>'active' then raise exception 'Resume failed';end if;
 y:=public.love_eclat_v2_act(s,2,'stop');
 if y->>'state'<>'interrupted' or y->>'active'<>'false' then raise exception 'Stop claimed success';end if;
 x:=public.love_eclat_v2_start(1,90,'one');
 if x->>'variant'<>'1' or x->>'device_mode'<>'one' or x->>'chapter_total'<>'8'
 then raise exception 'Interrupted start should alternate V1';end if;
 s:=(x->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_mark_ready(s,1,true);
  raise exception 'Shared device impersonated B';
 exception when raise_exception then
  if sqlerrm<>'Confirmation privée non autorisée à cette étape' then raise; end if;
 end;
 begin
  perform public.love_eclat_v2_reveal(s,1,false);
  raise exception 'Missing oral agreement accepted';
 exception when raise_exception then
  if sqlerrm<>'Accord oral commun explicite requis' then raise; end if;
 end;
 x:=public.love_eclat_v2_reveal(s,1,true);
 if x->>'revealed'<>'true' then raise exception 'Explicit shared oral agreement not honored';end if;
 x:=public.love_eclat_v2_act(s,1,'continue');
 if x->>'chapter_number'<>'2' then raise exception '90-minute step progression invalid';end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.love_eclat_v2_sessions)<>2 then
  raise exception 'Expected two V2 sessions';end if;
 if (select count(*) from public.love_eclat_sessions)<>0 then
  raise exception 'Unexpected V1 modification';end if;
end $$;
