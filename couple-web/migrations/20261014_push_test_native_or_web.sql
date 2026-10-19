-- Maintained in Supabase: test notification works for either PWA Web Push or native FCM.
-- This function requires a Supabase-confirmed email and a registered device.
CREATE OR REPLACE FUNCTION public.love_push_test_me()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE actor uuid:=auth.uid(); request_id bigint; chosen_kind text;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT CASE WHEN p.weekly THEN 'weekly'
             WHEN p.invitation THEN 'invitation'
             WHEN p.monthly THEN 'monthly'
             WHEN p.special THEN 'special'
             ELSE NULL END
 INTO chosen_kind
 FROM public.love_push_preferences p WHERE p.user_id=actor AND p.enabled;
 IF chosen_kind IS NULL THEN
  RAISE EXCEPTION 'Activez au moins une catégorie de notifications.';
 END IF;
 IF NOT (EXISTS(SELECT 1 FROM public.love_push_subscriptions WHERE user_id=actor)
         OR EXISTS(SELECT 1 FROM public.love_push_native_devices WHERE user_id=actor)) THEN
  RAISE EXCEPTION 'Enregistrez cet appareil avant de demander une notification.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.love_push_outbox WHERE user_id=actor
  AND event_key LIKE 'test:%' AND created_at>now()-interval '5 minutes') THEN
  RAISE EXCEPTION 'Attendez 5 minutes avant un autre test.';
 END IF;
 INSERT INTO public.love_push_outbox(user_id,event_key,kind,title,body)
 VALUES(actor,'test:'||gen_random_uuid()::text,chosen_kind,
  'LoveRoll ♡ Notification de test','Votre connexion aux notifications fonctionne.');
 SELECT net.http_post(
  url:='https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/love-push-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','x-loveroll-dispatch',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='loveroll_push_dispatch_token')),
  body:='{}'::jsonb,timeout_milliseconds:=15000
 ) INTO request_id;
 RETURN request_id IS NOT NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.love_push_test_me() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.love_push_test_me() TO authenticated;
