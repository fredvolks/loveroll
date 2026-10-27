-- Two phones with real authenticated authors. No actual songs/third party services.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then
  perform public.love_eclat_v2_act((s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');
 end if;
 s:=public.love_eclat_v2_start(8,30,'two');sid:=(s->>'session_id')::uuid;
 if s->>'music_theme'<>'1' then raise exception 'First theme must be T1';end if;
 s:=public.love_eclat_v2_music_note(sid,1,'Chanson A','Artiste A');
 if s->'my_music_note'->>'title'<>'Chanson A' then raise exception 'Private note lost';end if;
 if jsonb_array_length(s->'revealed_music')<>0 then raise exception 'Private song disclosed';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->>'my_music_note' is not null or jsonb_array_length(s->'revealed_music')<>0 or position('Chanson A' in s::text)>0 then
  raise exception 'A notes leaked to B';end if;
 begin
  perform public.love_eclat_v2_music_reveal(sid,1);
  raise exception 'B revealed A private title';
 exception when raise_exception then
  if sqlerrm<>'Écrire son titre avant de le révéler' then raise;end if;
 end;
 s:=public.love_eclat_v2_music_note(sid,1,'Chanson B',null);
 if s->'my_music_note'->>'title'<>'Chanson B' then raise exception 'B own note missing';end if;
 perform public.love_eclat_v2_music_reveal(sid,1);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if jsonb_array_length(s->'revealed_music')<>1 or
  s->'revealed_music'->0->>'title'<>'Chanson B' then
  raise exception 'Only B voluntarily revealed song should appear';end if;
 s:=public.love_eclat_v2_music_reveal(sid,1);
 if jsonb_array_length(s->'revealed_music')<>2 then
  raise exception 'Second independent reveal failed';end if;
 begin
  perform public.love_eclat_v2_music_note(sid,1,'Réécriture forcée',null);
  raise exception 'Revealed music changed unilaterally';
 exception when raise_exception then
  if sqlerrm<>'Titre déjà révélé : note non modifiable' then raise;end if;
 end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 -- Independent mandatory scene reveal is still a separate action.
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
 if s->>'chapter_number'<>'3' or s->>'music_theme'<>'2' then
  raise exception 'Next theme T2 not reached';end if;
 perform public.love_eclat_v2_act(sid,2,'pass');
 s:=public.love_eclat_v2_status();
 if s->>'music_theme'<>'3' then raise exception 'Skipped T2 did not preserve T3';end if;
end $$;
reset role;
