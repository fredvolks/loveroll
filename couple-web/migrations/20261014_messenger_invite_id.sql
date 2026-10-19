-- LoveRoll / Messenger -> Chrome handoff.
-- UUID in ?invite_id= is not a secret. It must NEVER authorize a match alone.
-- Acceptance requires a signed-in user with a verified email equal to the
-- invitation's intended recipient. Existing hash links remain supported.
create or replace function public.accept_love_match_by_id(p_invitation uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_hash text;
 v_email text;
 v_expected text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select lower(email) into v_email
 from auth.users
 where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then raise exception 'Courriel de connexion non vérifié';end if;
 select i.token_hash,i.invited_email into v_hash,v_expected
 from public.couple_invitations i
 where i.id=p_invitation
  and i.accepted_at is null
  and i.cancelled_at is null
  and i.expires_at>now()
 for update;
 if not found then raise exception 'Invitation expirée, annulée ou déjà acceptée';end if;
 if v_email<>v_expected then
  raise exception 'Cette invitation est destinée à un autre courriel. Connectez-vous au bon compte.';
 end if;
 -- Existing function checks completed profile + birthday, unique membership,
 -- pending invitation and capacity, and transfers the invited person atomically.
 return public.accept_love_match(v_hash);
end;$$;
revoke all on function public.accept_love_match_by_id(uuid)
 from public,anon,authenticated;
grant execute on function public.accept_love_match_by_id(uuid) to authenticated;

-- Migrate an OLD #invite=<256-bit-token> link on first visit into a new
-- browser-safe ?invite_id= link. The resolver exposes no email and cannot pair.
create or replace function public.resolve_love_invite_reference(p_token_hash text)
returns uuid language sql stable security definer set search_path='' as $$
 select i.id from public.couple_invitations i
 where p_token_hash ~ '^[a-f0-9]{64}$'
   and i.token_hash=p_token_hash
   and i.accepted_at is null
   and i.cancelled_at is null
   and i.expires_at>now()
 limit 1;
$$;
revoke all on function public.resolve_love_invite_reference(text)
 from public,anon,authenticated;
grant execute on function public.resolve_love_invite_reference(text)
 to anon,authenticated;
