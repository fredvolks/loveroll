-- A new paying couple may complete checkout before connecting their second partner.
create or replace function public.love_referral_confirm_annual_payment(
 p_referred_couple uuid,p_payment_reference text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_claim public.love_referral_claims%rowtype;
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
 -- An annual checkout may happen before the invited second partner joins.
 -- The newly created, verified paying duo account qualifies once its
 -- FIRST annual payment is verified; credits remain limited to one per duo.
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
