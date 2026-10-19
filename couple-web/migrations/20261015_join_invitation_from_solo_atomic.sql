-- LoveRoll: a correctly invited, verified user may already own an unused solo space.
-- Move only that user's ONE-member solo membership into their legitimate invitation.
-- Entire change is one PostgreSQL transaction; failures roll back the old membership
-- and all backup/snapshot changes. No direct table mutation from the browser.
create or replace function public.join_love_invitation_from_solo(p_invitation uuid)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := auth.uid();
 v_email text;
 v_inv public.couple_invitations%rowtype;
 v_old uuid;
 v_old_count integer;
 v_member_count integer;
 v_old_owner uuid;
 v_target_count integer;
begin
 if v_user is null then raise exception 'Connexion requise'; end if;
 perform public.love_require_verified_identity();
 select lower(trim(u.email)) into v_email
 from auth.users u where u.id=v_user and u.email_confirmed_at is not null;
 if v_email is null then raise exception 'Courriel de connexion non vérifié'; end if;

 select * into v_inv from public.couple_invitations i
 where i.id=p_invitation for update;
 if not found or v_inv.cancelled_at is not null
    or v_inv.expires_at<=now() then
  raise exception 'Invitation expirée ou annulée. Demandez un nouveau lien.';
 end if;
 if v_email<>lower(trim(v_inv.invited_email)) then
  raise exception 'Cette invitation est destinée à un autre courriel. Connectez-vous au bon compte.';
 end if;

 select count(*),(array_agg(m.couple_id))[1] into v_member_count,v_old
 from public.couple_members m where m.user_id=v_user;
 if v_member_count=0 then
  return public.accept_love_match_by_id(p_invitation);
 end if;
 if v_member_count<>1 then
  raise exception 'Plusieurs espaces sont associés à ce compte : contactez le soutien.';
 end if;
 if v_old=v_inv.couple_id then
  if v_inv.accepted_at is not null then return v_old; end if;
  raise exception 'Ce compte est déjà membre du couple de cette invitation.';
 end if;
 if v_inv.accepted_at is not null then
  raise exception 'Cette invitation a déjà été acceptée.';
 end if;

 -- Lock and check both spaces before changing anything.
 perform 1 from public.couples c
 where c.id in (v_old,v_inv.couple_id)
 order by c.id for update;
 select c.owner_user_id into v_old_owner
 from public.couples c where c.id=v_old;
 select count(*) into v_old_count
 from public.couple_members m where m.couple_id=v_old;
 if v_old_owner is distinct from v_user or v_old_count<>1 then
  raise exception 'Votre espace actuel contient déjà un couple. Dissociez-le volontairement avant de rejoindre un autre.';
 end if;
 select count(*) into v_target_count
 from public.couple_members m where m.couple_id=v_inv.couple_id;
 if v_target_count<>1 then
  raise exception 'Le couple invité n’est plus disponible ou est déjà complet.';
 end if;

 -- Existing trusted function archives custom cards and personal intimate
 -- history, expires former solo invites, then removes former memberships.
 -- The new invited account receives no automatic copy of private solo cards.
 perform public.end_love_match(v_old);
 return public.accept_love_match_by_id(p_invitation);
end;
$$;
revoke all on function public.join_love_invitation_from_solo(uuid) from public,anon,authenticated;
grant execute on function public.join_love_invitation_from_solo(uuid) to authenticated;
