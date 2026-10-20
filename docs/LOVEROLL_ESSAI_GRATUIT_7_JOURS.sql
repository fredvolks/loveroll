
-- LoveRoll | 7-day couple trial: both verified identities must be trial-virgin.
-- Backend groundwork only: this migration does not turn on access gating or payments.
create schema if not exists love_private;
revoke all on schema love_private from public, anon, authenticated;

create table if not exists love_private.trial_email_hmac_key (
  id integer primary key check (id = 1),
  secret bytea not null check (octet_length(secret)=32),
  generated_at timestamptz not null default now()
);
revoke all on love_private.trial_email_hmac_key from public, anon, authenticated;
insert into love_private.trial_email_hmac_key (id,secret)
values (1,extensions.gen_random_bytes(32))
on conflict (id) do nothing;

create table if not exists public.love_couple_free_trials (
  couple_id uuid primary key references public.couples(id) on delete restrict,
  first_user_id uuid not null,
  second_user_id uuid not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint love_trial_two_distinct_users check (first_user_id <> second_user_id),
  constraint love_trial_exactly_seven_days check (expires_at = started_at + interval '7 days')
);
alter table public.love_couple_free_trials enable row level security;
revoke all on public.love_couple_free_trials from public, anon, authenticated;

-- These claims outlive couple changes and account deletion, to prevent repeat trials.
-- No plaintext email is retained here: keyed HMACs only.
create table if not exists public.love_trial_identity_claims (
  user_id uuid primary key,
  email_hmac bytea not null unique check (octet_length(email_hmac)=32),
  first_trial_couple_id uuid not null references public.couples(id) on delete restrict,
  claimed_at timestamptz not null default now()
);
alter table public.love_trial_identity_claims enable row level security;
revoke all on public.love_trial_identity_claims from public, anon, authenticated;

create or replace function public.love_trial_status()
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_couple uuid;
  v_users uuid[];
  v_mail1 text;
  v_mail2 text;
  v_confirm1 timestamptz;
  v_confirm2 timestamptz;
  v_hmac1 bytea;
  v_hmac2 bytea;
  v_secret bytea;
  v_existing public.love_couple_free_trials%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  select cm.couple_id into v_couple
  from public.couple_members cm where cm.user_id=v_actor;
  if v_couple is null then return jsonb_build_object('state','awaiting_couple','eligible',false); end if;
  select array_agg(cm.user_id order by cm.user_id) into v_users
  from public.couple_members cm where cm.couple_id=v_couple;
  if coalesce(cardinality(v_users),0)<>2 then
    return jsonb_build_object('state','awaiting_partner','eligible',false);
  end if;
  select a.email,a.email_confirmed_at into v_mail1,v_confirm1 from auth.users a where a.id=v_users[1];
  select a.email,a.email_confirmed_at into v_mail2,v_confirm2 from auth.users a where a.id=v_users[2];
  if v_confirm1 is null or v_confirm2 is null or nullif(btrim(v_mail1),'') is null or nullif(btrim(v_mail2),'') is null then
    return jsonb_build_object('state','verify_emails','eligible',false);
  end if;
  select * into v_existing from public.love_couple_free_trials where couple_id=v_couple;
  if found then
    if (v_existing.first_user_id=v_users[1] and v_existing.second_user_id=v_users[2]) then
      return jsonb_build_object('state',case when v_existing.expires_at>now() then 'active' else 'expired' end,
         'eligible',false,'started_at',v_existing.started_at,'expires_at',v_existing.expires_at);
    end if;
    return jsonb_build_object('state','already_used','eligible',false);
  end if;
  select k.secret into v_secret from love_private.trial_email_hmac_key k where k.id=1;
  v_hmac1 := extensions.hmac(convert_to(lower(btrim(v_mail1)),'UTF8'),v_secret,'sha256');
  v_hmac2 := extensions.hmac(convert_to(lower(btrim(v_mail2)),'UTF8'),v_secret,'sha256');
  if v_hmac1=v_hmac2 or exists (
    select 1 from public.love_trial_identity_claims c
    where c.user_id=any(v_users) or c.email_hmac in (v_hmac1,v_hmac2)
  ) then
    return jsonb_build_object('state','already_used','eligible',false);
  end if;
  return jsonb_build_object('state','available','eligible',true,'trial_days',7);
