CREATE TABLE IF NOT EXISTS public.love_push_native_devices(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 device_token text not null unique,
 platform text not null default 'android' check(platform='android'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS love_push_native_by_user ON public.love_push_native_devices(user_id);
ALTER TABLE public.love_push_native_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY love_push_native_own ON public.love_push_native_devices
 FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id)
 WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY loveroll_confirmed_email_required ON public.love_push_native_devices AS RESTRICTIVE
 FOR ALL TO authenticated USING ((SELECT public.love_verified_identity()))
 WITH CHECK ((SELECT public.love_verified_identity()));
REVOKE ALL ON public.love_push_native_devices FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.love_push_native_devices TO authenticated;
