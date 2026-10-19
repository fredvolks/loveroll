-- LoveRoll: secure, idempotent invitation completion.
-- The URL UUID is NOT proof of identity: Supabase-authenticated confirmed email
-- must match the invitation recipient for both fresh and retried requests.
create or replace function public.accept_love_match_by_id(p_invitation uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_hash text;
 v_email text;
 v_expected text;
 v_couple uuid;
 v_accepted timestamptz;
 v_cancelled timestamptz;
 v_expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select lower(email) into v_email
 from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then raise exception 'Courriel de connexion non vérifié'; end if;
 select i.token_hash,lower(i.invited_email),i.couple_id,
        i.accepted_at,i.cancelled_at,i.expires_at
   into v_hash,v_expected,v_couple,v_accepted,v_cancelled,v_expiry
 from public.couple_invitations i where i.id=p_invitation for update;
 if not found or v_cancelled is not null then
  raise exception 'Invitation expirée, annulée ou déjà acceptée';
 end if;
 if v_email<>v_expected then
  raise exception 'Cette invitation est destinée à un autre courriel. Connectez-vous au bon compte.';
 end if;
 -- A network retry after a committed transaction returns the same match.
 -- Nothing is inserted twice, and no other couple can be accepted.
 if v_accepted is not null then
  if exists (select 1 from public.couple_members
    where couple_id=v_couple and user_id=auth.uid())
  then return v_couple; end if;
  raise exception 'Invitation déjà utilisée ou couple incompatible';
 end if;
 if v_expiry<=now() then raise exception 'Invitation expirée'; end if;
 return public.accept_love_match(v_hash);
end;$$;
revoke all on function public.accept_love_match_by_id(uuid) from public,anon,authenticated;
grant execute on function public.accept_love_match_by_id(uuid) to authenticated;