end;
$$;
revoke all on function public.love_trial_status() from public,anon;
grant execute on function public.love_trial_status() to authenticated;

create or replace function public.love_trial_activate()
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_couple uuid;
  v_users uuid[];
  v_mail1 text;
  v_mail2 text;
  v_confirm1 timestamptz;
  v_confirm2 timestamptz;
  v_hmac1 bytea;
  v_hmac2 bytea;
  v_secret bytea;
  v_started timestamptz;
  v_existing public.love_couple_free_trials%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  select cm.couple_id into v_couple from public.couple_members cm where cm.user_id=v_actor;
  if v_couple is null then raise exception 'Join a couple first' using errcode='P0001'; end if;

  -- Lock the couple against concurrent join/unpair/start on this couple.
  perform 1 from public.couples c where c.id=v_couple for update;
  select array_agg(cm.user_id order by cm.user_id) into v_users
  from public.couple_members cm where cm.couple_id=v_couple;
  if coalesce(cardinality(v_users),0)<>2 then
    raise exception 'Both partners are required' using errcode='P0001';
  end if;

  select a.email,a.email_confirmed_at into v_mail1,v_confirm1 from auth.users a where a.id=v_users[1];
  select a.email,a.email_confirmed_at into v_mail2,v_confirm2 from auth.users a where a.id=v_users[2];
  if v_confirm1 is null or v_confirm2 is null or nullif(btrim(v_mail1),'') is null or nullif(btrim(v_mail2),'') is null then
    raise exception 'Both email addresses must be verified' using errcode='P0001';
  end if;
  select * into v_existing from public.love_couple_free_trials where couple_id=v_couple;
  if found then
    if v_existing.first_user_id=v_users[1] and v_existing.second_user_id=v_users[2] then
      return jsonb_build_object('state',case when v_existing.expires_at>now() then 'active' else 'expired' end,
          'started_at',v_existing.started_at,'expires_at',v_existing.expires_at);
    end if;
    raise exception 'This couple has already used its trial' using errcode='P0001';
  end if;

  select k.secret into v_secret from love_private.trial_email_hmac_key k where k.id=1;
  v_hmac1 := extensions.hmac(convert_to(lower(btrim(v_mail1)),'UTF8'),v_secret,'sha256');
  v_hmac2 := extensions.hmac(convert_to(lower(btrim(v_mail2)),'UTF8'),v_secret,'sha256');
  if v_hmac1=v_hmac2 or exists (
    select 1 from public.love_trial_identity_claims c
    where c.user_id=any(v_users) or c.email_hmac in (v_hmac1,v_hmac2)
  ) then
    raise exception 'At least one member is not eligible for a trial' using errcode='P0001';
  end if;

  -- A unique email HMAC and unique user ID guard concurrent trials across couples.
  v_started := now();
  insert into public.love_trial_identity_claims(user_id,email_hmac,first_trial_couple_id,claimed_at)
  values (v_users[1],v_hmac1,v_couple,v_started), (v_users[2],v_hmac2,v_couple,v_started);
  insert into public.love_couple_free_trials(couple_id,first_user_id,second_user_id,started_at,expires_at)
  values (v_couple,v_users[1],v_users[2],v_started,v_started+interval '7 days');

  return jsonb_build_object('state','active','started_at',v_started,'expires_at',v_started+interval '7 days');
exception when unique_violation then
  -- Insertions roll back together if the other partner is already claimed.
  raise exception 'At least one member is not eligible for a trial' using errcode='P0001';
end;
$$;
revoke all on function public.love_trial_activate() from public,anon;
grant execute on function public.love_trial_activate() to authenticated;

-- Five dollars monthly is a configured catalogue value only; this does not create Stripe prices.
alter table public.love_platform_settings alter column monthly_base_cad_cents set default 500;
update public.love_platform_settings set monthly_base_cad_cents=500
where id=1 and monthly_base_cad_cents is null;
