-- Keep personal referral codes stable through separation; guard paid rewards and annual spends.
alter table public.love_referral_links alter column couple_id drop not null;
alter table public.love_referral_links drop constraint love_referral_links_couple_id_fkey;
alter table public.love_referral_links add constraint love_referral_links_couple_id_fkey
 foreign key(couple_id) references public.couples(id) on delete set null;
CREATE OR REPLACE FUNCTION public.love_my_referral()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_couple uuid;
 v_link public.love_referral_links%rowtype;
 v_enabled boolean;v_amount integer;v_mode text;v_price integer;
 v_pending integer;v_paid integer;v_earned bigint;
 v_personal bigint:=0;v_partner bigint:=0;v_applied bigint:=0;
 v_combined bigint;v_usable integer;
begin
 perform public.love_require_verified_identity();
 select referral_enabled,referral_reward_cad_cents,referral_reward_mode,
  annual_base_cad_cents into v_enabled,v_amount,v_mode,v_price
 from public.love_platform_settings where id=1;
 select cm.couple_id into v_couple from public.couple_members cm
 where cm.user_id=v_uid order by cm.joined_at desc limit 1;
 if v_couple is not null and not couple_private.is_member(v_couple)
 then v_couple:=null;end if;
 if v_enabled then
  select * into v_link from public.love_referral_links where user_id=v_uid;
  if v_link.user_id is null then
   insert into public.love_referral_links(user_id,couple_id,code)
   values(v_uid,v_couple,encode(extensions.gen_random_bytes(12),'hex'))
   on conflict(user_id) do update set couple_id=excluded.couple_id
   returning * into v_link;
  elsif v_link.couple_id is distinct from v_couple then
   update public.love_referral_links set couple_id=v_couple
   where user_id=v_uid returning * into v_link;
  end if;
 end if;
 select count(*) filter(where status='awaiting_payment'),
  count(*) filter(where status='earned'),
  coalesce(sum(reward_cad_cents) filter(where status='earned'),0)
 into v_pending,v_paid,v_earned from public.love_referral_claims
 where referrer_user_id=v_uid;
 select coalesce(sum(l.remaining_cad_cents),0),
  coalesce(sum(l.amount_cad_cents-l.remaining_cad_cents),0)
 into v_personal,v_applied
 from public.love_referral_credit_ledger l
 where l.beneficiary_user_id=v_uid and l.state<>'void';
 if v_couple is not null then
  select coalesce(sum(l.remaining_cad_cents),0) into v_partner
  from public.love_referral_credit_ledger l
  join public.couple_members cm on cm.user_id=l.beneficiary_user_id
  where cm.couple_id=v_couple and cm.user_id<>v_uid and l.state<>'void';
 end if;
 v_combined:=v_personal+v_partner;
 v_price:=greatest(0,coalesce(v_price,4999));
 v_usable:=least(v_price,v_combined)::integer;
 return jsonb_build_object(
  'enabled',coalesce(v_enabled,false),
  'reward_cad_cents',coalesce(v_amount,500),
  'reward_mode',coalesce(v_mode,'renewal_credit'),
  'code',case when v_enabled then v_link.code else null end,
  'couple_ready',v_link.user_id is not null,
  'pending_count',coalesce(v_pending,0),'paid_count',coalesce(v_paid,0),
  'earned_cad_cents',v_earned,
  'personal_balance_cad_cents',v_personal,
  'partner_balance_cad_cents',v_partner,
  'combined_balance_cad_cents',v_combined,
  'surplus_cad_cents',greatest(0,v_combined-v_usable),
  'available_cad_cents',v_usable,
  'applied_cad_cents',v_applied,
  'annual_renewal_cad_cents',v_price,
  'renewal_due_cad_cents',greatest(0,v_price-v_usable),
  'remaining_to_free_cad_cents',greatest(0,v_price-v_usable),
  'progress_percent',case when v_price=0 then 100 else
   round(v_usable::numeric*100/v_price)::integer end,
  'max_renewal_credit_cad_cents',v_price,
  'reward_referrals_remaining',case when v_amount>0
   then ceil(greatest(0,v_price-v_usable)::numeric/v_amount)::integer
   else null end,
  'payments_connected',false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.love_referral_claim(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if not found or v_ref.user_id=v_uid
 or exists(select 1 from public.couple_members where couple_id=v_new.id and user_id=v_ref.user_id)
 then return jsonb_build_object('status','invalid_or_self');end if;
 insert into public.love_referral_claims(
  referred_couple_id,referrer_couple_id,referrer_user_id,referred_owner_id,
  referral_code,reward_cad_cents,reward_mode)
 values(v_new.id,v_ref.couple_id,v_ref.user_id,v_uid,v_code,v_amount,v_mode)
 on conflict(referred_couple_id) do nothing;
 return jsonb_build_object('status','awaiting_payment');
end;
$function$;

CREATE OR REPLACE FUNCTION public.love_referral_confirm_annual_payment(p_referred_couple uuid, p_payment_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_claim public.love_referral_claims%rowtype;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Serveur de paiement uniquement' using errcode='42501';
 end if;
 if p_payment_reference is null or length(trim(p_payment_reference)) not between 10 and 250 then
  raise exception 'Payment reference invalid' using errcode='22023';
 end if;
 select * into v_claim from public.love_referral_claims
  where referred_couple_id=p_referred_couple for update;
 if not found then return jsonb_build_object('status','no_referral');end if;
 if v_claim.status='earned' then
  if v_claim.annual_payment_ref=p_payment_reference then
   return jsonb_build_object('status','already_earned');end if;
  raise exception 'Annual referral already settled';
 end if;
 if v_claim.status<>'awaiting_payment' then
  return jsonb_build_object('status','void');
 end if;
 if (select count(*) from public.couple_members where couple_id=p_referred_couple)<>2 then
  return jsonb_build_object('status','awaiting_second_partner');end if;
 if exists(select 1 from public.couple_members where couple_id=p_referred_couple and user_id=v_claim.referrer_user_id) then
  raise exception 'Auto-parrainage interdit' using errcode='22023';end if;
 perform 1 from auth.users where id=v_claim.referrer_user_id for update;
 update public.love_referral_claims set status='earned',
  annual_payment_ref=p_payment_reference,paid_at=now(),awarded_at=now()
 where referred_couple_id=p_referred_couple;
 if v_claim.reward_cad_cents>0 then
  insert into public.love_referral_credit_ledger(
   claim_couple_id,beneficiary_couple_id,beneficiary_user_id,
   amount_cad_cents,remaining_cad_cents,mode)
  values(p_referred_couple,v_claim.referrer_couple_id,v_claim.referrer_user_id,
   v_claim.reward_cad_cents,v_claim.reward_cad_cents,v_claim.reward_mode)
  on conflict(claim_couple_id) do nothing;
 end if;
 return jsonb_build_object('status',case when v_claim.reward_cad_cents>0 then
  'credit_recorded' else 'earned_zero' end,
  'awarded_cad_cents',v_claim.reward_cad_cents,
  'owner_user_id',v_claim.referrer_user_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.love_referral_apply_renewal(p_couple_id uuid, p_payment_ref text, p_discount_cad_cents integer, p_promo_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_quote jsonb;v_price integer;v_target integer;
 v_member1 uuid;v_member2 uuid;
 v_balance1 bigint:=0;v_balance2 bigint:=0;
 v_take1 integer:=0;v_take2 integer:=0;
 v_uid uuid;v_wanted integer;v_left integer;v_delta integer;
 v_row record;v_existing public.love_annual_discount_settlements%rowtype;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Serveur de paiement uniquement' using errcode='42501';end if;
 if p_payment_ref is null or length(trim(p_payment_ref)) not between 10 and 250
  or p_discount_cad_cents is null or p_discount_cad_cents<=0 then
  raise exception 'Données de renouvellement invalides' using errcode='22023';end if;
 perform 1 from public.couples where id=p_couple_id for update;
 if not found then raise exception 'Couple introuvable';end if;
 select * into v_existing from public.love_annual_discount_settlements
  where provider_payment_ref=p_payment_ref;
 if found then
  if v_existing.couple_id=p_couple_id and v_existing.discount_kind='referral'
    and v_existing.discount_cad_cents=p_discount_cad_cents then
   return jsonb_build_object('status','already_applied');end if;
  raise exception 'Référence de paiement utilisée pour un autre avantage';
 end if;
 select cm.user_id into v_member1 from public.couple_members cm
  where cm.couple_id=p_couple_id
  order by cm.joined_at,cm.user_id limit 1;
 select cm.user_id into v_member2 from public.couple_members cm
  where cm.couple_id=p_couple_id and cm.user_id<>v_member1
  order by cm.joined_at,cm.user_id limit 1;
 if v_member1 is null then raise exception 'Aucun membre du couple';end if;
 perform 1 from auth.users where id in (v_member1,v_member2) order by id for update;
 select coalesce(sum(remaining_cad_cents),0) into v_balance1
 from public.love_referral_credit_ledger
 where beneficiary_user_id=v_member1 and state='awaiting_application';
 if v_member2 is not null then
  select coalesce(sum(remaining_cad_cents),0) into v_balance2
  from public.love_referral_credit_ledger
  where beneficiary_user_id=v_member2 and state='awaiting_application';
 end if;
 v_quote:=public.love_checkout_discount_calculate(
  p_couple_id,p_promo_code,'annual_renewal');
 v_price:=(v_quote->>'base_cad_cents')::integer;
 v_target:=(v_quote->>'discount_cad_cents')::integer;
 if (v_quote->>'selected_discount_kind')<>'referral'
  or v_target<>p_discount_cad_cents or v_target>v_price
  or v_target>v_balance1+v_balance2 then
  raise exception 'Crédit différent du montant vérifié sur la facture';
 end if;
 v_take1:=least(v_balance1,(v_target+1)/2)::integer;
 v_take2:=least(v_balance2,v_target-v_take1)::integer;
 v_take1:=v_take1+least(v_balance1-v_take1,v_target-v_take1-v_take2)::integer;
 v_take2:=v_take2+least(v_balance2-v_take2,v_target-v_take1-v_take2)::integer;
 if v_take1+v_take2<>v_target then
  raise exception 'Crédits insuffisants';end if;
 insert into public.love_annual_discount_settlements(
  provider_payment_ref,couple_id,audience,discount_kind,discount_cad_cents)
 values(p_payment_ref,p_couple_id,'annual_renewal','referral',v_target);
 for v_uid,v_wanted in
  select v_member1,v_take1 union all select v_member2,v_take2
 loop
  if v_uid is null or v_wanted<=0 then continue;end if;
  v_left:=v_wanted;
  for v_row in
   select id,remaining_cad_cents from public.love_referral_credit_ledger
   where beneficiary_user_id=v_uid and state='awaiting_application'
     and remaining_cad_cents>0 order by created_at,id for update
  loop
   exit when v_left=0;
   v_delta:=least(v_left,v_row.remaining_cad_cents);
   update public.love_referral_credit_ledger
   set remaining_cad_cents=remaining_cad_cents-v_delta,
    state=case when remaining_cad_cents=v_delta then 'applied'
      else 'awaiting_application' end,
    applied_at=case when remaining_cad_cents=v_delta then now()
      else null end,
    application_ref=null
   where id=v_row.id;
   insert into public.love_referral_credit_usage(
    ledger_id,beneficiary_user_id,provider_payment_ref,amount_cad_cents)
   values(v_row.id,v_uid,p_payment_ref,v_delta);
   v_left:=v_left-v_delta;
  end loop;
  if v_left<>0 then raise exception 'Solde disponible modifié';end if;
 end loop;
 return jsonb_build_object('status','applied','discount_cad_cents',v_target,
  'first_partner_deducted_cad_cents',v_take1,
  'second_partner_deducted_cad_cents',v_take2,
  'first_partner_remaining_cad_cents',v_balance1-v_take1,
  'second_partner_remaining_cad_cents',v_balance2-v_take2);
end;
$function$;
