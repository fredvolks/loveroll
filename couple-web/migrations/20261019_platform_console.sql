-- LoveRoll owner-only global business panel, additive and safe.
-- IMPORTANT: platform admin is NOT the same as a duo creator.
-- Owner enrollment is manual via privileged Supabase SQL editor.
create table if not exists public.love_platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
alter table public.love_platform_admins enable row level security;
revoke all on public.love_platform_admins from public,anon,authenticated;
create or replace function public.love_platform_is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and public.love_verified_identity()
 and exists(select 1 from public.love_platform_admins a where a.user_id=auth.uid());
$$;
revoke all on function public.love_platform_is_admin() from public,anon;
grant execute on function public.love_platform_is_admin() to authenticated;

create table if not exists public.love_platform_settings (
 id integer primary key default 1 check (id=1),
 annual_base_cad_cents integer not null default 4999 check(annual_base_cad_cents between 0 and 1000000),
 monthly_base_cad_cents integer default null check(monthly_base_cad_cents between 1 and 1000000),
 activities_2_cad_cents integer not null default 399 check(activities_2_cad_cents between 1 and 1000000),
 activities_3_cad_cents integer not null default 699 check(activities_3_cad_cents between 1 and 1000000),
 activities_4_cad_cents integer not null default 899 check(activities_4_cad_cents between 1 and 1000000),
 included_monthly_draws integer not null default 1 check(included_monthly_draws between 1 and 4),
 max_monthly_draws integer not null default 4 check(max_monthly_draws between 1 and 12),
 paid_upgrades_enabled boolean not null default false,
 geo_enabled boolean not null default true,
 geo_max_candidates integer not null default 10 check(geo_max_candidates between 1 and 20),
 geo_max_radius_km integer not null default 500 check(geo_max_radius_km between 10 and 500),
 annual_no_repeat boolean not null default true,
 reminder_hours integer not null default 24 check(reminder_hours between 1 and 168),
 maintenance_message text not null default '' check(length(maintenance_message)<=240),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 check(max_monthly_draws>=included_monthly_draws)
);
insert into public.love_platform_settings(id) values(1) on conflict do nothing;
alter table public.love_platform_settings enable row level security;
revoke all on public.love_platform_settings from public,anon,authenticated;

create table if not exists public.love_platform_admin_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 changed_at timestamptz not null default now(),
 patch jsonb not null
);
alter table public.love_platform_admin_audit enable row level security;
revoke all on public.love_platform_admin_audit from public,anon,authenticated;

-- Ledger for future signed payment provider integrations only;
-- the client NEVER receives INSERT, UPDATE, DELETE or entitlement-granting RPC permissions.
create table if not exists public.love_monthly_paid_entitlements(
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 month_key text not null check(month_key ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 total_activities integer not null check(total_activities between 2 and 12),
 provider_payment_ref text not null unique,
 amount_cad_cents integer not null check(amount_cad_cents>0),
 created_at timestamptz not null default now(),
 unique(couple_id,month_key,provider_payment_ref)
);
alter table public.love_monthly_paid_entitlements enable row level security;
revoke all on public.love_monthly_paid_entitlements from public,anon,authenticated;
create policy love_monthly_entitlements_read on public.love_monthly_paid_entitlements
 for select to authenticated using(public.love_verified_identity() and couple_private.is_member(couple_id));
grant select on public.love_monthly_paid_entitlements to authenticated;

create or replace function public.love_public_pricing()
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
  'annual_base_cad_cents',annual_base_cad_cents,
  'monthly_base_cad_cents',monthly_base_cad_cents,
  'activities_2_cad_cents',activities_2_cad_cents,
  'activities_3_cad_cents',activities_3_cad_cents,
  'activities_4_cad_cents',activities_4_cad_cents,
  'included_monthly_draws',included_monthly_draws,
  'max_monthly_draws',max_monthly_draws,
  'paid_upgrades_enabled',false,
  'payments_connected',false
 ) from public.love_platform_settings where id=1;
$$;
revoke all on function public.love_public_pricing() from public,anon;
grant execute on function public.love_public_pricing() to authenticated;

create or replace function public.love_platform_admin_read()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.love_platform_is_admin() then raise exception 'Accès à la console interdit' using errcode='42501';end if;
 select jsonb_build_object(
 'config',(select to_jsonb(s)-'updated_by' from public.love_platform_settings s where s.id=1),
 'stats',jsonb_build_object(
  'registered_users',(select count(*) from auth.users),
  'couples',(select count(*) from public.couples),
  'monthly_draws',(select count(*) from public.couple_rolls where kind='monthly_activity'),
  'geo_ready',(select count(*) from public.love_monthly_places where state='ready'),
  'geo_pending',(select count(*) from public.love_monthly_places where state='pending'),
  'geo_unavailable',(select count(*) from public.love_monthly_places where state='unavailable'),
  'bookings',(select count(*) from public.love_monthly_reservations where status='confirmed'),
  'paid_grants',(select count(*) from public.love_monthly_paid_entitlements)
 ),
 'experiences',(select coalesce(jsonb_agg(to_jsonb(e) order by e.face),'[]'::jsonb) from public.love_world_experiences e),
 'audit',(select coalesce(jsonb_agg(to_jsonb(a) order by a.changed_at desc),'[]'::jsonb)
  from (select changed_at,patch from public.love_platform_admin_audit order by changed_at desc limit 12)a)
 ) into result;
 return result;
