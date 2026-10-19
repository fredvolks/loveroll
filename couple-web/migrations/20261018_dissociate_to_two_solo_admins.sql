-- LoveRoll: when either member voluntarily dissociates a full duo, give EACH
-- person a fresh private solo space they own. Shared data stays in the old
-- archived couple; the existing end_love_match snapshots personal journals
-- and the former owner's customized library before detaching memberships.
-- No auth user, shared challenge, historical roll or session is deleted.
-- This function only runs after a confirmed action in the app.
create or replace function public.dissociate_love_to_solo(p_couple uuid)
returns uuid
language plpgsql security definer set search_path=''
as $function$
declare
 v_actor uuid := auth.uid();
 v_people uuid[];
 v_user uuid;
 v_solo uuid;
 v_actor_solo uuid;
 v_birthday text;
begin
 perform public.love_require_verified_identity();
 if v_actor is null or p_couple is null then
  raise exception 'Connexion et duo requis';
 end if;
 -- Serialize both devices and any invitation/creation operations.
 perform 1 from public.couples where id=p_couple for update;
 if not found then raise exception 'Duo introuvable'; end if;

 select array_agg(m.user_id order by m.user_id)
 into v_people from public.couple_members m where m.couple_id=p_couple;
 if coalesce(array_length(v_people,1),0)<>2
    or not v_actor=any(v_people) then
  raise exception 'Seul un membre d’un duo complet peut le dissocier';
 end if;
 if exists (
  select 1 from unnest(v_people) as member(user_id)
  left join public.couple_profiles p on p.id=member.user_id
  where p.id is null or p.birthday_md is null
 ) then raise exception 'Un profil du duo doit être complété'; end if;

 -- Existing trusted function retains shared history, copies authors' private
 -- journal entries and archives the old owner's custom cards before unlinking.
 perform public.end_love_match(p_couple);

 foreach v_user in array v_people loop
  -- Every new solo duo is privately owned by that very user. Membership's
  -- restoration trigger rehydrates their archived PERSONAL library, if any.
  insert into public.couples(owner_user_id)
  values (v_user) returning id into v_solo;
  insert into public.couple_members(couple_id,user_id)
  values (v_solo,v_user);
  select p.birthday_md into v_birthday
  from public.couple_profiles p where p.id=v_user;
  insert into public.couple_occasion_settings(couple_id,birthday_by_user)
  values(v_solo,jsonb_build_object(v_user::text,v_birthday));
  if v_user=v_actor then v_actor_solo:=v_solo; end if;
 end loop;

 if v_actor_solo is null then
  raise exception 'Dissociation annulée : impossible de créer votre espace';
 end if;
 return v_actor_solo;
end;
$function$;

revoke all on function public.dissociate_love_to_solo(uuid)
 from public, anon, authenticated;
grant execute on function public.dissociate_love_to_solo(uuid) to authenticated;
