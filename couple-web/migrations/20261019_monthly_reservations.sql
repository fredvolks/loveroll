-- LoveRoll Surprise: only the person selected by the monthly D6 can organise,
-- mark booked/paid and change the date. Both partners can VIEW and get opt-in
-- reminders, 24h before, through the existing 15-minute push dispatcher.
-- No external payment or booking is performed inside LoveRoll.
create table if not exists public.love_monthly_reservations (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 roll_id uuid unique references public.couple_rolls(id) on delete set null,
 roll_key text not null,
 roll_face integer not null check (roll_face between 1 and 100),
 host_user_id uuid not null references auth.users(id),
 venue_name text not null check (char_length(venue_name) between 2 and 140),
 venue_address text not null default '',
 booking_url text,
 menu_url text,
 photo_url text,
 reserved_for timestamptz not null,
 status text not null default 'planned' check(status in ('planned','confirmed','cancelled')),
 paid_by_host boolean not null default false,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (char_length(venue_address)<=240 and char_length(notes)<=500),
 check (booking_url is null or booking_url ~* '^https://[^[:space:]]{3,512}$'),
 check (menu_url is null or menu_url ~* '^https://[^[:space:]]{3,512}$'),
 check (photo_url is null or photo_url ~* '^https://[^[:space:]]{3,512}$'),
 check (status='confirmed' or paid_by_host=false)
);
create index if not exists love_reservations_upcoming on public.love_monthly_reservations(couple_id,reserved_for) where status <> 'cancelled';
alter table public.love_monthly_reservations enable row level security;
drop policy if exists love_reservations_read_members on public.love_monthly_reservations;
create policy love_reservations_read_members on public.love_monthly_reservations
 for select to authenticated
 using (public.love_verified_identity() and couple_private.is_member(couple_id));
revoke all on public.love_monthly_reservations from anon,authenticated;
grant select on public.love_monthly_reservations to authenticated;
-- All writes go through this RPC; no direct client UPDATE/INSERT/DELETE permissions.
create or replace function public.save_love_monthly_reservation(
 p_roll uuid,
 p_when timestamptz,
 p_venue text,
 p_address text default '',
 p_booking_url text default null,
 p_menu_url text default null,
 p_photo_url text default null,
 p_notes text default '',
 p_confirmed boolean default false,
 p_paid boolean default false
) returns public.love_monthly_reservations
language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_roll public.couple_rolls%rowtype;
 v_hostroll public.couple_rolls%rowtype;
 v_host uuid;
 v_res public.love_monthly_reservations%rowtype;
 v_status text;
 v_url text;
