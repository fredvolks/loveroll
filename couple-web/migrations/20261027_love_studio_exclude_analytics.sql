-- LoveRoll Studio • exclude sandbox users/couples from platform metrics.
-- Source was the existing audited function as of 2026-10-27. Apply after sandbox tables.
CREATE OR REPLACE FUNCTION public.love_platform_admin_read()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.love_platform_is_admin() then raise exception 'Accès à la console interdit' using errcode='42501';end if;
 select jsonb_build_object(
 'config',(select to_jsonb(s)-'updated_by' from public.love_platform_settings s where s.id=1),
 'stats',jsonb_build_object(
  'registered_users',(select count(*) from auth.users u
   where u.raw_app_meta_data->>'love_studio_test' IS DISTINCT FROM 'true'
     and not exists(select 1 from public.love_studio_test_seats s where s.user_id=u.id)),
  'couples',(select count(*) from (select cm.couple_id from public.couple_members cm group by cm.couple_id having count(distinct cm.user_id)=2) paired where not exists(select 1 from public.love_studio_test_pools t where t.couple_id=paired.couple_id)),
  'monthly_draws',(select count(*) from public.couple_rolls r where r.kind='monthly_activity' and not exists(select 1 from public.love_studio_test_pools t where t.couple_id=r.couple_id)),
  'geo_ready',(select count(*) from public.love_monthly_places x where x.state='ready' and not exists(select 1 from public.love_studio_test_pools t where t.couple_id=x.couple_id)),
  'geo_pending',(select count(*) from public.love_monthly_places x where x.state='pending' and not exists(select 1 from public.love_studio_test_pools t where t.couple_id=x.couple_id)),
  'geo_unavailable',(select count(*) from public.love_monthly_places x where x.state='unavailable' and not exists(select 1 from public.love_studio_test_pools t where t.couple_id=x.couple_id)),
  'bookings',(select count(*) from public.love_monthly_reservations x where x.status='confirmed' and not exists(select 1 from public.love_studio_test_pools t where t.couple_id=x.couple_id)),
  'paid_grants',(select count(*) from public.love_monthly_paid_entitlements x where not exists(select 1 from public.love_studio_test_pools t where t.couple_id=x.couple_id))
 ),
 'experiences',(select coalesce(jsonb_agg(to_jsonb(e) order by e.face),'[]'::jsonb) from public.love_world_experiences e),
 'audit',(select coalesce(jsonb_agg(to_jsonb(a) order by a.changed_at desc),'[]'::jsonb)
  from (select changed_at,patch from public.love_platform_admin_audit order by changed_at desc limit 12)a)
 ) into result;
 return result;
end;
$function$

