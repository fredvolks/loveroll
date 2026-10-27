-- True two-person consent, withdrawal, no inferred approval from card 7.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();
 if s->>'active'='true' then
  perform public.love_eclat_v2_act((s->>'session_id')::uuid,(s->>'chapter_index')::integer,'stop');
 end if;
 s:=public.love_eclat_v2_start(9,60,'two');sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_cards_submit(sid,1,array[7]::smallint[]);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ declare s jsonb;begin
 s:=public.love_eclat_v2_status();
 perform public.love_eclat_v2_cards_submit((s->>'session_id')::uuid,1,array[7]::smallint[]);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 perform public.love_eclat_v2_act(sid,1,'continue');
 perform public.love_eclat_v2_act(sid,2,'continue');
 perform public.love_eclat_v2_card_vote(sid,3,7);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ declare s jsonb;begin
 s:=public.love_eclat_v2_status();
 perform public.love_eclat_v2_card_vote((s->>'session_id')::uuid,3,7);
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'5' then raise exception 'Scene five not reached';end if;
 begin
  perform public.love_eclat_v2_act(sid,4,'continue');
  raise exception 'Passed unapproved scene 5';
 exception when raise_exception then
  if sqlerrm<>'Décidez ensemble maintenant, plus tard ou passer' then raise;end if;
 end;
 s:=public.love_eclat_v2_wish_vote(sid,4,'now');
 if s->>'wish_scene5' is not null then raise exception 'One person decided for both';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_wish_vote(sid,4,'later');
 if s->>'wish_scene5' is not null then raise exception 'Disagreement auto-accepted';end if;
 s:=public.love_eclat_v2_wish_vote(sid,4,'now');
 if s->>'wish_scene5'<>'now' then raise exception 'Two votes not combined';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,4,'continue');
 if s->>'chapter_number'<>'6' then raise exception 'Scene six not reached';end if;
 begin
  perform public.love_eclat_v2_wish_vote(sid,5,'with-contact');
  raise exception 'Contact auto-approved from card';
 exception when raise_exception then
  if sqlerrm<>'Deux Oui de contact nécessaires' then raise;end if;
 end;
 s:=public.love_eclat_v2_wish_contact_answer(sid,5,true);
 if s->>'wish_contact_approved'<>'false' then raise exception 'Single contact Yes approved two';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_wish_contact_answer(sid,5,true);
 if s->>'wish_contact_approved'<>'true' then raise exception 'Two contact Yes missing';end if;
 s:=public.love_eclat_v2_wish_vote(sid,5,'with-contact');
 if s->>'wish_scene6' is not null then raise exception 'B consented to activity as A';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_wish_vote(sid,5,'with-contact');
 if s->>'wish_scene6'<>'with-contact' then raise exception 'Matching votes not saved';end if;
 s:=public.love_eclat_v2_wish_contact_answer(sid,5,false);
 if s->>'wish_scene6' is not null or s->>'wish_contact_approved'<>'false' then
  raise exception 'Consent withdrawal not honored';end if;
 begin
  perform public.love_eclat_v2_act(sid,5,'continue');
  raise exception 'Activity remained authorized after withdrawal';
 exception when raise_exception then
  if sqlerrm<>'Accord de participation distinct requis' then raise;end if;
 end;
 s:=public.love_eclat_v2_wish_vote(sid,5,'without-contact');
 if s->>'wish_scene6' is not null then raise exception 'Only A chose no-contact';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;begin
 s:=public.love_eclat_v2_status();
 s:=public.love_eclat_v2_wish_vote((s->>'session_id')::uuid,5,'without-contact');
 if s->>'wish_scene6'<>'without-contact' then raise exception 'No-contact alternative not available';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,5,'continue');
 if s->>'chapter_number'<>'8' or s->>'wish_contact_approved'<>'false' then
  raise exception 'Consent carried into final scene';end if;
 s:=public.love_eclat_v2_wish_vote(sid,6,'keep');
 if s->>'wish_invitation_card' is not null then raise exception 'Unilateral invitation';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare s jsonb;begin
 s:=public.love_eclat_v2_status();
 s:=public.love_eclat_v2_wish_vote((s->>'session_id')::uuid,6,'keep');
 if s->>'wish_invitation_card'<>'7' then raise exception 'Common invitation missing';end if;