begin
 perform public.love_require_verified_identity();
 select * into v_roll from public.couple_rolls where id=p_roll and kind='monthly_activity';
 if not found or not couple_private.is_member(v_roll.couple_id) then
  raise exception 'Activité du mois introuvable ou inaccessible' using errcode='42501';
 end if;
 select * into v_hostroll from public.couple_rolls
  where couple_id=v_roll.couple_id and kind='monthly_host' and key=v_roll.key;
 if not found then raise exception 'Brassez d’abord le D6 pour désigner qui invite';end if;
 if (select count(*) from public.couple_members where couple_id=v_roll.couple_id)<>2 then
  raise exception 'Le duo doit comprendre deux partenaires';end if;
 select member.user_id into v_host from public.couple_members member
  where member.couple_id=v_roll.couple_id
  order by member.joined_at,member.user_id
  limit 1 offset (case when mod(v_hostroll.face,2)=0 then 0 else 1 end);
 if v_actor is distinct from v_host then
  raise exception 'Seule la personne désignée pour inviter peut réserver ou payer' using errcode='42501';
 end if;
 if p_when is null or p_when <= now() or p_when>now()+interval '2 years' then
  raise exception 'Choisissez une date future (moins de deux ans)' using errcode='22023';
 end if;
 if char_length(trim(coalesce(p_venue,''))) not between 2 and 140 or
  char_length(coalesce(p_address,''))>240 or char_length(coalesce(p_notes,''))>500 then
  raise exception 'Détails de réservation invalides' using errcode='22023';
 end if;
 if coalesce(p_paid,false) and not coalesce(p_confirmed,false) then
  raise exception 'Ne marquez pas payé avant de confirmer la réservation' using errcode='22023';
 end if;
 foreach v_url in array array[p_booking_url,p_menu_url,p_photo_url] loop
  if nullif(trim(coalesce(v_url,'')),'') is not null and
    (length(v_url)>520 or v_url !~* '^https://[^[:space:]]{3,512}$') then
   raise exception 'Les liens doivent être des URL HTTPS valides' using errcode='22023';
  end if;
 end loop;
 v_status:=case when coalesce(p_confirmed,false) then 'confirmed' else 'planned' end;
 insert into public.love_monthly_reservations
 (couple_id,roll_id,roll_key,roll_face,host_user_id,venue_name,venue_address,
  booking_url,menu_url,photo_url,reserved_for,status,paid_by_host,notes)
 values (v_roll.couple_id,v_roll.id,v_roll.key,v_roll.face,v_host,trim(p_venue),
  coalesce(trim(p_address),''),
  nullif(trim(coalesce(p_booking_url,'')),''),
  nullif(trim(coalesce(p_menu_url,'')),''),
  nullif(trim(coalesce(p_photo_url,'')),''),
  p_when,v_status,coalesce(p_paid,false),coalesce(p_notes,''))
 on conflict (roll_id) do update set
  venue_name=excluded.venue_name,venue_address=excluded.venue_address,
  booking_url=excluded.booking_url,menu_url=excluded.menu_url,photo_url=excluded.photo_url,
  reserved_for=excluded.reserved_for,status=excluded.status,
  paid_by_host=excluded.paid_by_host,notes=excluded.notes,updated_at=now()
 returning * into v_res;
 -- Cancel pending reminders if the host changes the booking/date, or unconfirms it.
 delete from public.love_push_outbox
  where event_key like 'lovebooking:'||v_res.id::text||':%' and sent_at is null;
 if v_status='confirmed' then
  insert into public.love_push_outbox
   (user_id,event_key,kind,title,body,due_at)
  select m.user_id,
   'lovebooking:'||v_res.id::text||':'||to_char(p_when at time zone 'UTC','YYYYMMDDHH24MISS'),
   'monthly',
   'LoveRoll ♡ Votre sortie est demain',
   'Votre activité réservée approche. Retrouvez la date et les détails dans Surprise → Voir mon activité.',
   greatest(now(),p_when-interval '24 hours')
  from public.couple_members m where m.couple_id=v_roll.couple_id
  on conflict(user_id,event_key) do update
   set due_at=excluded.due_at
   where public.love_push_outbox.sent_at is null;
 end if;
 return v_res;
end;
$$;
revoke all on function public.save_love_monthly_reservation(uuid,timestamptz,text,text,text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.save_love_monthly_reservation(uuid,timestamptz,text,text,text,text,text,text,boolean,boolean) to authenticated;

create or replace function public.cancel_love_monthly_reservation(p_roll uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_res public.love_monthly_reservations%rowtype;
begin
 perform public.love_require_verified_identity();
 select * into v_res from public.love_monthly_reservations
  where roll_id=p_roll for update;
 if not found then raise exception 'Réservation introuvable';end if;
 if auth.uid() is distinct from v_res.host_user_id or
  not couple_private.is_member(v_res.couple_id) then
  raise exception 'Seule la personne qui invite peut annuler la réservation' using errcode='42501';
 end if;
 update public.love_monthly_reservations
  set status='cancelled',paid_by_host=false,updated_at=now() where id=v_res.id;
 delete from public.love_push_outbox
  where event_key like 'lovebooking:'||v_res.id::text||':%' and sent_at is null;
end;
$$;
revoke all on function public.cancel_love_monthly_reservation(uuid) from public,anon;
grant execute on function public.cancel_love_monthly_reservation(uuid) to authenticated;