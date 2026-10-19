-- LoveRoll annual discount policy: choose the single highest benefit, NEVER combine.
-- Preview is authenticated and server-calculated; payments remain disconnected.
-- For equal values, prefer earned referral credits and keep the promo unused.
-- Checkout payment reconciliation must happen in a signed server webhook.
create or replace function public.love_choose_best_annual_discount(
 p_price_cad_cents integer,p_promo_cad_cents integer,p_referral_cad_cents integer
) returns jsonb language plpgsql immutable set search_path=''
as $$
declare
 v_price integer;
 v_promo integer;
 v_referral integer;
 v_kind text;
 v_selected integer;
begin
 if p_price_cad_cents is null or p_price_cad_cents<0 then
  raise exception 'Prix annuel invalide' using errcode='22023';
 end if;
 v_price:=p_price_cad_cents;
 v_promo:=least(v_price,greatest(0,coalesce(p_promo_cad_cents,0)));
 v_referral:=least(v_price,greatest(0,coalesce(p_referral_cad_cents,0)));
 if v_referral>0 and v_referral>=v_promo then
  v_kind:='referral';v_selected:=v_referral;
 elsif v_promo>0 then
  v_kind:='promo';v_selected:=v_promo;
 else
  v_kind:='none';v_selected:=0;
 end if;
 return jsonb_build_object(
  'selected_discount_kind',v_kind,
  'selected_discount_cad_cents',v_selected,
  'discount_cad_cents',v_selected,
  'total_cad_cents',v_price-v_selected);
end;
$$;
revoke all on function public.love_choose_best_annual_discount(integer,integer,integer) from public,anon,authenticated;
grant execute on function public.love_choose_best_annual_discount(integer,integer,integer) to service_role;

-- Internal calculator: rejects invalid codes, checks member-specific redemptions,
-- and reads only EARNED / unapplied referral credit.
create or replace function public.love_checkout_discount_calculate(
 p_couple_id uuid,p_code text,p_audience text
) returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_price integer;v_referral bigint:=0;v_promo integer:=0;v_percent integer:=null;
 v_promo_row public.love_promo_codes%rowtype;v_has_code boolean;
 v_decision jsonb;
begin
 if p_couple_id is null or not exists(select 1 from public.couples where id=p_couple_id) then
  raise exception 'Couple introuvable' using errcode='22023';
 end if;
 if p_audience is null or p_audience not in ('annual_new','annual_renewal') then
  raise exception 'Période annuelle invalide' using errcode='22023';
 end if;
 select annual_base_cad_cents into v_price from public.love_platform_settings where id=1;
 if v_price is null then raise exception 'Tarif annuel indisponible';end if;
 if p_audience='annual_renewal' then
  select coalesce(sum(amount_cad_cents),0) into v_referral
  from public.love_referral_credit_ledger
  where beneficiary_couple_id=p_couple_id and state='awaiting_application';
 end if;
 v_referral:=least(v_price,greatest(0,v_referral));
 v_has_code:=length(trim(coalesce(p_code,'')))>0;
 if v_has_code then
  select * into v_promo_row from public.love_promo_codes p
  where p.code=upper(trim(p_code))
    and p.active=true and now()>=p.starts_at and now()<p.expires_at
    and (p.audience='both' or p.audience=p_audience);
  if not found then
   raise exception 'Code promo invalide, expiré ou non applicable' using errcode='22023';
  end if;
  if v_promo_row.max_redemptions is not null
   and v_promo_row.redeemed_count>=v_promo_row.max_redemptions then
   raise exception 'Ce code a atteint sa limite d’utilisation' using errcode='22023';
  end if;
  if exists(select 1 from public.love_promo_redemptions r
    where r.promo_id=v_promo_row.id and r.couple_id=p_couple_id) then
   raise exception 'Ce couple a déjà utilisé ce code' using errcode='22023';
  end if;
  v_percent:=v_promo_row.percent_off;
  v_promo:=round(v_price::numeric*v_percent/100)::integer;
 end if;
 v_decision:=public.love_choose_best_annual_discount(v_price,v_promo,v_referral::integer);
 return v_decision || jsonb_build_object(
  'valid',true,'promo_valid',v_has_code,'code',case when v_has_code then v_promo_row.code else null end,
  'percent_off',v_percent,'base_cad_cents',v_price,
  'promo_discount_cad_cents',v_promo,
  'referral_available_cad_cents',v_referral,
  'audience',p_audience,'discounts_stackable',false,
  'payments_connected',false);
end;
$$;
revoke all on function public.love_checkout_discount_calculate(uuid,text,text) from public,anon,authenticated;
grant execute on function public.love_checkout_discount_calculate(uuid,text,text) to service_role;

-- Client-safe quote, always scoped to the CURRENT authenticated duo.
create or replace function public.love_checkout_quote(
 p_code text default null,p_audience text default 'annual_new'
) returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_couple uuid;
begin
 perform public.love_require_verified_identity();
 select cm.couple_id into v_couple from public.couple_members cm
 where cm.user_id=auth.uid() order by cm.joined_at desc limit 1;
 if v_couple is null or not couple_private.is_member(v_couple) then
  raise exception 'Un compte de couple est nécessaire' using errcode='42501';
 end if;
 return public.love_checkout_discount_calculate(v_couple,p_code,p_audience);
