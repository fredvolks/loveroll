-- Trigger sends challenge alerts immediately via pg_net; cron remains fallback.
create or replace function public.love_push_on_challenge_created()
returns trigger language plpgsql security definer set search_path = ''
as $body$
declare inserted_count integer := 0;
begin
 if new.recipient is not null and new.recipient is distinct from new.offered_by then
  insert into public.love_push_outbox (user_id,event_key,kind,title,body)
  select new.recipient, 'challenge:' || new.id::text, 'challenge',
   'LoveRoll ♡ Nouveau défi',
   'Un défi de votre partenaire vous attend dans LoveRoll.'
  from public.love_push_preferences p
  where p.user_id=new.recipient and p.enabled and p.challenge
  on conflict (user_id,event_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
   begin
    perform net.http_post(
     url:='https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/love-push-dispatch',
     headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-loveroll-dispatch',
      (select decrypted_secret from vault.decrypted_secrets
       where name='loveroll_push_dispatch_token' limit 1)),
     body:='{}'::jsonb,
     timeout_milliseconds:=15000);
   exception when others then
    -- Never disrupt challenge saving; the scheduled dispatcher is backup.
    null;
   end;
  end if;
 end if;
 return new;
end;
$body$;
revoke all on function public.love_push_on_challenge_created() from public,anon,authenticated;
