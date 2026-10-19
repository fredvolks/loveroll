-- Only actual two-member duos should count as active; keep orphan historical data intact.
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
  'registered_users',(select count(*) from auth.users),
  'couples',(select count(*) from (select cm.couple_id from public.couple_members cm group by cm.couple_id having count(distinct cm.user_id)=2) paired),
  'monthly_draws',(select count(*) from public.couple_rolls where kind='monthly_activity'),
  'geo_ready',(select count(*) from public.love_monthly_places where state='ready'),
  'geo_pending',(select count(*) from public.love_monthly_places where state='pending'),
  'geo_unavailable',(select count(*) from public.love_monthly_places where state='unavailable'),
  'bookings',(select count(*) from public.love_monthly_reservations where status='confirmed'),
  'paid_grants',(select count(*) from public.love_monthly_paid_entitlements)
 ),
 'experiences',(select coalesce(jsonb_agg(to_jsonb(e) order by e.face),'[]'::jsonb) from public.love_world_experiences e),
 'audit',(select coalesce(jsonb_agg(to_jsonb(a) order by a.changed_at desc),'[]'::jsonb)
  from (select changed_at,patch from public.love_platform_admin_audit order by changed_at desc limit 12)a)
 ) into result;
 return result;
end;
$function$

