-- Minimal *isolated* PG17 fixture for LR-028 RPC contract.
-- No production service, customer credentials, or external push server.
create schema if not exists auth;
create schema if not exists couple_private;
do $$begin
 create role authenticated nologin;
exception when duplicate_object then null;
end$$;
do $$begin
 create role anon nologin;
exception when duplicate_object then null;
end$$;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create table auth.users(id uuid primary key);
create table public.couples(id uuid primary key);
create table public.couple_members(
 couple_id uuid not null references public.couples(id),
 user_id uuid not null references auth.users(id),
 primary key(couple_id,user_id)
);
create function couple_private.is_member(c uuid)
returns boolean language sql stable as $$
 select exists(select 1 from public.couple_members m
  where m.couple_id=c and m.user_id=auth.uid());
$$;
create function public.love_require_verified_identity()
returns void language plpgsql as $$
begin
 if auth.uid() is null then
  raise exception 'Login required' using errcode='42501';
 end if;
end$$;
create table public.couple_rolls(
 id uuid primary key default gen_random_uuid(),couple_id uuid,
 kind text,key text,face integer,created_at timestamptz default now()
);
create table public.couple_sessions(
 id uuid primary key default gen_random_uuid(),couple_id uuid,
 started_at timestamptz default now(),finished_at timestamptz,
 counted boolean not null default true
);
create table public.couple_personal_rolls(
 session_id uuid,user_id uuid,face integer,
 primary key(session_id,user_id)
);
create table public.love_all_dice_reset_audit(
 couple_id uuid,week_key text,reset_at timestamptz
);
create table public.love_push_preferences(
 user_id uuid primary key,enabled boolean,invitation boolean
);
create table public.love_push_outbox(
 id uuid primary key default gen_random_uuid(),
 user_id uuid,event_key text,kind text,title text,body text,
 unique(user_id,event_key)
);
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-4ccc-cccc-cccccccccccc');
insert into public.couples(id) values
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd');
insert into public.couple_members(couple_id,user_id) values
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('dddddddd-dddd-4ddd-dddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
insert into public.couple_rolls(couple_id,kind,key,face) values(
 'dddddddd-dddd-4ddd-dddd-dddddddddddd','weekly',
 to_char(
  (now() at time zone 'America/Toronto')::date-
  (extract(isodow from (now() at time zone 'America/Toronto')::date)::int-1),
  'YYYY-MM-DD'),3
);
insert into public.love_push_preferences(user_id,enabled,invitation) values
 ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true,true),
 ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',true,true);
