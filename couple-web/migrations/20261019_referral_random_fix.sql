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