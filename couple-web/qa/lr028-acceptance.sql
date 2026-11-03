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
 update public.couples set challenge_cycle_pending=true where id=couple;
 if (public.love_evening_invite_status(couple)->>'available')<>'false' then
  raise exception 'Pending mandatory 200-card questionnaire must block invitation'; end if;
 update public.couples set challenge_cycle_pending=false where id=couple;
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

 -- Explicit NULL responses must be rejected just like unsupported strings.
 begin
  perform public.love_evening_invite_respond(invitation,null);
  raise exception 'SECURITY FAILURE: NULL response accepted';
 exception when raise_exception then
  if sqlerrm='SECURITY FAILURE: NULL response accepted' then raise;end if;
 end;

 -- Changing a couple's membership must invalidate the former invitation
 -- for both the replaced member AND the old member still in the couple.
 delete from public.couple_members where couple_id=couple and user_id=b;
 insert into public.couple_members(couple_id,user_id) values(couple,c);
 perform set_config('request.jwt.claim.sub',a::text,true);
 status_a:=public.love_evening_invite_status(couple);
 if status_a->>'state'<>'none' or status_a->>'available'<>'false'
    or status_a ? 'recipient_id' or status_a ? 'id' then
  raise exception 'Old sender must never see removed partner or stale invitation: %',status_a;end if;
 begin
  perform public.love_evening_invite_send(couple);
  raise exception 'SECURITY FAILURE: old sender reused removed partner invitation';
 exception when raise_exception then
  if sqlerrm='SECURITY FAILURE: old sender reused removed partner invitation' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',c::text,true);
 status_b:=public.love_evening_invite_status(couple);
 if status_b->>'state'<>'none' or status_b->>'available'<>'false' then
  raise exception 'New member must not read former invitation: %',status_b;end if;
 begin
  perform public.love_evening_invite_send(couple);
  raise exception 'SECURITY FAILURE: new member acquired old invitation';
 exception when raise_exception then
  if sqlerrm='SECURITY FAILURE: new member acquired old invitation' then raise;end if;
 end;

 -- Entirely new technical couple: B has disabled Push, but can still
 -- receive and decline in app with no penalty/session creation.
 insert into public.couples(id) values('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee');
 insert into public.couple_members(couple_id,user_id) values
  ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',a),
  ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',b);
 insert into public.couple_rolls(couple_id,kind,key,face)
  select 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',kind,key,2
   from public.couple_rolls where couple_id=couple and kind='weekly';
 update public.love_push_preferences set enabled=false where user_id=b;
 perform set_config('request.jwt.claim.sub',a::text,true);
 again:=public.love_evening_invite_send('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee');
 if (select count(*) from public.love_push_outbox where
  event_key='evening-invite:'||(again->>'id'))<>0 then
  raise exception 'Disabled Push must not enqueue a notification';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if (public.love_evening_invite_status('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee')->>'direction')<>'received' then
  raise exception 'Disabled Push must not hide the in-app invitation';end if;
 if (public.love_evening_invite_respond((again->>'id')::uuid,'no')->>'status')<>'no' then
  raise exception 'No must be stored';end if;
 if (select count(*) from public.couple_sessions where
  couple_id='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee')<>0 then
  raise exception 'No must not start a session';end if;
 update public.love_evening_invitations set expires_at=now()-interval '1 second'
  where id=(again->>'id')::uuid;
 if (public.love_evening_invite_status('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee')->>'state')<>'expired' then
  raise exception 'Expired invitation must not appear actionable';end if;
 begin
  perform public.love_evening_invite_respond((again->>'id')::uuid,'yes');
  raise exception 'SECURITY FAILURE: accepted expired invite';
 exception when raise_exception then
  if sqlerrm='SECURITY FAILURE: accepted expired invite' then raise;end if;
 end;
 -- The reverse swap (original sender removed) must also revoke the ability
 -- to answer, even if the recipient B remains a verified couple member.
 delete from public.couple_members
  where couple_id='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee' and user_id=a;
 insert into public.couple_members(couple_id,user_id) values
  ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',c);
 perform set_config('request.jwt.claim.sub',b::text,true);
 status_b:=public.love_evening_invite_status('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee');
 if status_b->>'state'<>'none' or status_b ? 'id' then
  raise exception 'Remaining recipient must not see removed sender: %',status_b;end if;
 begin
  perform public.love_evening_invite_respond((again->>'id')::uuid,'no');
  raise exception 'SECURITY FAILURE: recipient answered after sender was replaced';
 exception when sqlstate '42501' then null;
 end;
