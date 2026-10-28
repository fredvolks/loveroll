-- Actual PG17 role isolation and two distinct playlist approvals (T1 from A and B).
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then perform public.love_eclat_v2_act(
  (s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(8,30,'two');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_music_note(sid,1,'Titre A','Artiste A');
 perform public.love_eclat_v2_music_reveal(sid,1);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_music_note(sid,1,'Titre B','Artiste B');
 perform public.love_eclat_v2_music_reveal(sid,1);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,1,'pass');
 if s->>'chapter_number'<>'3' then raise exception 'T2 scene required';end if;
 perform public.love_eclat_v2_music_note(sid,2,'Titre secret non révélé','Artiste privé');
 perform public.love_eclat_v2_act(sid,2,'pass');
 perform public.love_eclat_v2_act(sid,2,'pass');
 perform public.love_eclat_v2_act(sid,3,'pass');
 s:=public.love_eclat_v2_act(sid,3,'pass');
 if s->>'chapter_number'<>'8' then raise exception 'Playlist finale not reached';end if;
 begin
  perform public.love_eclat_v2_playlist_vote(sid,4,array[3]::smallint[]);
  raise exception 'An unrevealed song was accepted';
 exception when raise_exception then
  if sqlerrm<>'La playlist ne contient que des titres révélés' then raise;end if;
 end;
 s:=public.love_eclat_v2_playlist_vote(sid,4,array[1,2]::smallint[]);
 if s->'playlist_shared'<>'null'::jsonb or s->'my_playlist_slots'<>'[1,2]'::jsonb then
  raise exception 'One vote became public or was not saved';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->'my_playlist_slots' <> 'null'::jsonb or
    position('Titre secret non révélé' in s::text)>0 then
  raise exception 'Private draft or unrevealed title leaked';end if;
 s:=public.love_eclat_v2_playlist_vote(sid,4,array[2,1]::smallint[]);
 if s->'playlist_shared' <> 'null'::jsonb then raise exception 'Different playlist orders merged';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_playlist_vote(sid,4,array[2,1]::smallint[]);
 if jsonb_array_length(s->'playlist_shared')<>2 or
    s->'playlist_shared'->0->>'title'<>'Titre B' or
    s->'playlist_shared'->1->>'title'<>'Titre A' or
    position('Titre secret non révélé' in s::text)>0 then
  raise exception 'Only mutually agreed revealed titles should be shared';end if;
 s:=public.love_eclat_v2_act(sid,4,'continue');
 if s->>'state'<>'finished' or jsonb_array_length(s->'playlist_shared')<>2 then
  raise exception 'Consensual playlist not retained';end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.love_eclat_v2_music_notes)<>0 or
  (select count(*) from public.love_eclat_v2_playlist_votes)<>0 then
  raise exception 'Private notes or drafts retained after final';end if;
end $$;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_start(8,30,'one');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,1,'pass');
 perform public.love_eclat_v2_act(sid,2,'pass');
 perform public.love_eclat_v2_act(sid,2,'pass');
 perform public.love_eclat_v2_act(sid,3,'pass');
 perform public.love_eclat_v2_act(sid,3,'pass');
 begin
  perform public.love_eclat_v2_playlist_shared_phone(sid,4,
    '[{"title":"Titre local","artist":""}]'::jsonb);
  raise exception 'Shared phone unauthorized saved';
 exception when raise_exception then
  if sqlerrm<>'Accord oral des deux requis sur téléphone partagé' then raise;end if;
 end;
 s:=public.love_eclat_v2_playlist_shared_phone(sid,4,
    '[{"title":"Titre local","artist":""}]'::jsonb,true);
 if s->'playlist_shared'->0->>'title'<>'Titre local' then
  raise exception 'Joint shared phone list missing';end if;
 perform public.love_eclat_v2_act(sid,4,'stop');
end $$;
reset role;
