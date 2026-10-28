-- Real PostgreSQL integration: 05 A/B proposals, independent responses and one-phone safety.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then perform public.love_eclat_v2_act(
  (s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(5,30,'two');sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' or s->>'substep_index'<>'1' then
  raise exception 'Coffret 05 stage 6 unavailable';end if;
 begin
  perform public.love_eclat_v2_act(sid,3,'continue');
  raise exception 'Advanced before recipient responded';
 exception when raise_exception then
  if sqlerrm<>'Attendre Oui ou Passer pour cette attention' then raise;end if;
 end;
 s:=public.love_eclat_v2_attention_propose(sid,3,0);
 if s->>'attention_index'<>'0' or s->>'attention_response' is not null
 then raise exception 'A proposal not recorded';end if;
 begin
  perform public.love_eclat_v2_attention_reply(sid,3,'yes');
  raise exception 'A responded as recipient B';
 exception when raise_exception then
  if sqlerrm<>'Seul le destinataire peut répondre' then raise;end if;
 end;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_attention_propose(sid,3,1);
  raise exception 'B proposed as A';
 exception when raise_exception then
  if sqlerrm<>'Seul le partenaire qui propose peut choisir' then raise;end if;
 end;
 s:=public.love_eclat_v2_attention_reply(sid,3,'other');
 if s->>'attention_response'<>'other' then raise exception 'Alternative not requested';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_propose(sid,3,2);
 if s->>'attention_index'<>'2' or s->>'attention_response' is not null then
  raise exception 'New attention not offered';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_reply(sid,3,'pass');
 if s->>'attention_response'<>'pass' then raise exception 'Refusal incorrectly treated as yes';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'substep_index'<>'2' or s->>'chapter_number'<>'6' or s->>'attention_index' is not null
 then raise exception 'Second turn not clean';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_propose(sid,3,1);
 if s->>'attention_index'<>'1' then raise exception 'B did not propose';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_reply(sid,3,'yes');
 if s->>'attention_response'<>'yes' then raise exception 'A did not accept';end if;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'8' then raise exception 'Finale not reached';end if;
 perform public.love_eclat_v2_act(sid,4,'stop');
 s:=public.love_eclat_v2_start(5,30,'one');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,1,'continue');
 perform public.love_eclat_v2_act(sid,2,'continue');
 begin
  perform public.love_eclat_v2_attention_propose(sid,3,0);
  raise exception 'Shared phone silently pretended two users';
 exception when raise_exception then
  if sqlerrm<>'Proposition orale du couple requise' then raise;end if;
 end;
 s:=public.love_eclat_v2_attention_propose(sid,3,0,true);
 begin
  perform public.love_eclat_v2_attention_reply(sid,3,'yes');
  raise exception 'Shared phone silently accepted consent';
 exception when raise_exception then
  if sqlerrm<>'Réponse orale commune requise' then raise;end if;
 end;
 s:=public.love_eclat_v2_attention_reply(sid,3,'pass',true);
 if s->>'attention_response'<>'pass' then raise exception 'Joint oral pass not saved';end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.love_eclat_v2_attentions where response='other')<>0 then
  raise exception 'An old alternative was retained as a preference';end if;
end $$;
