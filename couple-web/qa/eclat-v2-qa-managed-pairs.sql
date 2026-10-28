-- QA-only manual provisioning prerequisite. DO NOT put in production migration runner.
-- Must be applied only to an explicitly named new/dedicated LoveRoll QA project.
begin;
create table if not exists public.loveroll_qa_managed_pairs (
 id uuid primary key,
 operator_id uuid not null references auth.users(id),
 couple_id uuid not null,
 user_a uuid not null,
 user_b uuid not null,
 state text not null default 'active' check (state in ('active','deleting','failed')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 check (user_a<>user_b),
 check (expires_at>created_at)
);
create index if not exists loveroll_qa_pairs_expiry on public.loveroll_qa_managed_pairs(expires_at);
alter table public.loveroll_qa_managed_pairs enable row level security;
revoke all on public.loveroll_qa_managed_pairs from public,anon,authenticated;
-- All reads/writes are exclusively through the QA Edge Function's server-only
-- admin client; no client-side table grant, RPC or bypass.
commit;
