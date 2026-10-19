-- LoveRoll: secure promotional codes for annual subscriptions.
-- Money is in CAD cents. Checkout preview never grants entitlements.
-- Redemption requires a separately verified payment webhook using service_role.
create table if not exists public.love_promo_codes (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9_-]{3,31}$'),
 percent_off integer not null check (percent_off between 1 and 100),
 starts_at timestamptz not null default now(),
 expires_at timestamptz not null,
 max_redemptions integer check(max_redemptions is null or max_redemptions>=1),
 redeemed_count integer not null default 0 check(redeemed_count>=0),
 audience text not null default 'annual_new' check(audience in ('annual_new','annual_renewal','both')),
 active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(expires_at>starts_at),
 check(max_redemptions is null or redeemed_count<=max_redemptions)
);
alter table public.love_promo_codes enable row level security;
revoke all on public.love_promo_codes from public,anon,authenticated;
create table if not exists public.love_promo_redemptions (
 id uuid primary key default gen_random_uuid(),
 promo_id uuid not null references public.love_promo_codes(id),
 couple_id uuid not null references public.couples(id) on delete cascade,
 provider_payment_ref text not null unique,
 audience text not null check(audience in ('annual_new','annual_renewal')),
 base_cad_cents integer not null check(base_cad_cents>=0),
 discount_cad_cents integer not null check(discount_cad_cents>=0),
 percent_off integer not null check(percent_off between 1 and 100),
 redeemed_at timestamptz not null default now(),
 unique(promo_id,couple_id)
);
create index if not exists love_promo_redemptions_promo_idx on public.love_promo_redemptions(promo_id);
alter table public.love_promo_redemptions enable row level security;
revoke all on public.love_promo_redemptions from public,anon,authenticated;

create or replace function public.love_admin_promo_list()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.love_platform_is_admin() then
  raise exception 'Accès administrateur requis' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.id,'code',p.code,'percent_off',p.percent_off,
  'starts_at',p.starts_at,'expires_at',p.expires_at,'max_redemptions',p.max_redemptions,
  'redeemed_count',p.redeemed_count,'audience',p.audience,'active',p.active,
  'created_at',p.created_at) order by p.created_at desc)
 from public.love_promo_codes p),'[]'::jsonb);
end;
$$;
revoke all on function public.love_admin_promo_list() from public,anon;
grant execute on function public.love_admin_promo_list() to authenticated;

