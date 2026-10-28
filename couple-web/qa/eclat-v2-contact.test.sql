-- Separate couple after door tests. Test two authenticated users and shared-device oral mode.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,(s->>'chapter_index')::integer,'stop');
 s:=public.love_eclat_v2_start(3,30,'two');sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,1,'continue');
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' then raise exception 'Sensory stage 6 absent';end if;
 s:=public.love_eclat_v2_contact_answer(sid,3,'mains','yes');
 if s->>'contact_approved'<>'false' then raise exception 'One person approved contact for two';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_contact_answer(sid,3,'mains','yes');
 if s->>'contact_approved'<>'true' then raise exception 'Two affirmative answers required';end if;
 s:=public.love_eclat_v2_contact_answer(sid,3,'mains','other');
 if s->>'contact_approved'<>'false' then raise exception 'Other proposal did not revoke contact';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->>'my_contact_response'<>'yes' then raise exception 'Own choice absent';end if;
 s:=public.love_eclat_v2_contact_answer(sid,3,'mains','pass');
 if s->>'contact_approved'<>'false' then raise exception 'Pass must not grant contact';end if;
 s:=public.love_eclat_v2_act(sid,3,'stop');
 s:=public.love_eclat_v2_start(3,30,'one');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,1,'continue');
 perform public.love_eclat_v2_act(sid,2,'continue');
 begin
  perform public.love_eclat_v2_contact_answer(sid,3,'mains','yes');
  raise exception 'Shared phone impersonated an oral Oui';
 exception when raise_exception then
  if sqlerrm<>'Accord oral des deux requis pour le contact' then raise;end if;
 end;
 s:=public.love_eclat_v2_contact_answer(sid,3,'mains','yes',true);
 if s->>'contact_approved'<>'true' then raise exception 'Explicit joint approval missing';end if;
 s:=public.love_eclat_v2_contact_answer(sid,3,'mains','pass',false);
 if s->>'contact_approved'<>'false' then raise exception 'Withdrawal must be possible';end if;
end $$;