end;
$$;
revoke all on function public.love_platform_admin_read() from public,anon;
grant execute on function public.love_platform_admin_read() to authenticated;

create or replace function public.love_platform_admin_save(p_patch jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare k text; incoming jsonb:=coalesce(p_patch,'{}'::jsonb); updated jsonb;
begin
 if not public.love_platform_is_admin() then raise exception 'Accès interdit' using errcode='42501';end if;
 if jsonb_typeof(incoming)<>'object' then raise exception 'Réglages invalides';end if;
 for k in select jsonb_object_keys(incoming) loop
  if k<>all(array[
   'annual_base_cad_cents','monthly_base_cad_cents',
   'activities_2_cad_cents','activities_3_cad_cents','activities_4_cad_cents',
   'included_monthly_draws','max_monthly_draws','geo_enabled',
   'geo_max_candidates','geo_max_radius_km','annual_no_repeat',
   'reminder_hours','maintenance_message'
  ]) then raise exception 'Paramètre interdit: %',k;end if;
 end loop;
 update public.love_platform_settings set
  annual_base_cad_cents=case when incoming?'annual_base_cad_cents' then (incoming->>'annual_base_cad_cents')::int else annual_base_cad_cents end,
  monthly_base_cad_cents=case when incoming?'monthly_base_cad_cents' then (incoming->>'monthly_base_cad_cents')::int else monthly_base_cad_cents end,
  activities_2_cad_cents=case when incoming?'activities_2_cad_cents' then (incoming->>'activities_2_cad_cents')::int else activities_2_cad_cents end,
  activities_3_cad_cents=case when incoming?'activities_3_cad_cents' then (incoming->>'activities_3_cad_cents')::int else activities_3_cad_cents end,
  activities_4_cad_cents=case when incoming?'activities_4_cad_cents' then (incoming->>'activities_4_cad_cents')::int else activities_4_cad_cents end,
  included_monthly_draws=case when incoming?'included_monthly_draws' then (incoming->>'included_monthly_draws')::int else included_monthly_draws end,
  max_monthly_draws=case when incoming?'max_monthly_draws' then (incoming->>'max_monthly_draws')::int else max_monthly_draws end,
  geo_enabled=case when incoming?'geo_enabled' then (incoming->>'geo_enabled')::boolean else geo_enabled end,
  geo_max_candidates=case when incoming?'geo_max_candidates' then (incoming->>'geo_max_candidates')::int else geo_max_candidates end,
  geo_max_radius_km=case when incoming?'geo_max_radius_km' then (incoming->>'geo_max_radius_km')::int else geo_max_radius_km end,
  annual_no_repeat=case when incoming?'annual_no_repeat' then (incoming->>'annual_no_repeat')::boolean else annual_no_repeat end,
  reminder_hours=case when incoming?'reminder_hours' then (incoming->>'reminder_hours')::int else reminder_hours end,
  maintenance_message=case when incoming?'maintenance_message' then coalesce(incoming->>'maintenance_message','') else maintenance_message end,
  updated_at=now(),updated_by=auth.uid()
 where id=1 returning to_jsonb(public.love_platform_settings.*)-'updated_by' into updated;
 if (updated->>'max_monthly_draws')::int < (updated->>'included_monthly_draws')::int then
  raise exception 'Le maximum doit être supérieur au forfait inclus';end if;
 -- Paid extras never become active from a settings change alone.
 insert into public.love_platform_admin_audit(actor_id,patch) values(auth.uid(),incoming);
 return updated;
end;
$$;
revoke all on function public.love_platform_admin_save(jsonb) from public,anon;
grant execute on function public.love_platform_admin_save(jsonb) to authenticated;

create or replace function public.love_platform_admin_edit_experience(
 p_face integer,p_title text,p_description text,p_theme text,p_geo_categories text
) returns void language plpgsql security definer set search_path=''
as $$
begin
 if not public.love_platform_is_admin() then raise exception 'Accès interdit' using errcode='42501';end if;
 if p_face not between 1 and 100
 or length(trim(coalesce(p_title,''))) not between 6 and 130
 or length(trim(coalesce(p_description,''))) not between 20 and 700
 or length(trim(coalesce(p_theme,''))) not between 2 and 45
 or length(trim(coalesce(p_geo_categories,''))) not between 5 and 300
 or p_geo_categories !~ '^[a-z_,.]+$'
 then raise exception 'Activité invalide' using errcode='22023';end if;
 update public.love_world_experiences
 set title=trim(p_title),description=trim(p_description),
     theme=trim(p_theme),geo_categories=trim(p_geo_categories)
 where face=p_face;
 if not found then raise exception 'Face inexistante';end if;
 insert into public.love_platform_admin_audit(actor_id,patch)
 values(auth.uid(),jsonb_build_object('experience_face',p_face,'title',p_title,'theme',p_theme));
end;
$$;
revoke all on function public.love_platform_admin_edit_experience(integer,text,text,text,text) from public,anon;
grant execute on function public.love_platform_admin_edit_experience(integer,text,text,text,text) to authenticated;
