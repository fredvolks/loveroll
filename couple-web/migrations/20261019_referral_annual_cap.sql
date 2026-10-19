-- Referral credits must never exceed the price of ONE annual LoveRoll renewal.
-- Each referral is attached to the couple (links belong to individual partners).
-- This cap is enforced atomically on signed-payment settlement, never by browser input.
-- Already-applied renewal credits are not counted toward the NEXT renewal.
create or replace function public.love_referral_confirm_annual_payment(
 p_referred_couple uuid,p_payment_reference text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_claim public.love_referral_claims%rowtype;
 v_count integer;
 v_price integer;
 v_unspent bigint;
 v_award integer;
begin
 if p_payment_reference is null
  or length(trim(p_payment_reference)) not between 10 and 250 then
  raise exception 'Payment reference invalid';
 end if;
 -- Serialization per destination couple prevents concurrent paid referrals
 -- from stacking more than one renewal's worth of credits.
 select * into v_claim from public.love_referral_claims
  where referred_couple_id=p_referred_couple for update;
 if not found then return jsonb_build_object('status','no_referral');end if;
 if v_claim.status='earned' then
  if v_claim.annual_payment_ref=p_payment_reference then
   return jsonb_build_object('status','already_earned');
  end if;
  raise exception 'Annual referral already settled';
 end if;
 if v_claim.status<>'awaiting_payment' then
  return jsonb_build_object('status','void');
 end if;
 select count(*) into v_count from public.couple_members
 where couple_id=p_referred_couple;
 if v_count<>2 then
  return jsonb_build_object('status','awaiting_second_partner');
 end if;
 -- The following lock protects all claims benefiting the same couple.
 perform 1 from public.couples where id=v_claim.referrer_couple_id for update;
 if not found then raise exception 'Referrer duo missing';end if;
 select annual_base_cad_cents into v_price from public.love_platform_settings where id=1;
 if v_price is null then raise exception 'Missing annual price';end if;
 select coalesce(sum(amount_cad_cents),0) into v_unspent
 from public.love_referral_credit_ledger
 where beneficiary_couple_id=v_claim.referrer_couple_id
 and state='awaiting_application';
 v_award:=least(v_claim.reward_cad_cents,greatest(0,v_price-v_unspent));
 update public.love_referral_claims set
  status='earned', annual_payment_ref=p_payment_reference,
  paid_at=now(),awarded_at=now()
 where referred_couple_id=p_referred_couple;
 if v_award>0 then
  insert into public.love_referral_credit_ledger
    (claim_couple_id,beneficiary_couple_id,amount_cad_cents,mode)
  values(p_referred_couple,v_claim.referrer_couple_id,v_award,v_claim.reward_mode)
  on conflict(claim_couple_id) do nothing;
 end if;
 return jsonb_build_object('status',case when v_award>0 then 'credit_recorded' else 'renewal_cap_reached' end,
  'awarded_cad_cents',v_award,'annual_cap_cad_cents',v_price,
  'remaining_cad_cents',greatest(0,v_price-v_unspent-v_award));
end;
$$;
revoke all on function public.love_referral_confirm_annual_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.love_referral_confirm_annual_payment(uuid,text) to service_role;

-- Account-specific share link; couples see a real-time progress snapshot.
-- Read-only; never accepts "amount" from an authenticated client.
create or replace function public.love_my_referral()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_couple uuid;
 v_link public.love_referral_links%rowtype;
 v_enabled boolean;v_amount integer;v_mode text;v_annual_price integer;
 v_pending integer;v_paid integer;v_paid_total bigint;
 v_unspent bigint;v_applied bigint;v_credit integer;v_remaining integer;
begin
 perform public.love_require_verified_identity();
 select referral_enabled,referral_reward_cad_cents,referral_reward_mode,annual_base_cad_cents
 into v_enabled,v_amount,v_mode,v_annual_price
 from public.love_platform_settings where id=1;
 select cm.couple_id into v_couple from public.couple_members cm
 where cm.user_id=v_uid order by cm.joined_at desc limit 1;
 if v_couple is not null and not couple_private.is_member(v_couple)
 then v_couple:=null;end if;
 if v_couple is not null and v_enabled then
  select * into v_link from public.love_referral_links where user_id=v_uid;
  if v_link.user_id is null or v_link.couple_id<>v_couple then
   insert into public.love_referral_links(user_id,couple_id,code)
   values(v_uid,v_couple,encode(extensions.gen_random_bytes(12),'hex'))
   on conflict(user_id) do update set couple_id=excluded.couple_id,
    code=excluded.code,created_at=now()
   returning * into v_link;
  end if;
 end if;
 select count(*) filter(where status='awaiting_payment'),
        count(*) filter(where status='earned'),
        coalesce(sum(reward_cad_cents) filter(where status='earned'),0)
 into v_pending,v_paid,v_paid_total
 from public.love_referral_claims where referrer_couple_id=v_couple;
 select coalesce(sum(amount_cad_cents) filter(where state='awaiting_application'),0),
        coalesce(sum(amount_cad_cents) filter(where state='applied'),0)
 into v_unspent,v_applied
 from public.love_referral_credit_ledger where beneficiary_couple_id=v_couple;
 v_annual_price:=greatest(0,coalesce(v_annual_price,4999));
 v_credit:=least(v_annual_price,coalesce(v_unspent,0));
 v_remaining:=greatest(0,v_annual_price-v_credit);
 return jsonb_build_object(
  'enabled',coalesce(v_enabled,false),
  'reward_cad_cents',coalesce(v_amount,500),
  'reward_mode',coalesce(v_mode,'renewal_credit'),
  'code',case when v_enabled and v_couple is not null then v_link.code else null end,
  'couple_ready',v_couple is not null,
  'pending_count',coalesce(v_pending,0),
  'paid_count',coalesce(v_paid,0),
  'earned_cad_cents',v_credit,
  'available_cad_cents',v_credit,
  'applied_cad_cents',coalesce(v_applied,0),
  'annual_renewal_cad_cents',v_annual_price,
  'renewal_due_cad_cents',v_remaining,
  'remaining_to_free_cad_cents',v_remaining,
  'progress_percent',case when v_annual_price=0 then 100
   else round(v_credit::numeric*100/v_annual_price)::integer end,
  'max_renewal_credit_cad_cents',v_annual_price,
  'reward_referrals_remaining',case when v_amount>0
   then ceil(v_remaining::numeric/v_amount)::integer else null end,
  'payments_connected',false
 );
end;
$$;
revoke all on function public.love_my_referral() from public,anon;
grant execute on function public.love_my_referral() to authenticated;

create or replace function public.love_my_referral_credits()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_couple uuid;v_credit bigint;v_applied bigint;v_price integer;
begin
 perform public.love_require_verified_identity();
 select cm.couple_id into v_couple from public.couple_members cm
 where cm.user_id=auth.uid() order by cm.joined_at desc limit 1;
 if v_couple is null or not couple_private.is_member(v_couple) then
  return jsonb_build_object('earned_cad_cents',0,'available_cad_cents',0,'applied_cad_cents',0);
 end if;
 select coalesce(sum(amount_cad_cents) filter(where state='awaiting_application'),0),
        coalesce(sum(amount_cad_cents) filter(where state='applied'),0)
 into v_credit,v_applied from public.love_referral_credit_ledger
 where beneficiary_couple_id=v_couple;
 select annual_base_cad_cents into v_price from public.love_platform_settings where id=1;
 return jsonb_build_object(
  'earned_cad_cents',least(coalesce(v_price,4999),v_credit),
  'available_cad_cents',least(coalesce(v_price,4999),v_credit),
  'applied_cad_cents',v_applied
 );
end;
$$;
revoke all on function public.love_my_referral_credits() from public,anon;
grant execute on function public.love_my_referral_credits() to authenticated;
