-- Cohesive 11/05 shared attention engine; 2 different authorized actors.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then
  perform public.love_eclat_v2_act((s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');end if;
 s:=public.love_eclat_v2_start(11,30,'two');sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 if s->>'chapter_number'<>'3' then raise exception 'Coffret 11 scene 3 missing';end if;
 begin
  perform public.love_eclat_v2_act(sid,2,'continue');
  raise exception 'Progressed without opt-in attention reply';
 exception when raise_exception then
  if sqlerrm<>'Attendre la réponse volontaire au jeu de séduction' then raise;end if;
 end;
 s:=public.love_eclat_v2_attention_propose(sid,2,2);
 if s->>'attention_index'<>'2' then raise exception 'A did not propose card 3';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_attention_propose(sid,2,1);
  raise exception 'B impersonated proposer A';
 exception when raise_exception then
  if sqlerrm<>'Seul le partenaire qui propose peut choisir' then raise;end if;
 end;
 s:=public.love_eclat_v2_attention_reply(sid,2,'other');
 if s->>'attention_response'<>'other' then raise exception 'Requested alternative not stored';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_propose(sid,2,1);
 if s->>'attention_index'<>'1' or s->>'attention_response' is not null
 then raise exception 'Alternative did not reset reply';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_reply(sid,2,'pass');
 if s->>'attention_response'<>'pass' then raise exception 'Pass was not voluntary';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' or s->>'attention_index' is not null
 then raise exception 'Second partner turn retained old proposal';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_propose(sid,3,0);
 if s->>'attention_index'<>'0' then raise exception 'B cannot propose as second author';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_attention_reply(sid,3,'yes');
 if s->>'attention_response'<>'yes' then raise exception 'A acceptance missing';end if;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'8' then raise exception 'Finale not reached';end if;
end $$;
reset role;
