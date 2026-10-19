-- LoveRoll: invitation status and relationship date, safe additive upgrade.
alter table public.couple_invitations
 add column if not exists sent_at timestamptz,
 add column if not exists sent_via text,
 add column if not exists cancelled_at timestamptz;
alter table public.couple_occasion_settings
 add column if not exists relationship_started_on date;

create or replace function public.mark_pair_invite_sent(p_invitation uuid,p_method text default 'partage')
 returns void language plpgsql security definer set search_path to ''
as $$
declare c uuid;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_method not in ('partage','sms','courriel','messenger') then raise exception 'Méthode invalide';end if;
 select i.couple_id into c from public.couple_invitations i
 where i.id=p_invitation and i.created_by=auth.uid()
  and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now()
 for update;
 if c is null or not couple_private.is_member(c) then raise exception 'Invitation inaccessible';end if;
 update public.couple_invitations set sent_at=now(),sent_via=p_method where id=p_invitation;
end;$$;

create or replace function public.cancel_pair_invite(p_invitation uuid)
 returns void language plpgsql security definer set search_path to ''
as $$
declare c uuid;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select i.couple_id into c from public.couple_invitations i
 where i.id=p_invitation and i.created_by=auth.uid() and i.accepted_at is null
 for update;
 if c is null or not couple_private.is_member(c) then raise exception 'Invitation inaccessible';end if;
 update public.couple_invitations set cancelled_at=now(),expires_at=now() where id=p_invitation;
end;$$;

create or replace function public.set_love_relationship_date(p_couple uuid,p_date date)
 returns void language plpgsql security definer set search_path to ''
as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.couples where id=p_couple and owner_user_id=auth.uid()
 ) or not couple_private.is_member(p_couple) then
  raise exception 'Réglage réservé au créateur du couple';
 end if;
 if p_date is not null and (p_date>current_date or p_date<date '1900-01-01') then
  raise exception 'Date du couple invalide';end if;
 insert into public.couple_occasion_settings(couple_id,relationship_started_on)
 values(p_couple,p_date)
 on conflict(couple_id) do update set relationship_started_on=excluded.relationship_started_on,updated_at=now();
end;$$;

-- New invitation supersedes older pending URLs, which can no longer be accepted.
create or replace function public.create_pair_invite(p_couple uuid,p_email text,p_token_hash text)
 returns uuid language plpgsql security definer set search_path to ''
as $$
declare n integer; inv uuid;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 perform 1 from public.couples where id=p_couple for update;
 select count(*) into n from public.couple_members where couple_id=p_couple;
 if n>=2 then raise exception 'Couple déjà complet';end if;
 if trim(p_email) !~* '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Courriel invalide';end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Token invalide';end if;
 if lower(trim(p_email))=(select lower(email) from auth.users where id=auth.uid()) then
  raise exception 'Invitez votre partenaire, pas votre propre compte';end if;
 update public.couple_invitations set cancelled_at=now(),expires_at=now()
 where couple_id=p_couple and accepted_at is null and cancelled_at is null;
 insert into public.couple_invitations(couple_id,invited_email,token_hash,created_by)
 values(p_couple,lower(trim(p_email)),p_token_hash,auth.uid()) returning id into inv;
 return inv;
end;$$;

revoke all on function public.mark_pair_invite_sent(uuid,text) from public,anon;
revoke all on function public.cancel_pair_invite(uuid) from public,anon;
revoke all on function public.set_love_relationship_date(uuid,date) from public,anon;
grant execute on function public.mark_pair_invite_sent(uuid,text) to authenticated;
grant execute on function public.cancel_pair_invite(uuid) to authenticated;
grant execute on function public.set_love_relationship_date(uuid,date) to authenticated;
