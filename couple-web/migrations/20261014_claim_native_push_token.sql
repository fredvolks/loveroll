CREATE OR REPLACE FUNCTION public.love_claim_native_push_token(p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF length(p_token) < 50 OR length(p_token) > 4096 OR p_token ~ '[^a-zA-Z0-9_:\-]' THEN
  RAISE EXCEPTION 'Jeton Firebase invalide';
 END IF;
 INSERT INTO public.love_push_native_devices(user_id,device_token)
 VALUES (auth.uid(),p_token)
 ON CONFLICT (device_token)
 DO UPDATE SET user_id=excluded.user_id,updated_at=now();
 RETURN true;
END;$$;
REVOKE ALL ON FUNCTION public.love_claim_native_push_token(text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.love_claim_native_push_token(text) TO authenticated;
