-- Super Admin Venice studio & virtual simulator: separate from couple drafts.
create table if not exists public.love_venice_studio_trials (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  utc_day date not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check(status in ('running','partial','completed')),
  model text,
  cards jsonb not null default '[]'::jsonb check(jsonb_typeof(cards)='array'),
  unique (requested_by,utc_day)
);
alter table public.love_venice_studio_trials enable row level security;
revoke all on public.love_venice_studio_trials from public,anon,authenticated;
comment on table public.love_venice_studio_trials is 'Platform-only 3-card Venice trial; separate from couple drafts or live libraries.';
create or replace function public.love_platform_simulator_catalog()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.love_platform_is_admin() then
    raise exception 'Réservé au Super Admin' using errcode='42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'category', c.category, 'card_id', c.card_id,
      'title', c.title, 'description', c.description,
      'timer_minutes', c.timer_minutes
    ) order by c.category,c.card_id),'[]'::jsonb)
    from public.love_base_challenges c
    where c.category in ('SENSUEL','SEXUEL')
  );
end; $$;
revoke all on function public.love_platform_simulator_catalog() from public,anon,authenticated;
grant execute on function public.love_platform_simulator_catalog() to authenticated;
