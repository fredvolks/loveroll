-- Owner-only LoveRoll special event templates, year 2027 and later.
create table if not exists public.love_special_event_catalogue(
 couple_id uuid primary key references public.couples(id) on delete cascade,
 events jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.love_special_event_catalogue enable row level security;
revoke all on public.love_special_event_catalogue from public,anon;
grant select on public.love_special_event_catalogue to authenticated;
drop policy if exists special_event_catalogue_owner on public.love_special_event_catalogue;
create policy special_event_catalogue_owner on public.love_special_event_catalogue
 for select to authenticated using(couple_private.is_member(couple_id)
 and exists(select 1 from public.couples c
 where c.id=couple_id and c.owner_user_id=(select auth.uid())));
alter table public.couple_occasion_rolls
 add column if not exists special_title text,
 add column if not exists special_description text,
 add column if not exists modifier_title text,
 add column if not exists modifier_text text;
alter table public.couple_occasion_rolls
 drop constraint if exists couple_occasion_rolls_roll_type_check;
alter table public.couple_occasion_rolls
 add constraint couple_occasion_rolls_roll_type_check
 check(roll_type in ('surprise','host','activity','modifier'));
alter table public.couple_occasion_rolls
 drop constraint if exists couple_occasion_rolls_check;
alter table public.couple_occasion_rolls
 add constraint couple_occasion_rolls_check
 check(roll_type not in ('host','activity','modifier') or face<=6);
create table if not exists public.love_special_modifier_snapshots(
 couple_id uuid not null references public.couples(id) on delete cascade,
 event_year integer not null,occasion_key text not null,
 modifier_title text not null,modifier_options jsonb not null,
 activity_options jsonb not null default '[]'::jsonb,
 primary key(couple_id,event_year,occasion_key)
);
alter table public.love_special_modifier_snapshots enable row level security;
revoke all on public.love_special_modifier_snapshots from public,anon,authenticated;
