-- LoveRoll 2026: one official Advent opening per current day and couple.
-- Preserves every previously recorded December opening and all uploaded JSON.
-- No destructive migration or client-side trust of the phone clock.
create or replace function public.love_advent_server_date()
returns date language sql stable security definer set search_path='' as $$
 select (now() at time zone 'America/Toronto')::date
$$;
revoke all on function public.love_advent_server_date() from public,anon,authenticated;
grant execute on function public.love_advent_server_date() to authenticated;

create or replace function public.open_advent_day(p_couple uuid,p_day integer)
returns public.couple_advent language plpgsql security definer set search_path='' as $$
declare
 d date;
 rowout public.couple_advent%rowtype;
 partner uuid;
 custom public.love_advent_2026_days%rowtype;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';
 end if;
 d:=(now() at time zone 'America/Toronto')::date;
 -- The old RPC allowed opening ALL past missing days. The new rule requires
 -- exactly today's single door (December 1–25), never missed/future days.
 if extract(month from d)::int<>12
   or extract(day from d)::int>25
   or p_day is distinct from extract(day from d)::int then
  raise exception 'Seule la case du jour peut être ouverte (heure du Québec)';
 end if;
 -- Serialize competing calls from both partners on the SAME couple row.
 perform 1 from public.couples where id=p_couple for update;
 if not found then raise exception 'Couple introuvable';end if;
 select * into rowout from public.couple_advent
  where couple_id=p_couple and year=extract(year from d)::int and day=p_day;
 if found then return rowout;end if;
 select user_id into partner from public.couple_members
  where couple_id=p_couple order by random() limit 1;
 if extract(year from d)::int=2026 then
  select * into custom from public.love_advent_2026_days
   where couple_id=p_couple and day=p_day;
 end if;
 insert into public.couple_advent(
  couple_id,year,day,opened_by,performed_by,
  advent_type,advent_title,advent_description,advent_timer_minutes)
 values(p_couple,extract(year from d)::int,p_day,auth.uid(),partner,
  custom.type,custom.title,custom.description,custom.timer_minutes)
 returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'advent',auth.uid(),'Surprise du '+p_day::text+' décembre ouverte');
 return rowout;
end;$$;
revoke all on function public.open_advent_day(uuid,integer) from public,anon,authenticated;
grant execute on function public.open_advent_day(uuid,integer) to authenticated;
