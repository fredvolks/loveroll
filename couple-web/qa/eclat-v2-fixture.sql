-- Disposable PG17 CI fixture: not production and no real user records.
create role authenticated;
create role anon;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.couples(id uuid primary key);
create table public.couple_members(couple_id uuid not null references public.couples(id),
 user_id uuid not null references auth.users(id), primary key(couple_id,user_id),unique(user_id));
create table public.love_eclat_sessions(id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id),ended_at timestamptz);
create function public.love_require_verified_identity() returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Identity required' using errcode='28000'; end if;
end $$;
create function public.love_eclat_has_access(p_couple uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.couple_members where couple_id=p_couple) $$;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003');
insert into public.couples(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002');
insert into public.couple_members(couple_id,user_id) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');
