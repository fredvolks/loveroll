-- LoveRoll • Private pilot: three Venice cards, one sample batch per couple/UTC day.
-- No inserts or updates to love_future_style_cards / active challenges.
create table if not exists public.love_venice_preview_trials (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 requested_by uuid not null,
 utc_day date not null,
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running' check(status in ('running','completed','partial')),
 model text,
 cards jsonb not null default '[]'::jsonb check(jsonb_typeof(cards)='array'),
 unique(couple_id,utc_day)
);
alter table public.love_venice_preview_trials enable row level security;
revoke all on table public.love_venice_preview_trials from public,anon,authenticated;
comment on table public.love_venice_preview_trials is
 'Service-role only. Draft of up to 3 Venice sample cards; no active challenge or payment modifications.';
