-- LoveRoll: one server-side decision for every new verified account.
-- An invitation for the exact confirmed email ALWAYS takes precedence over
-- creating a new solo owner. The recipient must still accept explicitly.
-- No existing couple, membership, invitations or cards are deleted.
create or replace function public.resolve_love_signup(
  p_create_owner boolean default false
)
returns jsonb
language plpgsql security definer set search_path=''
as $function$
declare
 v_user uuid := auth.uid();
 v_email text;
 v_current uuid;
 v_invitation uuid;
 v_new uuid;
begin
 if v_user is null then raise exception 'Connexion requise'; end if;
 perform public.love_require_verified_identity();
 -- Serialize onboarding decisions by account across devices.
 perform 1 from auth.users where id=v_user for update;
 select lower(trim(u.email)) into v_email
 from auth.users u where u.id=v_user and u.email_confirmed_at is not null;
 if v_email is null then raise exception 'Courriel de connexion non vérifié'; end if;

 select m.couple_id into v_current
 from public.couple_members m where m.user_id=v_user;
 if v_current is not null then
  return jsonb_build_object('status','linked','couple_id',v_current);
 end if;

 -- Only a verified recipient can see their own valid invitation reference.
 -- Verify the inviter still is the one member of the destination couple.
 select i.id into v_invitation
 from public.couple_invitations i
 join public.couples c on c.id=i.couple_id
 where i.invited_email=v_email
   and i.cancelled_at is null
   and i.accepted_at is null
   and i.expires_at>now()
   and c.owner_user_id=i.created_by
   and (select count(*) from public.couple_members m
        where m.couple_id=i.couple_id)=1
   and exists (select 1 from public.couple_members m
               where m.couple_id=i.couple_id and m.user_id=i.created_by)
 order by i.created_at desc, i.id desc
 limit 1;
 if v_invitation is not null then
  return jsonb_build_object('status','invitation','invitation_id',v_invitation);
 end if;

 if not coalesce(p_create_owner,false) then
  return jsonb_build_object('status','new_account');
 end if;

 if not exists (select 1 from public.couple_profiles p
                where p.id=v_user and p.birthday_md is not null) then
  raise exception 'Complétez d’abord votre inscription';
 end if;

 -- Create the solo owner only when there is NO pending invitation.
 v_new := public.create_love_match(null);
 return jsonb_build_object('status','owner','couple_id',v_new);
end;
$function$;
revoke all on function public.resolve_love_signup(boolean)
 from public, anon, authenticated;
grant execute on function public.resolve_love_signup(boolean) to authenticated;