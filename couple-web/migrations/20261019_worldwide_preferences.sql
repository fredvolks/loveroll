-- LoveRoll worldwide settings. Additive migration, preserves all current users/rolls.
-- Language/currency are individual; shared travel origin and radius may be updated
-- by either verified duo member. GPS is only stored at 0.01 degree precision.
alter table public.couple_profiles
  add column if not exists preferred_locale text not null default 'fr-CA',
  add column if not exists preferred_currency text not null default 'CAD';

alter table public.couples
  add column if not exists travel_origin_label text not null default '',
  add column if not exists travel_origin_lat numeric(5,2),
  add column if not exists travel_origin_lon numeric(5,2),
  add column if not exists travel_radius_km integer not null default 125,
  add column if not exists activity_localization_enabled boolean not null default false;

do $$
begin
 if not exists(select 1 from pg_constraint where conname='love_profile_locale_supported') then
  alter table public.couple_profiles add constraint love_profile_locale_supported
   check(preferred_locale in ('fr-CA','en','es','pt','de','it','nl','ar','ja','zh-CN'));
 end if;
 if not exists(select 1 from pg_constraint where conname='love_profile_currency_supported') then
  alter table public.couple_profiles add constraint love_profile_currency_supported
   check(preferred_currency in ('CAD','USD','EUR','GBP','CHF','JPY','CNY','AUD','NZD','MXN','BRL','MAD','AED','INR'));
 end if;
 if not exists(select 1 from pg_constraint where conname='love_travel_radius_supported') then
  alter table public.couples add constraint love_travel_radius_supported check(travel_radius_km between 10 and 500);
 end if;
 if not exists(select 1 from pg_constraint where conname='love_travel_coords_supported') then
  alter table public.couples add constraint love_travel_coords_supported
    check ((travel_origin_lat is null and travel_origin_lon is null) or
           (travel_origin_lat between -90 and 90 and travel_origin_lon between -180 and 180));
 end if;
end $$;

create or replace function public.save_love_travel_preferences(
 p_couple uuid,
 p_label text,
 p_lat numeric,
 p_lon numeric,
 p_radius integer,
 p_enabled boolean)
returns void
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
 if auth.uid() is null or not public.love_verified_identity() then
  raise exception 'Compte connecté et courriel vérifié requis.' using errcode='42501';
 end if;
 if p_couple is null or not exists(
  select 1 from public.couple_members m where m.couple_id=p_couple and m.user_id=auth.uid()
 ) then
  raise exception 'Seuls les membres du duo peuvent modifier la région.' using errcode='42501';
 end if;
 if char_length(coalesce(p_label,''))>120 or p_radius not between 10 and 500 or
    (p_lat is null) <> (p_lon is null) or
    (p_lat is not null and (p_lat not between -90 and 90 or p_lon not between -180 and 180)) then
  raise exception 'Paramètres de région invalides.' using errcode='22023';
 end if;
 update public.couples set
  travel_origin_label=coalesce(trim(p_label),''),
  travel_origin_lat=case when p_lat is null then null else round(p_lat,2) end,
  travel_origin_lon=case when p_lon is null then null else round(p_lon,2) end,
  travel_radius_km=p_radius,
  activity_localization_enabled=coalesce(p_enabled,false)
 where id=p_couple;
 if not found then raise exception 'Duo introuvable.';end if;
end;
$$;
revoke all on function public.save_love_travel_preferences(uuid,text,numeric,numeric,integer,boolean) from public;
grant execute on function public.save_love_travel_preferences(uuid,text,numeric,numeric,integer,boolean) to authenticated;