end $;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_wish_phrase(sid,6,' Notre petite surprise ');
 if s->>'wish_invitation_text' is not null or
  s->>'my_wish_phrase'<>'Notre petite surprise' then
  raise exception 'Own phrase wrongly shared before partner approval';end if;
end $;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 if s->>'my_wish_phrase' is not null or
   position('Notre petite surprise' in s::text)>0 then
  raise exception 'Unapproved phrase leaked to other account';end if;
 s:=public.love_eclat_v2_wish_phrase(sid,6,'Une autre phrase');
 if s->>'wish_invitation_text' is not null then
  raise exception 'Different private phrases approved';end if;
 s:=public.love_eclat_v2_wish_phrase(sid,6,'Notre petite surprise');
 if s->>'wish_invitation_text'<>'Notre petite surprise' then
  raise exception 'Matching invitation phrase was not approved';end if;
end $;
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
declare s jsonb;sid uuid;
begin
 s:=public.love_eclat_v2_status();sid:=(s->>'session_id')::uuid;
 s:=public.love_eclat_v2_act(sid,(s->>'chapter_index')::int,'continue');
 if s->>'state'<>'finished' or s->>'wish_invitation_card'<>'7' or
    s->>'wish_scene5' is not null or s->>'wish_scene6' is not null then
  raise exception 'Finished invitation retained rejected choices';end if;
 s:=public.love_eclat_v2_start(9,30,'one');sid:=(s->>'session_id')::uuid;
 begin
  perform public.love_eclat_v2_cards_shared(sid,1,array[7]::smallint[]);
  raise exception 'One shared device impersonated two before oral approval';
 exception when raise_exception then
  if sqlerrm<>'Accord oral commun explicite requis' then raise;end if;
 end;
 perform public.love_eclat_v2_cards_shared(sid,1,array[7]::smallint[],true);
 perform public.love_eclat_v2_act(sid,1,'continue');
 perform public.love_eclat_v2_card_vote(sid,2,7,true);
 s:=public.love_eclat_v2_act(sid,2,'continue');
 if s->>'chapter_number'<>'6' then raise exception 'Shared device missing scene 6';end if;
 begin
  perform public.love_eclat_v2_wish_vote(sid,3,'without-contact');
  raise exception 'One-phone vote silently impersonated B';
 exception when raise_exception then
  if sqlerrm<>'Accord oral commun explicite requis' then raise;end if;
 end;
 begin
  perform public.love_eclat_v2_wish_contact_answer(sid,3,true);
  raise exception 'Contact granted without oral agreement';
 exception when raise_exception then
  if sqlerrm<>'Accord oral commun explicite requis' then raise;end if;
 end;
 s:=public.love_eclat_v2_wish_vote(sid,3,'without-contact',true);
 if s->>'wish_scene6'<>'without-contact' then raise exception 'Shared alternative missing';end if;
 s:=public.love_eclat_v2_act(sid,3,'continue');
 if s->>'chapter_number'<>'8' then raise exception 'Shared finale not reached';end if;
 s:=public.love_eclat_v2_wish_vote(sid,4,'keep',true);
 if s->>'wish_invitation_card'<>'7' then raise exception 'Shared oral invitation not recorded';end if;
 begin
  perform public.love_eclat_v2_wish_phrase(sid,4,'Mot commun');
  raise exception 'Shared phrase saved without oral approval';
 exception when raise_exception then
  if sqlerrm<>'Accord oral commun explicite requis' then raise;end if;
 end;
 s:=public.love_eclat_v2_wish_phrase(sid,4,'Mot commun',true);
 if s->>'wish_invitation_text'<>'Mot commun' then
  raise exception 'Shared explicit phrase missing';end if;
 perform public.love_eclat_v2_act(sid,4,'stop');
end $$;
reset role;
do $$
begin
 if (select count(*) from public.love_eclat_v2_wish_phrase_votes)<>0 or
    (select count(*) from public.love_eclat_v2_wish_votes)<>0 or
    (select count(*) from public.love_eclat_v2_wish_contact)<>0 then
  raise exception 'Old refusal or temporary contact permission kept';end if;
end $$;
