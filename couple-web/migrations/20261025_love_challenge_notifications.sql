-- Opt-in notifications for newly received challenges, without private card data.
alter table public.love_push_preferences add column if not exists challenge boolean not null default true;
alter table public.love_push_outbox drop constraint if exists love_push_outbox_kind_check;
alter table public.love_push_outbox add constraint love_push_outbox_kind_check check (kind in ('weekly','invitation','monthly','special','challenge'));
create or replace function public.love_push_on_challenge_created()
returns trigger language plpgsql security definer set search_path = ''
as $body$
begin
 if new.recipient is not null and new.recipient is distinct from new.offered_by then
  insert into public.love_push_outbox (user_id,event_key,kind,title,body)
  select new.recipient,'challenge:'||new.id::text,'challenge',
  'LoveRoll ♡ Nouveau défi','Un défi de votre partenaire vous attend dans LoveRoll.'
  from public.love_push_preferences p
  where p.user_id=new.recipient and p.enabled and p.challenge
  on conflict (user_id,event_key) do nothing;
 end if;
 return new;
end;
$body$;
revoke all on function public.love_push_on_challenge_created() from public,anon,authenticated;
drop trigger if exists love_push_challenge_created on public.couple_challenges;
create trigger love_push_challenge_created after insert on public.couple_challenges
for each row execute function public.love_push_on_challenge_created();
