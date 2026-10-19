-- LoveRoll: reset administrateur limité au tirage hebdomadaire du couple.
-- Rien n'est supprimé sans appui explicite et confirmation du créateur.
create table if not exists public.love_weekly_reset_audit (
 id bigint generated always as identity primary key,
 couple_id uuid not null references public.couples(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 week_key date not null,
 prior_roll_id uuid not null,
 prior_face integer not null check(prior_face between 1 and 6),
 reset_at timestamptz not null default now()
);
alter table public.love_weekly_reset_audit enable row level security;
drop policy if exists love_weekly_reset_owner_select on public.love_weekly_reset_audit;
create policy love_weekly_reset_owner_select on public.love_weekly_reset_audit
 for select to authenticated using(
  exists(select 1 from public.couples c
   where c.id=couple_id and c.owner_user_id=(select auth.uid()))
 );
revoke all on table public.love_weekly_reset_audit from public,anon,authenticated;
grant select on table public.love_weekly_reset_audit to authenticated;

create or replace function public.reset_love_weekly_roll_admin(p_couple uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  local_day date;
  v_week date;
  old public.couple_rolls%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise';end if;
  perform 1 from public.couples c
   where c.id=p_couple and c.owner_user_id=auth.uid()
   for update;
  if not found or not couple_private.is_member(p_couple) then
   raise exception 'Reset réservé à l’administrateur du couple';
  end if;

  local_day=(now() at time zone 'America/Toronto')::date;
  v_week=local_day-(extract(isodow from local_day)::integer-1);

  -- A reset after the couple has started playing could invalidate the
  -- official weekly session limit. Block rather than erase their progress.
  if exists (
   select 1 from public.couple_sessions s
   where s.couple_id=p_couple
    and (s.started_at at time zone 'America/Toronto')::date>=v_week
    and (s.started_at at time zone 'America/Toronto')::date<v_week+7
  ) then
   raise exception 'Impossible de réinitialiser : une soirée de cette semaine a déjà commencé. Les sessions et défis doivent être préservés.';
  end if;

  select * into old from public.couple_rolls r
   where r.couple_id=p_couple and r.kind='weekly'
    and r.key=to_char(v_week,'YYYY-MM-DD')
   for update;
  if not found then return false;end if;

  delete from public.couple_rolls where id=old.id;

  insert into public.love_weekly_reset_audit(
   couple_id,actor_id,week_key,prior_roll_id,prior_face)
  values(p_couple,auth.uid(),v_week,old.id,old.face);

  insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(p_couple,'roll',auth.uid(),'Réinitialisation admin du tirage hebdomadaire');
  return true;
end;$$;
revoke all on function public.reset_love_weekly_roll_admin(uuid) from public,anon,authenticated;
grant execute on function public.reset_love_weekly_roll_admin(uuid) to authenticated;
