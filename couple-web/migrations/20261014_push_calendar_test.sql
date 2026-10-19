-- Calendar reminders and immediate end-to-end test, all opt-in.
create or replace function public.love_push_enqueue_calendar()
returns integer language plpgsql security definer set search_path to ''
as $$
declare local_now timestamp:=now() at time zone 'America/Toronto'; n integer:=0; row_count int;
begin
 if local_now::time not between time '09:00' and time '09:20' then return 0;end if;
 if extract(day from local_now)=1 then
  insert into public.love_push_outbox(user_id,event_key,kind,title,body)
  select p.user_id,'monthly:'||to_char(local_now,'YYYY-MM'),
  'monthly','LoveRoll ✨ Votre activité du mois vous attend',
  'Un nouveau mois de surprises commence. Ouvrez LoveRoll.'
  from public.love_push_preferences p where p.enabled and p.monthly
  and exists(select 1 from public.couple_members m where m.user_id=p.user_id
    and (select count(*) from public.couple_members m2 where m2.couple_id=m.couple_id)=2)
  on conflict(user_id,event_key) do nothing;
  get diagnostics row_count=row_count;n:=n+row_count;
 end if;
 insert into public.love_push_outbox(user_id,event_key,kind,title,body)
 select p.user_id,'special:'||to_char(local_now,'YYYY-MM-DD')||':'||event.key,
 'special','LoveRoll ♥ Une date spéciale aujourd’hui',
 'Une surprise à deux vous attend dans LoveRoll.'
 from public.love_special_event_catalogue c
 cross join lateral jsonb_each(coalesce(c.events->'evenements_speciaux','{}'::jsonb)) as event(key,value)
 join public.couple_members m on m.couple_id=c.couple_id
 join public.love_push_preferences p on p.user_id=m.user_id
 where p.enabled and p.special
 and (select count(*) from public.couple_members m2 where m2.couple_id=c.couple_id)=2
 and coalesce(event.value->>'date','') ~ '^\\d{4}-\\d{2}-\\d{2}$'
 and substring(event.value->>'date' from 6 for 5)=to_char(local_now,'MM-DD')
 on conflict(user_id,event_key) do nothing;
 get diagnostics row_count=row_count;n:=n+row_count;
 return n;
end;$$;
revoke all on function public.love_push_enqueue_calendar() from public,anon,authenticated;
grant execute on function public.love_push_enqueue_calendar() to service_role;

create or replace function public.love_push_test_me()
returns boolean language plpgsql security definer set search_path to ''
as $$
declare actor uuid:=auth.uid(); request_id bigint;
begin
 if actor is null then raise exception 'Connexion requise';end if;
 if not exists(select 1 from public.love_push_preferences where user_id=actor and enabled)
 or not exists(select 1 from public.love_push_subscriptions where user_id=actor)
 then raise exception 'Activez les notifications sur cet appareil d’abord';end if;
 if exists(select 1 from public.love_push_outbox where user_id=actor
    and kind='weekly' and event_key like 'test:%' and created_at>now()-interval '5 minutes')
 then raise exception 'Attendez 5 minutes avant un autre test';end if;
 insert into public.love_push_outbox(user_id,event_key,kind,title,body)
 values(actor,'test:'||gen_random_uuid()::text,'weekly',
  'LoveRoll ❤️ Notification de test','Votre connexion aux notifications fonctionne!');
 select net.http_post(
  url:='https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/love-push-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','x-loveroll-dispatch',
   (select decrypted_secret from vault.decrypted_secrets where name='loveroll_push_dispatch_token')),
  body:='{}'::jsonb,timeout_milliseconds:=15000
 ) into request_id;
 return request_id is not null;
end;$$;
revoke all on function public.love_push_test_me() from public,anon;
grant execute on function public.love_push_test_me() to authenticated;
