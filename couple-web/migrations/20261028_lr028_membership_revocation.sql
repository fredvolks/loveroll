-- LR-028 follow-up: revoked couple partners cannot see/respond to stale invites.
-- Review on an isolated LoveRoll staging clone before applying to production.
-- Preserves the original one-invitation/day, existing statuses and all D6 rules.
begin;
drop policy if exists love_evening_invitation_members_read on public.love_evening_invitations;
create policy love_evening_invitation_members_read on public.love_evening_invitations
 for select to authenticated using (
  (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()))
  and couple_private.is_member(couple_id)
  and exists(select 1 from public.couple_members
   where couple_id=love_evening_invitations.couple_id
    and user_id=love_evening_invitations.sender_id)
  and exists(select 1 from public.couple_members
   where couple_id=love_evening_invitations.couple_id
    and user_id=love_evening_invitations.recipient_id)
  and (select count(*) from public.couple_members
   where couple_id=love_evening_invitations.couple_id)=2
 );

create or replace function public.love_evening_invite_send(p_couple uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 sender uuid:=auth.uid(); recipient uuid;
 today_qc date:=(now() at time zone 'America/Toronto')::date;
 row_inv public.love_evening_invitations%rowtype;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then
  raise exception 'Couple inaccessible' using errcode='42501'; end if;
 -- Serialize both users, all double-taps, and other couple-scoped actions.
 perform 1 from public.couples where id=p_couple for update;
 select user_id into recipient from public.couple_members
  where couple_id=p_couple and user_id<>sender;
 if recipient is null or
  (select count(*) from public.couple_members where couple_id=p_couple)<>2 then
  raise exception 'Deux partenaires associés sont nécessaires'; end if;
 -- Never re-notify an invitation, even when the previous answer is Non.
 select * into row_inv from public.love_evening_invitations
  where couple_id=p_couple and local_day=today_qc;
 if found then
  -- The exact original A/B duo must still be active. A former member's
  -- invitation must not be silently reused for a newly paired person.
  if not exists(select 1 from public.couple_members
       where couple_id=p_couple and user_id=row_inv.sender_id)
     or not exists(select 1 from public.couple_members
       where couple_id=p_couple and user_id=row_inv.recipient_id) then
   raise exception 'Une invitation antérieure existe pour ce jour';
  end if;
  -- A member replaced during the same day must never obtain the former
  -- couple's private invitation ID or response by invoking this RPC.
  if sender not in (row_inv.sender_id,row_inv.recipient_id) then
   raise exception 'Une invitation antérieure existe pour ce jour';
  end if;
  return jsonb_build_object('id',row_inv.id,'status',row_inv.status,
   'created',false);
 end if;
 if not public.love_evening_invite_available(p_couple,recipient) then
  raise exception 'Le D6 du partenaire n’est pas disponible ce soir'; end if;
 insert into public.love_evening_invitations(
  couple_id,local_day,sender_id,recipient_id)
 values(p_couple,today_qc,sender,recipient)
 returning * into row_inv;
 -- Existing dispatch service checks opt-in; delivery is best-effort.
 insert into public.love_push_outbox(user_id,event_key,kind,title,body)
 select recipient,'evening-invite:'||row_inv.id,'invitation',
  'LoveRoll ♥','♥ Une invitation LoveRoll t''attend'
 from public.love_push_preferences p
 where p.user_id=recipient and p.enabled and p.invitation
 on conflict(user_id,event_key) do nothing;
 return jsonb_build_object('id',row_inv.id,'status','pending','created',true);
end;
$function$;

create or replace function public.love_evening_invite_respond(
 p_invitation uuid,p_answer text
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare row_inv public.love_evening_invitations%rowtype;
begin
 perform public.love_require_verified_identity();
 if p_answer is null or p_answer not in ('yes','no','maybe','ignored') then
  raise exception 'Réponse invalide'; end if;
 select * into row_inv from public.love_evening_invitations
 where id=p_invitation for update;
 if not found or row_inv.recipient_id<>auth.uid()
  or not couple_private.is_member(row_inv.couple_id)
  or not exists(select 1 from public.couple_members
     where couple_id=row_inv.couple_id and user_id=row_inv.sender_id)
  or (select count(*) from public.couple_members
     where couple_id=row_inv.couple_id)<>2 then
  raise exception 'Invitation inaccessible' using errcode='42501'; end if;
 if row_inv.local_day<>(now() at time zone 'America/Toronto')::date
  or row_inv.expires_at<=now() then
  raise exception 'Cette invitation est expirée'; end if;
 if row_inv.status not in ('pending','maybe') then
  return jsonb_build_object('id',row_inv.id,'status',row_inv.status,'updated',false);
 end if;
 if p_answer='yes' and not
   public.love_evening_invite_available(row_inv.couple_id,auth.uid()) then
  raise exception 'Le D6 n’est plus disponible pour cette soirée'; end if;
 if p_answer<>row_inv.status then
  update public.love_evening_invitations
   set status=p_answer,responded_at=now() where id=p_invitation;
  if p_answer<>'ignored' then
   insert into public.love_push_outbox(user_id,event_key,kind,title,body)
   select row_inv.sender_id,'evening-reply:'||row_inv.id||':'||p_answer,
    'invitation','LoveRoll ♥','Votre invitation LoveRoll a une réponse.'
   from public.love_push_preferences p
   where p.user_id=row_inv.sender_id and p.enabled and p.invitation
   on conflict(user_id,event_key) do nothing;
  end if;
 end if;
 return jsonb_build_object('id',row_inv.id,'status',p_answer,'updated',true);
end;
$function$;

create or replace function public.love_evening_invite_status(p_couple uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare me uuid:=auth.uid(); partner uuid; inv public.love_evening_invitations%rowtype;
 today_qc date:=(now() at time zone 'America/Toronto')::date;
 state_now text; available boolean;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then
  raise exception 'Couple inaccessible' using errcode='42501'; end if;
 select user_id into partner from public.couple_members
  where couple_id=p_couple and user_id<>me;
 if partner is null or
  (select count(*) from public.couple_members where couple_id=p_couple)<>2 then
  return jsonb_build_object('available',false,'state','unpaired'); end if;
 select * into inv from public.love_evening_invitations
  where couple_id=p_couple and local_day=today_qc;
 if not found then
  available:=public.love_evening_invite_available(p_couple,partner);
  return jsonb_build_object('available',available,'state','none');
 end if;
 -- SECURITY DEFINER bypasses RLS: verify this user's exact ownership.
 if me not in (inv.sender_id,inv.recipient_id)
  or not exists(select 1 from public.couple_members
     where couple_id=p_couple and user_id=inv.sender_id)
  or not exists(select 1 from public.couple_members
     where couple_id=p_couple and user_id=inv.recipient_id) then
  return jsonb_build_object('available',false,'state','none');
 end if;
 state_now:=inv.status;
 if inv.expires_at<=now() then state_now:='expired';
 elsif not public.love_evening_invite_available(p_couple,inv.recipient_id)
 then state_now:='obsolete';
 end if;
 return jsonb_build_object('available',false,'state',state_now,
  'id',inv.id,'direction',case when inv.sender_id=me then 'sent' else 'received' end,
  'sender_id',inv.sender_id,'recipient_id',inv.recipient_id,
  'expires_at',inv.expires_at);
end;
$function$;

-- Keep RPC permissions explicit; SECURITY DEFINER must not expose anon reads.
revoke all on function public.love_evening_invite_send(uuid) from public,anon;
grant execute on function public.love_evening_invite_send(uuid) to authenticated;
revoke all on function public.love_evening_invite_respond(uuid,text) from public,anon;
grant execute on function public.love_evening_invite_respond(uuid,text) to authenticated;
revoke all on function public.love_evening_invite_status(uuid) from public,anon;
grant execute on function public.love_evening_invite_status(uuid) to authenticated;
commit;
