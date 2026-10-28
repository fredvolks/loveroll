-- LR-028: one discreet, consent-based "play tonight?" invitation per couple/day.
-- Apply only after review on LoveRoll staging. No D6/session writes from invitation RPCs.
begin;

create table if not exists public.love_evening_invitations (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 local_day date not null,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending'
  check (status in ('pending','yes','no','maybe','ignored')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '12 hours'),
 responded_at timestamptz,
 constraint love_evening_invitation_not_self check(sender_id<>recipient_id),
 constraint love_evening_invitation_one_per_day unique(couple_id,local_day)
);
create index if not exists love_evening_invitation_recipient
 on public.love_evening_invitations(recipient_id,created_at desc);

alter table public.love_evening_invitations enable row level security;
drop policy if exists love_evening_invitation_members_read on public.love_evening_invitations;
create policy love_evening_invitation_members_read on public.love_evening_invitations
 for select to authenticated using (
  (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()))
  and couple_private.is_member(couple_id)
 );
revoke all on public.love_evening_invitations from public,anon,authenticated;
grant select on public.love_evening_invitations to authenticated;

-- Same-week availability as ensure_couple_session; target must still
-- be eligible to roll personally. This NEVER creates/rolls a session.
create or replace function public.love_evening_invite_available(
 p_couple uuid,p_recipient uuid
) returns boolean language plpgsql stable security definer set search_path=''
as $function$
declare
 today_qc date:=(now() at time zone 'America/Toronto')::date;
 monday_qc date; weekly_face int; weekly_created timestamptz;
 last_reset timestamptz; used_count int; active_session uuid;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple)
  or (select count(*) from public.couple_members where couple_id=p_couple)<>2
  or not exists(select 1 from public.couple_members
   where couple_id=p_couple and user_id=p_recipient) then return false; end if;
 -- Mirror the real ensure_couple_session() gate: invitations must not
 -- encourage a new evening during the required 200-challenge questionnaire.
 if exists(select 1 from public.couples
  where id=p_couple and challenge_cycle_pending=true) then return false; end if;
 monday_qc:=today_qc-(extract(isodow from today_qc)::int-1);
 select face,created_at into weekly_face,weekly_created
 from public.couple_rolls where couple_id=p_couple and kind='weekly'
  and key=to_char(monday_qc,'YYYY-MM-DD')
 order by created_at desc limit 1;
 if weekly_face is null or weekly_face<1 then return false; end if;
 select id into active_session from public.couple_sessions
 where couple_id=p_couple and finished_at is null
  and started_at>=weekly_created order by started_at desc limit 1;
 if active_session is not null then
  return not exists(select 1 from public.couple_personal_rolls
   where session_id=active_session and user_id=p_recipient);
 end if;
 -- This closed-day and quota check does not alter server rules.
 select max(reset_at) into last_reset from public.love_all_dice_reset_audit
 where couple_id=p_couple and week_key=to_char(monday_qc,'YYYY-MM-DD');
 select count(*) into used_count from public.couple_sessions
 where couple_id=p_couple and counted=true
  and (started_at at time zone 'America/Toronto')::date>=monday_qc
  and (last_reset is null or started_at>=last_reset);
 if used_count>=weekly_face then return false; end if;
 if exists(select 1 from public.couple_sessions where couple_id=p_couple
   and started_at>=weekly_created and (
    (started_at at time zone 'America/Toronto')::date=today_qc or
    (finished_at is not null and
     (finished_at at time zone 'America/Toronto')::date=today_qc)
   )) then return false; end if;
 return true;
end;
$function$;
revoke all on function public.love_evening_invite_available(uuid,uuid)
 from public,anon,authenticated;

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
revoke all on function public.love_evening_invite_send(uuid) from public,anon;
grant execute on function public.love_evening_invite_send(uuid) to authenticated;

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
  or not couple_private.is_member(row_inv.couple_id) then
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
revoke all on function public.love_evening_invite_respond(uuid,text) from public,anon;
grant execute on function public.love_evening_invite_respond(uuid,text) to authenticated;

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
 if me not in (inv.sender_id,inv.recipient_id) then
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
revoke all on function public.love_evening_invite_status(uuid) from public,anon;
grant execute on function public.love_evening_invite_status(uuid) to authenticated;

-- Realtime is only a fast path; the client also refreshes from secured RPC.
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  begin
   alter publication supabase_realtime add table public.love_evening_invitations;
  exception when duplicate_object then null;
  end;
 end if;
end$$;
commit;
