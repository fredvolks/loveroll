-- Execute real RPCs against minimal fixtures with three distinct JWT identities.
do $$
declare
 couple uuid:='dddddddd-dddd-4ddd-dddd-dddddddddddd';
 a uuid:='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 c uuid:='cccccccc-cccc-4ccc-cccc-cccccccccccc';
 invitation uuid; again jsonb; status_a jsonb; status_b jsonb;
 session_id uuid;
begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 status_a:=public.love_evening_invite_status(couple);
 if status_a->>'state'<>'none' or status_a->>'available'<>'true' then
  raise exception 'A is eligible to invite: %',status_a;end if;
 invitation:=(public.love_evening_invite_send(couple)->>'id')::uuid;
 if invitation is null then raise exception 'No invitation was created';end if;
 if (select count(*) from public.couple_sessions)<>0 or
    (select count(*) from public.couple_personal_rolls)<>0 then
  raise exception 'Invite illegally created a session or drew a D6'; end if;
 again:=public.love_evening_invite_send(couple);
 if (again->>'id')::uuid<>invitation or again->>'created'<>'false' then
  raise exception 'Repeated tap must not create another invite: %',again; end if;
 if (select count(*) from public.love_evening_invitations)<>1 or
    (select count(*) from public.love_push_outbox)<>1 then
  raise exception 'Exactly one invitation and opt-in Push must exist';end if;
 status_a:=public.love_evening_invite_status(couple);
 if status_a->>'direction'<>'sent' or status_a->>'state'<>'pending' then
  raise exception 'Sender status incorrect: %',status_a;end if;

 perform set_config('request.jwt.claim.sub',b::text,true);
 status_b:=public.love_evening_invite_status(couple);
 if status_b->>'direction'<>'received' or status_b->>'state'<>'pending' then
  raise exception 'Private recipient inbox missing: %',status_b;end if;
 if (public.love_evening_invite_respond(invitation,'maybe')->>'status')<>'maybe' then
  raise exception 'Maybe was not saved';end if;
 if (public.love_evening_invite_status(couple)->>'state')<>'maybe' then
  raise exception 'Maybe must remain visible';end if;
 if (public.love_evening_invite_respond(invitation,'yes')->>'status')<>'yes' then
  raise exception 'Maybe to Yes must work';end if;
 if (select count(*) from public.couple_sessions)<>0 or
    (select count(*) from public.couple_personal_rolls)<>0 then
  raise exception 'Yes may not start D6 or silently create a session';end if;
 if (public.love_evening_invite_respond(invitation,'no')->>'status')<>'yes' then
  raise exception 'Final response must be idempotent';end if;
 if (select count(*) from public.love_push_outbox)<>3 then
  raise exception 'Only unique opt-in reply notifications should be queued';end if;

 -- The OTHER player can have rolled already: the invited B is still eligible.
 insert into public.couple_sessions(couple_id) values(couple) returning id into session_id;
 insert into public.couple_personal_rolls(session_id,user_id,face) values(session_id,a,4);
 if (public.love_evening_invite_status(couple)->>'state')<>'yes' then
  raise exception 'Invitation should survive only A having rolled';end if;
 insert into public.couple_personal_rolls(session_id,user_id,face) values(session_id,b,2);
 if (public.love_evening_invite_status(couple)->>'state')<>'obsolete' then
  raise exception 'After both D6 invitation must disappear';end if;

 -- Unauthorized third person must neither read nor send nor answer.
 perform set_config('request.jwt.claim.sub',c::text,true);
 begin
  perform public.love_evening_invite_status(couple);
  raise exception 'SECURITY FAILURE: outsider read succeeded';
 exception when sqlstate '42501' then null;
 end;
 begin
  perform public.love_evening_invite_send(couple);
  raise exception 'SECURITY FAILURE: outsider send succeeded';
 exception when sqlstate '42501' then null;
 end;
 begin
  perform public.love_evening_invite_respond(invitation,'no');
  raise exception 'SECURITY FAILURE: outsider answered';
 exception when sqlstate '42501' then null;
 end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin
  perform public.love_evening_invite_respond(invitation,'banana');
  raise exception 'SECURITY FAILURE: invalid answer accepted';
 exception when raise_exception then
  if sqlerrm='SECURITY FAILURE: invalid answer accepted' then raise;end if;
 end;
end$$;
select 'LR-028: all isolated SQL A/B tests passed' as result;