create or replace function public.love_admin_promo_save(
 p_id uuid,p_code text,p_percent_off integer,p_starts_at timestamptz,
 p_expires_at timestamptz,p_max_redemptions integer,p_audience text,p_active boolean
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_code text;v_id uuid;v_used integer;v_existing text;
begin
 if not public.love_platform_is_admin() then
  raise exception 'Accès administrateur requis' using errcode='42501';
 end if;
 if p_percent_off is null or p_percent_off not between 1 and 100
   or p_starts_at is null or p_expires_at is null or p_expires_at<=p_starts_at
   or p_expires_at>p_starts_at+interval '10 years'
   or (p_max_redemptions is not null and p_max_redemptions<1)
   or p_audience is null or p_audience not in ('annual_new','annual_renewal','both')
   or p_active is null then
  raise exception 'Paramètres du code promotionnel invalides' using errcode='22023';
 end if;
 v_code:=upper(trim(coalesce(p_code,'')));
 if v_code='' and p_id is null then
  v_code:='LOVE-'||upper(encode(extensions.gen_random_bytes(6),'hex'));
 end if;
 if v_code !~ '^[A-Z0-9][A-Z0-9_-]{3,31}$' then
  raise exception 'Code : 4 à 32 caractères, lettres, chiffres, _ ou -' using errcode='22023';
 end if;
 if p_id is null then
  insert into public.love_promo_codes
   (code,percent_off,starts_at,expires_at,max_redemptions,audience,active,created_by)
  values(v_code,p_percent_off,p_starts_at,p_expires_at,p_max_redemptions,p_audience,p_active,auth.uid())
  returning id into v_id;
 else
  select code,redeemed_count into v_existing,v_used
  from public.love_promo_codes where id=p_id for update;
  if not found then raise exception 'Code introuvable' using errcode='22023';end if;
  if v_code<>v_existing and v_used>0 then
   raise exception 'Un code déjà utilisé ne peut pas être renommé' using errcode='22023';
  end if;
  if p_max_redemptions is not null and v_used>p_max_redemptions then
   raise exception 'Limite inférieure au nombre déjà utilisé' using errcode='22023';
  end if;
  update public.love_promo_codes
  set code=v_code,percent_off=p_percent_off,starts_at=p_starts_at,
      expires_at=p_expires_at,max_redemptions=p_max_redemptions,
      audience=p_audience,active=p_active,updated_at=now()
  where id=p_id returning id into v_id;
 end if;
 insert into public.love_platform_admin_audit(actor_id,patch)
 values(auth.uid(),jsonb_build_object('promo_id',v_id,'promo_code',v_code,
 'percent_off',p_percent_off,'expires_at',p_expires_at,
 'max_redemptions',p_max_redemptions,'audience',p_audience,'active',p_active));
 return (select to_jsonb(p)-'created_by' from public.love_promo_codes p where id=v_id);
end;
$$;
revoke all on function public.love_admin_promo_save(uuid,text,integer,timestamptz,timestamptz,integer,text,boolean) from public,anon;
grant execute on function public.love_admin_promo_save(uuid,text,integer,timestamptz,timestamptz,integer,text,boolean) to authenticated;

-- Quote based on server-side pricing. Anonymous requests cannot enumerate promotion codes.
create or replace function public.love_promo_quote(
 p_code text,p_audience text default 'annual_new'
) returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_code public.love_promo_codes%rowtype;v_couple uuid;v_price integer;
 v_used integer;v_discount integer;v_now timestamptz:=now();
begin
 perform public.love_require_verified_identity();
 if p_audience not in ('annual_new','annual_renewal') then
  raise exception 'Formule invalide' using errcode='22023';
 end if;
 select cm.couple_id into v_couple from public.couple_members cm
  where cm.user_id=auth.uid() order by cm.joined_at desc limit 1;
 if v_couple is null or not couple_private.is_member(v_couple) then
  raise exception 'Un compte de couple est nécessaire' using errcode='42501';
 end if;
 select * into v_code from public.love_promo_codes p
 where p.code=upper(trim(coalesce(p_code,''))) and p.active=true
   and v_now>=p.starts_at and v_now<p.expires_at
   and (p.audience='both' or p.audience=p_audience);
 if not found then raise exception 'Code promo invalide, expiré ou non applicable' using errcode='22023';end if;
 if v_code.max_redemptions is not null
   and v_code.redeemed_count>=v_code.max_redemptions then
  raise exception 'Ce code a atteint sa limite d’utilisation' using errcode='22023';
 end if;
 select count(*) into v_used from public.love_promo_redemptions r
  where r.promo_id=v_code.id and r.couple_id=v_couple;
 if v_used>0 then
  raise exception 'Ce couple a déjà utilisé ce code' using errcode='22023';
 end if;
 select annual_base_cad_cents into v_price from public.love_platform_settings where id=1;
 if v_price is null then raise exception 'Tarif annuel indisponible';end if;
 v_discount:=round(v_price::numeric*v_code.percent_off/100)::integer;
 return jsonb_build_object('valid',true,'code',v_code.code,
   'audience',p_audience,'percent_off',v_code.percent_off,
   'base_cad_cents',v_price,'discount_cad_cents',v_discount,
   'total_cad_cents',greatest(0,v_price-v_discount),
   'expires_at',v_code.expires_at,
   'payments_connected',false);
end;
$$;
revoke all on function public.love_promo_quote(text,text) from public,anon;
grant execute on function public.love_promo_quote(text,text) to authenticated;

-- Call ONLY after independently checking the payment provider's signed webhook.
-- The server must reconcile the real billed amount with the returned discount.
-- No browser-initiated redemption and no free Premium entitlement here.
create or replace function public.love_promo_confirm_verified_payment(
 p_code text,p_couple_id uuid,p_payment_ref text,p_audience text,
 p_base_cad_cents integer,p_discount_cad_cents integer
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_code public.love_promo_codes%rowtype;v_discount integer;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Appel serveur exclusivement' using errcode='42501';
 end if;
 if p_audience not in ('annual_new','annual_renewal')
  or p_payment_ref is null or length(trim(p_payment_ref)) not between 10 and 250
  or p_base_cad_cents is null or p_base_cad_cents<0
  or p_discount_cad_cents is null or p_discount_cad_cents<0 then
  raise exception 'Paiement invalide' using errcode='22023';
 end if;
 select * into v_code from public.love_promo_codes
  where code=upper(trim(coalesce(p_code,''))) for update;
 if not found then raise exception 'Code inconnu';end if;
 if exists(select 1 from public.love_promo_redemptions
    where provider_payment_ref=p_payment_ref) then
  return jsonb_build_object('status','already_confirmed');
 end if;
 if not v_code.active or now()<v_code.starts_at or now()>=v_code.expires_at
  or (v_code.audience<>'both' and v_code.audience<>p_audience) then
  raise exception 'Code non actif pour ce paiement';
 end if;
 if v_code.max_redemptions is not null and v_code.redeemed_count>=v_code.max_redemptions then
  raise exception 'Quota de code atteint';
 end if;
 if exists(select 1 from public.love_promo_redemptions
   where promo_id=v_code.id and couple_id=p_couple_id) then
  raise exception 'Déjà utilisé par ce couple';
 end if;
 v_discount:=round(p_base_cad_cents::numeric*v_code.percent_off/100)::integer;
 if v_discount<>p_discount_cad_cents then
  raise exception 'Montant de remise non concordant';
 end if;
 insert into public.love_promo_redemptions
  (promo_id,couple_id,provider_payment_ref,audience,base_cad_cents,discount_cad_cents,percent_off)
 values(v_code.id,p_couple_id,p_payment_ref,p_audience,p_base_cad_cents,p_discount_cad_cents,v_code.percent_off);
 update public.love_promo_codes set redeemed_count=redeemed_count+1,updated_at=now() where id=v_code.id;
 return jsonb_build_object('status','confirmed','code',v_code.code,'discount_cad_cents',v_discount);
end;
$$;
revoke all on function public.love_promo_confirm_verified_payment(text,uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.love_promo_confirm_verified_payment(text,uuid,text,text,integer,integer) to service_role;
