-- Permet au créateur du couple de réinitialiser le D6 hebdomadaire,
-- même après le démarrage d'une soirée, SANS toucher aux soirées ni aux défis.
-- Sérialisation des reset et des tirages avec le même verrou du couple.
create or replace function public.reset_love_weekly_roll_admin(p_couple uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  local_day date;
  v_week date;
  old public.couple_rolls%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  -- L'administrateur est le propriétaire du couple ET un membre confirmé.
  -- Le verrou est le même que celui pris par roll_couple_once().
  perform 1 from public.couples c
   where c.id=p_couple and c.owner_user_id=auth.uid()
   for update;
  if not found or not couple_private.is_member(p_couple) then
    raise exception 'Reset réservé à l’administrateur du couple';
  end if;

  local_day=(now() at time zone 'America/Toronto')::date;
  v_week=local_day-(extract(isodow from local_day)::integer-1);

  -- Aucun contrôle sur couple_sessions ici : le reset forcé doit fonctionner
  -- même si la soirée est déjà commencée ou terminée.
  select * into old from public.couple_rolls r
   where r.couple_id=p_couple and r.kind='weekly'
    and r.key=to_char(v_week,'YYYY-MM-DD')
   for update;
  if not found then
    return false;
  end if;

  -- Une seule suppression ciblée : le résultat officiel du D6 de cette semaine.
  -- Aucun effacement de couple_sessions, couple_personal_rolls ou des défis.
  delete from public.couple_rolls where id=old.id;

  insert into public.love_weekly_reset_audit(
   couple_id,actor_id,week_key,prior_roll_id,prior_face)
  values(p_couple,auth.uid(),v_week,old.id,old.face);

  insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(p_couple,'roll',auth.uid(),
   'Reset administrateur du D6 hebdomadaire (soirées et défis conservés)');
  return true;
end;$$;

revoke all on function public.reset_love_weekly_roll_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.reset_love_weekly_roll_admin(uuid)
  to authenticated;
