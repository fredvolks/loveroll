-- No non-common card ID may ever reach another user's session snapshot.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then perform public.love_eclat_v2_act(
  (s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(9,30,'two');sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_cards_submit(sid,1,array[1,7,9]::smallint[]);
 begin
  perform public.love_eclat_v2_mark_ready(sid,1,true);
  raise exception 'Generic readiness bypassed private selections';
 exception when raise_exception then
  if sqlerrm<>'Validez les cartes avec le bouton privé dédié' then raise;end if;
 end;
 if s->'my_cards'<>'[1,7,9]'::jsonb or s->'common_cards'<> 'null'::jsonb then
  raise exception 'First private 09 vote saved incorrectly';end if;
 begin
  perform public.love_eclat_v2_cards_submit(sid,1,array[1,1]::smallint[]);
  raise exception 'Repeated selections allowed';
 exception when raise_exception then
  if sqlerrm<>'Choisissez de zéro à trois cartes distinctes' then raise;end if;
 end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->'my_cards' <> '[]'::jsonb or s::text like '%[1, 7, 9]%' then
  raise exception 'Partner A selections leaked to B';end if;
 s:=public.love_eclat_v2_cards_submit(sid,1,array[7,11]::smallint[]);
 if s->'common_cards'<>'[7]'::jsonb or s->>'revealed'<>'true' then
  raise exception 'Intersection was not limited to 7';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;n integer;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->'common_cards'<>'[7]'::jsonb then raise exception 'Only common card 7 permitted';end if;
 begin
  perform public.love_eclat_v2_card_vote(sid,1,1);
  raise exception 'Unshared card chosen';
 exception when raise_exception then
  if sqlerrm<>'Carte non commune ou étape indisponible' then raise;end if;
 end;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' then raise exception 'Scene 3 missing';end if;
 begin
  perform public.love_eclat_v2_act(sid,2,'continue');
  raise exception 'Continued without joint card';
 exception when raise_exception then
  if sqlerrm<>'Choisir ensemble une carte commune' then raise;end if;
 end;
 s:=public.love_eclat_v2_card_vote(sid,2,7);
 if s->>'selected_card' is not null then raise exception 'One participant chose for both';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_card_vote(sid,2,7);
 if s->>'selected_card'<>'7' then raise exception 'Joint card selection failed';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' or s->>'selected_card'<>'7' then
  raise exception 'Agreed card not retained';end if;
 perform public.love_eclat_v2_act(sid,3,'stop');
 s:=public.love_eclat_v2_start(9,30,'one');sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_cards_shared(sid,1,array[7]::smallint[],false);
  raise exception 'Unapproved shared choice stored';
 exception when raise_exception then
  if sqlerrm<>'Accord oral commun explicite requis' then raise;end if;
 end;
 s:=public.love_eclat_v2_cards_shared(sid,1,array[7]::smallint[],true);
 if s->'common_cards'<>'[7]'::jsonb or s->'my_cards'<>'[]'::jsonb then
  raise exception 'Shared device stored private picks';end if;
end $$;
-- Verify unfinished private choices are purged when the session is stopped.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,1,'stop');
 s:=public.love_eclat_v2_start(9,30,'two');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_cards_submit(sid,1,array[1,3]::smallint[]);
 perform public.love_eclat_v2_act(sid,1,'stop');
end $$;
reset role;
do $$
begin
 if (select count(*) from public.love_eclat_v2_card_choices)<>0 then
  raise exception 'Unshared selections remain in raw session table';end if;
end $$;