end;
$$;
revoke all on function public.love_checkout_quote(text,text) from public,anon;
grant execute on function public.love_checkout_quote(text,text) to authenticated;

-- Existing quote endpoint follows the same non-cumulative rules.
create or replace function public.love_promo_quote(
 p_code text,p_audience text default 'annual_new'
) returns jsonb language sql stable security definer set search_path=''
as $$ select public.love_checkout_quote(p_code,p_audience); $$;
revoke all on function public.love_promo_quote(text,text) from public,anon;
grant execute on function public.love_promo_quote(text,text) to authenticated;

-- A shared uniqueness key protects future payment processing:
-- exactly ONE type of annual discount per provider payment reference.
create table if not exists public.love_annual_discount_settlements (
 id uuid primary key default gen_random_uuid(),
 provider_payment_ref text not null unique,
 couple_id uuid not null references public.couples(id) on delete cascade,
 audience text not null check(audience in ('annual_new','annual_renewal')),
 discount_kind text not null check(discount_kind in ('promo','referral')),
 discount_cad_cents integer not null check(discount_cad_cents>=0),
 promo_code text,
 created_at timestamptz not null default now(),
 check((discount_kind='promo' and promo_code is not null)
    or (discount_kind='referral' and promo_code is null))
);
alter table public.love_annual_discount_settlements enable row level security;
revoke all on public.love_annual_discount_settlements from public,anon,authenticated;

-- A promo can settle ONLY if it wins the server-side comparison.
-- This function is reserved for signed-payment webhooks using service_role.
-- A renewal-credit settlement will need to use the same settlement table when
-- the payment provider is connected; no credit consumption is exposed to clients.
create or replace function public.love_promo_confirm_verified_payment(
 p_code text,p_couple_id uuid,p_payment_ref text,p_audience text,
 p_base_cad_cents integer,p_discount_cad_cents integer
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.love_promo_codes%rowtype;v_quote jsonb;v_old public.love_promo_redemptions%rowtype;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Appel serveur exclusivement' using errcode='42501';
 end if;
 if p_audience is null or p_audience not in ('annual_new','annual_renewal')
  or p_payment_ref is null or length(trim(p_payment_ref)) not between 10 and 250
  or p_base_cad_cents is null or p_base_cad_cents<0
  or p_discount_cad_cents is null or p_discount_cad_cents<0 then
  raise exception 'Paiement invalide' using errcode='22023';
 end if;
 -- Serialize settlements for this couple against referral awards.
 perform 1 from public.couples where id=p_couple_id for update;
 if not found then raise exception 'Couple introuvable';end if;
 select * into v_row from public.love_promo_codes
  where code=upper(trim(coalesce(p_code,''))) for update;
 if not found then raise exception 'Code inconnu';end if;
 select * into v_old from public.love_promo_redemptions
  where provider_payment_ref=p_payment_ref;
 if found then
  if v_old.promo_id=v_row.id and v_old.couple_id=p_couple_id
   and v_old.audience=p_audience and v_old.base_cad_cents=p_base_cad_cents
   and v_old.discount_cad_cents=p_discount_cad_cents then
   return jsonb_build_object('status','already_confirmed');
  end if;
  raise exception 'Référence de paiement déjà utilisée pour un autre achat';
 end if;
 if exists(select 1 from public.love_annual_discount_settlements
  where provider_payment_ref=p_payment_ref) then
  raise exception 'Un autre avantage est déjà associé à ce paiement';
 end if;
 v_quote:=public.love_checkout_discount_calculate(p_couple_id,v_row.code,p_audience);
 if v_quote->>'selected_discount_kind'<>'promo' then
  raise exception 'Crédit de parrainage plus avantageux : code promo non utilisable pour ce paiement'
   using errcode='22023';
 end if;
 if (v_quote->>'base_cad_cents')::integer<>p_base_cad_cents
 or (v_quote->>'discount_cad_cents')::integer<>p_discount_cad_cents then
  raise exception 'Le tarif ou la remise ne correspond pas à la facture';
 end if;
 insert into public.love_annual_discount_settlements
 (provider_payment_ref,couple_id,audience,discount_kind,discount_cad_cents,promo_code)
 values(p_payment_ref,p_couple_id,p_audience,'promo',p_discount_cad_cents,v_row.code);
 insert into public.love_promo_redemptions
 (promo_id,couple_id,provider_payment_ref,audience,base_cad_cents,discount_cad_cents,percent_off)
 values(v_row.id,p_couple_id,p_payment_ref,p_audience,p_base_cad_cents,p_discount_cad_cents,v_row.percent_off);
 update public.love_promo_codes set redeemed_count=redeemed_count+1,updated_at=now()
 where id=v_row.id;
 return jsonb_build_object('status','confirmed','discount_kind','promo',
 'code',v_row.code,'discount_cad_cents',p_discount_cad_cents);
end;
$$;
revoke all on function public.love_promo_confirm_verified_payment(text,uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.love_promo_confirm_verified_payment(text,uuid,text,text,integer,integer) to service_role;
