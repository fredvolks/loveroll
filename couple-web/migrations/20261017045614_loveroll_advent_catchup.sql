-- An Advent letter unlocks on its full Toronto date and never expires.
-- Existing snapshots, imports, RLS and the (couple_id,year,day) key are retained.
create or replace function public.open_advent_day(p_couple uuid,p_day integer,p_year integer)
returns public.couple_advent language plpgsql security definer set search_path='' as $$
declare
 d date;
 available_on date;
 rowout public.couple_advent%rowtype;
 partner uuid;
 custom public.love_advent_2026_days%rowtype;
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé' using errcode='42501';
 end if;
 if p_day is null or p_day<1 or p_day>25 or p_year is null or p_year<2026 or p_year>32767 then
  raise exception 'Date de calendrier invalide' using errcode='22023';
 end if;
 available_on:=make_date(p_year,12,p_day);
 -- Use the same authoritative clock supplied to both clients, never a phone date.
 d:=public.love_advent_server_date();
 -- Serialize both partners, including simultaneous attempts on the same letter.
 perform 1 from public.couples where id=p_couple for update;
 if not found then raise exception 'Couple introuvable';end if;
 if not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé' using errcode='42501';
 end if;
 select * into rowout from public.couple_advent
  where couple_id=p_couple and year=p_year and day=p_day;
 if found then return rowout;end if;
 if available_on>d then
  raise exception 'Cette lettre sera disponible le % (heure du Québec)',available_on using errcode='22023';
 end if;
 select user_id into partner from public.couple_members
  where couple_id=p_couple order by random() limit 1;
 if p_year=2026 then
  select * into custom from public.love_advent_2026_days
   where couple_id=p_couple and day=p_day;
 end if;
 insert into public.couple_advent(
  couple_id,year,day,opened_by,performed_by,
  advent_type,advent_title,advent_description,advent_timer_minutes)
 values(p_couple,p_year,p_day,auth.uid(),partner,
  custom.type,custom.title,custom.description,custom.timer_minutes)
 returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'advent',auth.uid(),'Surprise du '||p_day::text||' décembre '||p_year::text||' ouverte');
 return rowout;
end;$$;
revoke all on function public.open_advent_day(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.open_advent_day(uuid,integer,integer) to authenticated;

-- Existing installed clients keep their two-argument RPC. New clients send year.
create or replace function public.open_advent_day(p_couple uuid,p_day integer)
returns public.couple_advent language sql security definer set search_path='' as $$
 select public.open_advent_day(p_couple,p_day,extract(year from public.love_advent_server_date())::integer)
$$;
revoke all on function public.open_advent_day(uuid,integer) from public,anon,authenticated;
grant execute on function public.open_advent_day(uuid,integer) to authenticated;

notify pgrst,'reload schema';
