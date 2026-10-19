-- LoveRoll Studio: estimated credit usage from LoveRoll's Geoapify Edge Function.
-- NOT a Geoapify account balance: keys outside LoveRoll and unrecorded requests are excluded.
-- Applied to Supabase project ejsrqfpkgwraorrznjpm on 2026-10-19.
create table if not exists public.love_geo_api_usage (
 id bigint generated always as identity primary key,
 called_at timestamptz not null default now(),
 api_name text not null check (api_name in ('geocoding','places','route_matrix')),
 estimated_credits integer not null check (estimated_credits between 0 and 10000),
 outcome text not null default 'ok' check (outcome in ('ok','error'))
);
create index if not exists love_geo_api_usage_date_idx on public.love_geo_api_usage(called_at desc);
alter table public.love_geo_api_usage enable row level security;
revoke all on public.love_geo_api_usage from public,anon,authenticated;
grant select,insert on public.love_geo_api_usage to service_role;
grant usage,select on sequence public.love_geo_api_usage_id_seq to service_role;

create table if not exists public.love_geo_api_budget (
 id integer primary key default 1 check (id=1),
 daily_limit integer not null default 3000 check (daily_limit between 1 and 100000000)
);
insert into public.love_geo_api_budget(id,daily_limit) values (1,3000) on conflict (id) do nothing;
alter table public.love_geo_api_budget enable row level security;
revoke all on public.love_geo_api_budget from public,anon,authenticated;

create or replace function public.love_admin_geo_usage()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_quota int; v_today int; v_30d int; v_calls int; v_since timestamptz;
begin
 if not public.love_platform_is_admin() then
   raise exception 'Accès à la console interdit' using errcode='42501';
 end if;
 select daily_limit into v_quota from public.love_geo_api_budget where id=1;
 select coalesce(sum(estimated_credits) filter(where (called_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date),0)::int,
   coalesce(sum(estimated_credits) filter(where called_at >= now() - interval '30 days'),0)::int,
   count(*) filter(where (called_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)::int,
   min(called_at)
 into v_today,v_30d,v_calls,v_since
 from public.love_geo_api_usage;
 return jsonb_build_object(
  'quota',v_quota,'used_today',v_today,'remaining_estimate',greatest(0,v_quota-v_today),
  'calls_today',v_calls,'used_30d',v_30d,'tracked_since',v_since,
  'day_utc',(now() at time zone 'UTC')::date,
  'by_api',(select coalesce(jsonb_agg(jsonb_build_object('api',api_name,'credits',credits,'calls',calls) order by api_name),'[]'::jsonb)
    from (select api_name,sum(estimated_credits)::int credits,count(*)::int calls from public.love_geo_api_usage
      where (called_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date group by api_name) a),
  'last_7_days',(select coalesce(jsonb_agg(jsonb_build_object('date',days.day::date,'credits',coalesce(t.credits,0)) order by days.day),'[]'::jsonb)
    from generate_series(((now() at time zone 'UTC')::date - 6)::timestamp,
        ((now() at time zone 'UTC')::date)::timestamp,interval '1 day') as days(day)
    left join (select (called_at at time zone 'UTC')::date as day,sum(estimated_credits)::int credits
      from public.love_geo_api_usage where called_at >= now()-interval '8 days' group by 1) t
    on t.day=days.day::date)
 );
end;
$$;
revoke all on function public.love_admin_geo_usage() from public,anon;
grant execute on function public.love_admin_geo_usage() to authenticated;

create or replace function public.love_admin_geo_budget_update(p_daily_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.love_platform_is_admin() then
   raise exception 'Accès à la console interdit' using errcode='42501';
 end if;
 if p_daily_limit is null or p_daily_limit<1 or p_daily_limit>100000000 then
   raise exception 'Quota quotidien invalide' using errcode='22023';
 end if;
 update public.love_geo_api_budget set daily_limit=p_daily_limit where id=1;
 return public.love_admin_geo_usage();
end;
$$;
revoke all on function public.love_admin_geo_budget_update(integer) from public,anon;
grant execute on function public.love_admin_geo_budget_update(integer) to authenticated;
