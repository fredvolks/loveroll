-- LoveRoll referrals — no reward without a VERIFIED first annual payment.
-- Every partner has a stable, unguessable code. Reward belongs to the referrer COUPLE.
-- Platform admins can edit policies but NEVER mint fake successful payments.
alter table public.love_platform_settings
 add column if not exists referral_enabled boolean not null default true,
 add column if not exists referral_reward_cad_cents integer not null default 500,
 add column if not exists referral_reward_mode text not null default 'renewal_credit';
alter table public.love_platform_settings
 drop constraint if exists love_referral_amount_range;
alter table public.love_platform_settings
 add constraint love_referral_amount_range check(referral_reward_cad_cents between 0 and 10000);
alter table public.love_platform_settings
 drop constraint if exists love_referral_reward_mode_check;
alter table public.love_platform_settings
 add constraint love_referral_reward_mode_check
 check(referral_reward_mode in ('renewal_credit','wallet_credit','manual'));

create table if not exists public.love_referral_links(
 user_id uuid primary key references auth.users(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 code text not null unique check(code ~ '^[0-9a-f]{24}$'),
 created_at timestamptz not null default now()
);
alter table public.love_referral_links enable row level security;
revoke all on public.love_referral_links from public,anon,authenticated;

create table if not exists public.love_referral_claims(
 referred_couple_id uuid primary key references public.couples(id) on delete cascade,
 referrer_couple_id uuid not null references public.couples(id) on delete cascade,
 referrer_user_id uuid not null references auth.users(id),
 referred_owner_id uuid not null references auth.users(id),
 referral_code text not null,
 reward_cad_cents integer not null check(reward_cad_cents between 0 and 10000),
 reward_mode text not null check(reward_mode in ('renewal_credit','wallet_credit','manual')),
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','earned','void')),
 claimed_at timestamptz not null default now(),
 annual_payment_ref text unique,
 paid_at timestamptz,
 awarded_at timestamptz,
 constraint love_referral_not_same_couple check(referrer_couple_id<>referred_couple_id),
 constraint love_referral_not_same_person check(referrer_user_id<>referred_owner_id)
);
create index if not exists love_referrals_by_referrer
on public.love_referral_claims(referrer_couple_id,status,claimed_at);
alter table public.love_referral_claims enable row level security;
revoke all on public.love_referral_claims from public,anon,authenticated;

create table if not exists public.love_referral_credit_ledger(
 id uuid primary key default gen_random_uuid(),
 claim_couple_id uuid not null unique references public.love_referral_claims(referred_couple_id),
 beneficiary_couple_id uuid not null references public.couples(id) on delete cascade,
 amount_cad_cents integer not null check(amount_cad_cents>0),
 mode text not null check(mode in ('renewal_credit','wallet_credit','manual')),
 state text not null default 'awaiting_application'
 check(state in ('awaiting_application','applied','void')),
 created_at timestamptz not null default now(),
 applied_at timestamptz,
 application_ref text unique
);
create index if not exists love_referral_ledger_beneficiary
on public.love_referral_credit_ledger(beneficiary_couple_id,state);
alter table public.love_referral_credit_ledger enable row level security;
revoke all on public.love_referral_credit_ledger from public,anon,authenticated;

-- Both members may obtain their own URL. Codes survive repeat visits.
create or replace function public.love_my_referral()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_couple uuid;v_link public.love_referral_links%rowtype;
 v_enabled boolean;v_amount integer;v_mode text;v_pending integer;v_earned integer;v_total integer;
begin
 perform public.love_require_verified_identity();
 select referral_enabled,referral_reward_cad_cents,referral_reward_mode
 into v_enabled,v_amount,v_mode from public.love_platform_settings where id=1;
 select cm.couple_id into v_couple from public.couple_members cm
 where cm.user_id=v_uid order by cm.joined_at desc limit 1;
 if v_couple is not null and not couple_private.is_member(v_couple) then v_couple:=null;end if;
 if v_couple is not null then
  select * into v_link from public.love_referral_links where user_id=v_uid;
  if v_enabled and (v_link.user_id is null or v_link.couple_id<>v_couple) then
   -- New duo after dissociation => retire prior code. Old earned credits stay
   -- tied to the old referrer couple.
   insert into public.love_referral_links(user_id,couple_id,code)
   values(v_uid,v_couple,encode(gen_random_bytes(12),'hex'))
   on conflict(user_id) do update set couple_id=excluded.couple_id,
    code=excluded.code,created_at=now()
   returning * into v_link;
  end if;
 end if;
 select count(*) filter(where status='awaiting_payment'),
        count(*) filter(where status='earned'),
        coalesce(sum(reward_cad_cents) filter(where status='earned'),0)
 into v_pending,v_earned,v_total
 from public.love_referral_claims where referrer_couple_id=v_couple;
 return jsonb_build_object('enabled',coalesce(v_enabled,false),
  'reward_cad_cents',coalesce(v_amount,500),'reward_mode',coalesce(v_mode,'renewal_credit'),
  'code',case when v_enabled and v_couple is not null then v_link.code else null end,
  'couple_ready',v_couple is not null,
  'pending_count',coalesce(v_pending,0),'paid_count',coalesce(v_earned,0),
  'earned_cad_cents',coalesce(v_total,0),
  'payments_connected',false);
end;
$$;
revoke all on function public.love_my_referral() from public,anon;
grant execute on function public.love_my_referral() to authenticated;

-- One voluntary claim for a new verified account and fresh duo only, never
-- an invited partner of an existing duo or a pre-existing paid account.
create or replace function public.love_referral_claim(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_code text:=lower(trim(coalesce(p_code,'')));
 v_new public.couples%rowtype;v_ref public.love_referral_links%rowtype;
 v_created timestamptz;v_enabled boolean;v_amount integer;v_mode text;
begin
 perform public.love_require_verified_identity();
 if v_code !~ '^[0-9a-f]{24}$' then raise exception 'Code de référence invalide' using errcode='22023';end if;
 select referral_enabled,referral_reward_cad_cents,referral_reward_mode
 into v_enabled,v_amount,v_mode from public.love_platform_settings where id=1;
 if not v_enabled then return jsonb_build_object('status','disabled');end if;
 select c.* into v_new from public.couples c
 where c.owner_user_id=v_uid order by c.created_at desc limit 1 for update;
 if not found or not couple_private.is_member(v_new.id) then
  return jsonb_build_object('status','create_duo_first');
 end if;
 if exists(select 1 from public.love_referral_claims where referred_couple_id=v_new.id) then
  return jsonb_build_object('status','already_recorded');
 end if;
 select u.created_at into v_created from auth.users u where u.id=v_uid;
 if v_created is null or v_created < now()-interval '30 days'
  or v_new.created_at < now()-interval '30 days'
  or v_new.created_at < v_created-interval '1 day' then
  return jsonb_build_object('status','not_new_account');
 end if;
 if exists(select 1 from public.love_monthly_paid_entitlements
  where couple_id=v_new.id) then return jsonb_build_object('status','already_paid');end if;
 select l.* into v_ref from public.love_referral_links l where l.code=v_code;
 if not found or v_ref.couple_id=v_new.id or v_ref.user_id=v_uid
 or not exists(select 1 from public.couple_members
  where couple_id=v_ref.couple_id and user_id=v_ref.user_id)
 or exists(select 1 from public.couple_members
  where couple_id=v_new.id and user_id=v_ref.user_id)
 then return jsonb_build_object('status','invalid_or_self');end if;
 insert into public.love_referral_claims(
  referred_couple_id,referrer_couple_id,referrer_user_id,referred_owner_id,
  referral_code,reward_cad_cents,reward_mode)
 values(v_new.id,v_ref.couple_id,v_ref.user_id,v_uid,v_code,v_amount,v_mode)
 on conflict(referred_couple_id) do nothing;
 return jsonb_build_object('status','awaiting_payment');
end;
$$;
revoke all on function public.love_referral_claim(text) from public,anon;
grant execute on function public.love_referral_claim(text) to authenticated;

-- Read status for referrer couple only, not referred persons' identities.
create or replace function public.love_my_referral_credits()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_couple uuid;v_info jsonb;
begin
 perform public.love_require_verified_identity();
 select cm.couple_id into v_couple from public.couple_members cm
 where cm.user_id=auth.uid() order by cm.joined_at desc limit 1;
 if v_couple is null or not couple_private.is_member(v_couple) then
  return jsonb_build_object('earned_cad_cents',0,'available_cad_cents',0,'applied_cad_cents',0);
 end if;
 select jsonb_build_object(
  'earned_cad_cents',coalesce(sum(l.amount_cad_cents),0),
  'available_cad_cents',coalesce(sum(l.amount_cad_cents) filter(where l.state='awaiting_application'),0),
  'applied_cad_cents',coalesce(sum(l.amount_cad_cents) filter(where l.state='applied'),0))
 into v_info from public.love_referral_credit_ledger l
 where l.beneficiary_couple_id=v_couple and l.state<>'void';
 return v_info;
end;
$$;
revoke all on function public.love_my_referral_credits() from public,anon;
grant execute on function public.love_my_referral_credits() to authenticated;

-- Called ONLY from an authenticated, signature-verified annual payment webhook
-- using SERVICE_ROLE. Never expose this procedure to the browser.
create or replace function public.love_referral_confirm_annual_payment(
 p_referred_couple uuid,p_payment_reference text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_claim public.love_referral_claims%rowtype;v_count integer;
begin
 if p_payment_reference is null or length(trim(p_payment_reference)) not between 10 and 250 then
  raise exception 'Payment reference invalid';end if;
 select * into v_claim from public.love_referral_claims
  where referred_couple_id=p_referred_couple for update;
 if not found then return jsonb_build_object('status','no_referral');end if;
 if v_claim.status='earned' then
  if v_claim.annual_payment_ref=p_payment_reference then
   return jsonb_build_object('status','already_earned');end if;
  raise exception 'Annual referral already settled';end if;
 if v_claim.status<>'awaiting_payment' then return jsonb_build_object('status','void');end if;
 -- A referred couple must have two real partners before the paid referral settles.
 select count(*) into v_count from public.couple_members where couple_id=p_referred_couple;
 if v_count<>2 then return jsonb_build_object('status','awaiting_second_partner');end if;
 if v_claim.reward_cad_cents=0 then
  update public.love_referral_claims set status='earned',annual_payment_ref=p_payment_reference,
   paid_at=now(),awarded_at=now() where referred_couple_id=p_referred_couple;
  return jsonb_build_object('status','earned_zero');
 end if;
 update public.love_referral_claims set status='earned',annual_payment_ref=p_payment_reference,
  paid_at=now(),awarded_at=now() where referred_couple_id=p_referred_couple;
 insert into public.love_referral_credit_ledger(
  claim_couple_id,beneficiary_couple_id,amount_cad_cents,mode)
 values(p_referred_couple,v_claim.referrer_couple_id,v_claim.reward_cad_cents,v_claim.reward_mode)
 on conflict(claim_couple_id) do nothing;
 return jsonb_build_object('status','credit_recorded');
end;
$$;
revoke all on function public.love_referral_confirm_annual_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.love_referral_confirm_annual_payment(uuid,text) to service_role;

-- Owner console settings with audited edits; independent of existing price RPC.
create or replace function public.love_admin_referral_settings()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if not public.love_platform_is_admin() then
  raise exception 'Accès administrateur requis' using errcode='42501';end if;
 select jsonb_build_object(
  'enabled',referral_enabled,'reward_cad_cents',referral_reward_cad_cents,
  'reward_mode',referral_reward_mode,'payments_connected',false,
  'links',(select count(*) from public.love_referral_links),
  'awaiting_payment',(select count(*) from public.love_referral_claims where status='awaiting_payment'),
  'earned_referrals',(select count(*) from public.love_referral_claims where status='earned'),
  'credits_cad_cents',(select coalesce(sum(amount_cad_cents),0) from public.love_referral_credit_ledger where state<>'void'),
  'pending_application_cad_cents',(select coalesce(sum(amount_cad_cents),0) from public.love_referral_credit_ledger where state='awaiting_application')
 ) into result from public.love_platform_settings where id=1;
 return result;
end;
$$;
revoke all on function public.love_admin_referral_settings() from public,anon;
grant execute on function public.love_admin_referral_settings() to authenticated;

create or replace function public.love_admin_referral_save(
 p_enabled boolean,p_reward_cad_cents integer,p_reward_mode text
) returns jsonb language plpgsql security definer set search_path=''
as $$
begin
 if not public.love_platform_is_admin() then
  raise exception 'Accès administrateur requis' using errcode='42501';end if;
 if p_enabled is null or p_reward_cad_cents not between 0 and 10000
 or p_reward_mode not in ('renewal_credit','wallet_credit','manual') then
  raise exception 'Paramètres de référencement invalides' using errcode='22023';end if;
 update public.love_platform_settings set referral_enabled=p_enabled,
  referral_reward_cad_cents=p_reward_cad_cents,
  referral_reward_mode=p_reward_mode,updated_at=now(),updated_by=auth.uid()
 where id=1;
 insert into public.love_platform_admin_audit(actor_id,patch)
 values(auth.uid(),jsonb_build_object('referral_enabled',p_enabled,
  'referral_reward_cad_cents',p_reward_cad_cents,'referral_reward_mode',p_reward_mode));
 return public.love_admin_referral_settings();
end;
$$;
revoke all on function public.love_admin_referral_save(boolean,integer,text) from public,anon;
grant execute on function public.love_admin_referral_save(boolean,integer,text) to authenticated;