end$$;

-- LR-028 RLS role-level regression: execute SELECT as authenticated, not as
-- the postgres fixture owner that bypasses RLS.  This uses synthetic users,
-- a synthetic couple and test-only grants; it never touches real Supabase.
insert into public.couples(id) values('ffffffff-ffff-4fff-bfff-ffffffffffff');
insert into public.couple_members(couple_id,user_id) values
 ('ffffffff-ffff-4fff-bfff-ffffffffffff','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('ffffffff-ffff-4fff-bfff-ffffffffffff','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
insert into public.love_evening_invitations(
 couple_id,local_day,sender_id,recipient_id
) values (
 'ffffffff-ffff-4fff-bfff-ffffffffffff',
 (now() at time zone 'America/Toronto')::date,
 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
);
-- Minimal permissions for this isolated fixture's SECURITY INVOKER
-- couple_private.is_member() mock; these are NOT production grants.
grant usage on schema auth,couple_private to authenticated;
grant select on public.couple_members to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub',
 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
do $rls$
begin
 if (select count(*) from public.love_evening_invitations
     where couple_id='ffffffff-ffff-4fff-bfff-ffffffffffff')<>1 then
  raise exception 'RLS: original sender should see active invitation';
 end if;
end $rls$;
select set_config('request.jwt.claim.sub',
 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',false);
do $rls$
begin
 if (select count(*) from public.love_evening_invitations
     where couple_id='ffffffff-ffff-4fff-bfff-ffffffffffff')<>1 then
  raise exception 'RLS: original recipient should see active invitation';
 end if;
end $rls$;
reset role;

-- Replace B by C inside the same couple and the same Toronto calendar day.
delete from public.couple_members
 where couple_id='ffffffff-ffff-4fff-bfff-ffffffffffff'
   and user_id='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
insert into public.couple_members(couple_id,user_id) values
 ('ffffffff-ffff-4fff-bfff-ffffffffffff',
  'cccccccc-cccc-4ccc-cccc-cccccccccccc');

set role authenticated;
select set_config('request.jwt.claim.sub',
 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
do $rls$
begin
 if exists(select 1 from public.love_evening_invitations
     where couple_id='ffffffff-ffff-4fff-bfff-ffffffffffff') then
  raise exception 'RLS: remaining sender saw the former recipient';
 end if;
end $rls$;
select set_config('request.jwt.claim.sub',
 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',false);
do $rls$
begin
 if exists(select 1 from public.love_evening_invitations
     where couple_id='ffffffff-ffff-4fff-bfff-ffffffffffff') then
  raise exception 'RLS: removed recipient saw former invitation';
 end if;
end $rls$;
select set_config('request.jwt.claim.sub',
 'cccccccc-cccc-4ccc-cccc-cccccccccccc',false);
do $rls$
begin
 if exists(select 1 from public.love_evening_invitations
     where couple_id='ffffffff-ffff-4fff-bfff-ffffffffffff') then
  raise exception 'RLS: replacement partner saw former invitation';
 end if;
end $rls$;
reset role;

-- Regression: replacing the ORIGINAL SENDER while the invitation is still
-- pending must revoke the remaining recipient's read and reply rights.
-- Earlier tests only covered the sender swap after a No/expiration.
do $pending_sender_swap$
declare
  fresh_couple uuid := '99999999-9999-4999-8999-999999999999';
  a uuid := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  b uuid := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  c uuid := 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  invitation_id uuid;
  result jsonb;
begin
  insert into public.couples(id) values(fresh_couple);
  insert into public.couple_members(couple_id,user_id)
    values (fresh_couple,a),(fresh_couple,b);
  insert into public.couple_rolls(couple_id,kind,key,face)
    select fresh_couple,kind,key,face
      from public.couple_rolls
      where couple_id='dddddddd-dddd-4ddd-dddd-dddddddddddd'
        and kind='weekly';

  perform set_config('request.jwt.claim.sub',a::text,true);
  result:=public.love_evening_invite_send(fresh_couple);
  invitation_id:=(result->>'id')::uuid;
  if invitation_id is null or result->>'status'<>'pending' then
    raise exception 'Fixture: invitation must be pending: %',result;
  end if;

  perform set_config('request.jwt.claim.sub',b::text,true);
  if public.love_evening_invite_status(fresh_couple)->>'state'<>'pending' then
    raise exception 'Fixture: recipient must see pending invite before swap';
  end if;

  delete from public.couple_members
    where couple_id=fresh_couple and user_id=a;
  insert into public.couple_members(couple_id,user_id)
    values(fresh_couple,c);

  result:=public.love_evening_invite_status(fresh_couple);
  if result->>'state'<>'none' or result ? 'id'
      or result ? 'sender_id' or result ? 'recipient_id' then
    raise exception 'Remaining recipient saw removed sender: %',result;
  end if;
  begin
    perform public.love_evening_invite_respond(invitation_id,'yes');
    raise exception 'SECURITY FAILURE: replied to pending invite after sender swap';
  exception when sqlstate '42501' then null;
  end;

  perform set_config('request.jwt.claim.sub',c::text,true);
  result:=public.love_evening_invite_status(fresh_couple);
  if result->>'state'<>'none' or result ? 'id' then
    raise exception 'Replacement sender inherited stale invite: %',result;
  end if;
  begin
    perform public.love_evening_invite_respond(invitation_id,'yes');
    raise exception 'SECURITY FAILURE: new member answered old invite';
  exception when sqlstate '42501' then null;
  end;
end
$pending_sender_swap$;

-- Negative SELECT tests must prove revocation, not accidental row removal.
-- Confirm the original A->B invitation survives the sender membership swap.
-- Execute this as the fixture owner before switching to authenticated roles.
do $pending_sender_fixture_guard$
begin
 if (select count(*) from public.love_evening_invitations
     where couple_id='99999999-9999-4999-8999-999999999999'
       and sender_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
       and recipient_id='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
       and status='pending'
       and expires_at>now())<>1 then
  raise exception 'Fixture: original pending A-to-B invitation must still exist after sender replacement';
 end if;
end
$pending_sender_fixture_guard$;

-- Pending sender replacement: test the actual authenticated SELECT policy,
-- not only SECURITY DEFINER RPCs. The still-present recipient B must lose
-- read access as soon as original sender A is replaced by C.
-- The fixture above leaves couple 9999... with an unexpired pending invite.
set role authenticated;
select set_config('request.jwt.claim.sub',
 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',false);
do $pending_sender_rls$
begin
 if exists(select 1 from public.love_evening_invitations
    where couple_id='99999999-9999-4999-8999-999999999999') then
  raise exception 'RLS: remaining recipient read a replaced sender invitation';
 end if;
end
$pending_sender_rls$;

-- The replacement C must not inherit a prior sender's private invite.
select set_config('request.jwt.claim.sub',
 'cccccccc-cccc-4ccc-cccc-cccccccccccc',false);
do $new_sender_rls$
begin
 if exists(select 1 from public.love_evening_invitations
    where couple_id='99999999-9999-4999-8999-999999999999') then
  raise exception 'RLS: new partner inherited an earlier invitation';
 end if;
end
$new_sender_rls$;

-- The removed sender A must also lose direct table SELECT access.
select set_config('request.jwt.claim.sub',
 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
do $removed_sender_rls$
begin
 if exists(select 1 from public.love_evening_invitations
    where couple_id='99999999-9999-4999-8999-999999999999') then
  raise exception 'RLS: removed sender still sees an old invitation';
 end if;
end
$removed_sender_rls$;
reset role;

select 'LR-028: all isolated SQL A/B tests passed' as result;
