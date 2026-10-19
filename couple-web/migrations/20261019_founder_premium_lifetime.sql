-- LoveRoll personal Premium exceptions: account-granted, permanent until explicitly revoked.
-- This is NOT the global platform administrator role and never grants admin capabilities.
create table if not exists public.love_account_premium_exemptions(
  user_id uuid primary key references auth.users(id) on delete cascade,
  premium_lifetime boolean not null default false,
  monthly_d100_limit integer not null default 1 check(monthly_d100_limit between 1 and 12),
  all_features boolean not null default false,
  reason text not null default '',
  granted_at timestamptz not null default now(),
  changed_at timestamptz not null default now()
);
alter table public.love_account_premium_exemptions enable row level security;
revoke all on public.love_account_premium_exemptions from public,anon,authenticated;
-- No client RLS policies: access requires signed-in, verified RPC only.
create or replace function public.love_my_premium_access()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_access public.love_account_premium_exemptions%rowtype;
begin
 perform public.love_require_verified_identity();
 select * into v_access from public.love_account_premium_exemptions where user_id=auth.uid();
 return jsonb_build_object(
  'premium_free_lifetime',coalesce(v_access.premium_lifetime,false),
  'max_monthly_d100',coalesce(v_access.monthly_d100_limit,1),
  'all_features',coalesce(v_access.all_features,false),
  'billing_exempt',coalesce(v_access.premium_lifetime,false),
  'plan',case when coalesce(v_access.premium_lifetime,false) then 'premium_lifetime' else 'base' end
 );
end;
$$;
revoke all on function public.love_my_premium_access() from public,anon;
grant execute on function public.love_my_premium_access() to authenticated;
create or replace function public.love_couple_premium_access(p_couple uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_limit integer:=1;v_lifetime boolean:=false;v_features boolean:=false;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé' using errcode='42501';
 end if;
 select greatest(1,coalesce(max(x.monthly_d100_limit) filter(where x.premium_lifetime),1)),
        coalesce(bool_or(x.premium_lifetime),false),
        coalesce(bool_or(x.all_features and x.premium_lifetime),false)
 into v_limit,v_lifetime,v_features
 from public.couple_members cm
 join public.love_account_premium_exemptions x on x.user_id=cm.user_id
 where cm.couple_id=p_couple;
 return jsonb_build_object(
  'premium_free_lifetime',v_lifetime,
  'max_monthly_d100',v_limit,
  'all_features',v_features,
  'billing_exempt',v_lifetime,
  'plan',case when v_lifetime then 'premium_lifetime' else 'base' end
 );
end;
$$;
revoke all on function public.love_couple_premium_access(uuid) from public,anon;
grant execute on function public.love_couple_premium_access(uuid) to authenticated;
-- Only this pre-authorized, confirmed personal email receives the exemption.
-- It is independent of the platform admin identity.
insert into public.love_account_premium_exemptions
 (user_id,premium_lifetime,monthly_d100_limit,all_features,reason)
select u.id,true,4,true,'Lifetime Premium — personal founder account'
from auth.users u where lower(u.email)='frederickmessely@gmail.com'
 and u.email_confirmed_at is not null
on conflict(user_id) do update
 set premium_lifetime=true,monthly_d100_limit=4,all_features=true,
     reason='Lifetime Premium — personal founder account',changed_at=now();
