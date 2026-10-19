-- LoveRoll v56: journal edits remain encrypted and restricted to their author.
-- Additive functions: existing data and RLS policies are left intact.
create or replace function public.update_my_love_event(
 p_event uuid,p_happened_on date,p_ciphertext text)
returns void language plpgsql security definer set search_path='' as $$
declare v_couple uuid; v_author uuid; v_old text;
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_happened_on is null or p_happened_on>(now() at time zone 'America/Toronto')::date then
  raise exception 'Date invalide';end if;
 if p_ciphertext is null or char_length(p_ciphertext) not between 20 and 30000 then
  raise exception 'Contenu chiffré invalide';end if;
 select couple_id,author_id,ciphertext into v_couple,v_author,v_old
 from public.couple_intimacy where id=p_event;
 if not found or v_author<>auth.uid() then raise exception 'Modification interdite';end if;
 perform 1 from public.couples where id=v_couple for update;
 if not found or not couple_private.is_member(v_couple) then
  raise exception 'Vous ne faites plus partie de ce couple';end if;
 update public.couple_intimacy set happened_on=p_happened_on,ciphertext=p_ciphertext
 where id=p_event and author_id=auth.uid();
 -- Preserve independent edits in the private archive.
 update public.love_personal_intimacy
 set happened_on=p_happened_on,ciphertext=p_ciphertext
 where user_id=auth.uid() and source_event_id=p_event and ciphertext=v_old;
end;$$;
revoke all on function public.update_my_love_event(uuid,date,text) from public,anon;
grant execute on function public.update_my_love_event(uuid,date,text) to authenticated;

create or replace function public.update_my_personal_love_event(
 p_archive uuid,p_happened_on date,p_ciphertext text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_happened_on is null or p_happened_on>(now() at time zone 'America/Toronto')::date then
  raise exception 'Date invalide';end if;
 if p_ciphertext is null or char_length(p_ciphertext) not between 20 and 30000 then
  raise exception 'Contenu chiffré invalide';end if;
 update public.love_personal_intimacy set happened_on=p_happened_on,ciphertext=p_ciphertext
 where id=p_archive and user_id=auth.uid();
 if not found then raise exception 'Note personnelle introuvable ou accès refusé';end if;
 -- A personal edit never modifies the shared couple entry.
end;$$;
revoke all on function public.update_my_personal_love_event(uuid,date,text) from public,anon;
grant execute on function public.update_my_personal_love_event(uuid,date,text) to authenticated;

create or replace function public.delete_my_personal_love_event(p_archive uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 delete from public.love_personal_intimacy where id=p_archive and user_id=auth.uid();
 if not found then raise exception 'Note personnelle introuvable ou accès refusé';end if;
 -- A personal deletion never deletes a shared couple entry.
end;$$;
revoke all on function public.delete_my_personal_love_event(uuid) from public,anon;
grant execute on function public.delete_my_personal_love_event(uuid) to authenticated;

-- An internal trigger requires no direct unauthenticated RPC access.
revoke all on function public.love_push_on_invite_accept() from public,anon;

-- Reveal only whether a finished-session feedback was submitted, not its text.
-- This is required because RLS correctly hides the partner's encrypted response
-- until BOTH have submitted; counting client-visible rows is misleading.
create or replace function public.my_love_feedback_status(p_session uuid)
returns table(user_id uuid,submitted boolean)
language sql stable security definer set search_path='' as $$
 select m.user_id,
  exists(select 1 from public.couple_feedback f
   where f.session_id=p_session and f.author_id=m.user_id) as submitted
 from public.couple_members m
 join public.couple_sessions sess on sess.couple_id=m.couple_id
 where sess.id=p_session and sess.finished_at is not null and sess.counted
  and couple_private.is_member(m.couple_id)
  and public.love_verified_identity();
$$;
revoke all on function public.my_love_feedback_status(uuid) from public,anon;
grant execute on function public.my_love_feedback_status(uuid) to authenticated;

-- A client-encrypted known-value probe distinguishes a never-initialized
-- journal from an existing empty journal, without storing the passphrase.
alter table public.couples add column if not exists journal_verifier text;

create or replace function public.initialize_love_journal(p_couple uuid,p_verifier text)
returns void language plpgsql security definer set search_path='' as $$
declare v_existing text;
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_verifier is null or length(p_verifier) not between 50 and 30000 then
  raise exception 'Vérification chiffrée invalide';end if;
 select journal_verifier into v_existing
 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) then
  raise exception 'Accès réservé aux membres du couple';end if;
 if v_existing is not null then
  raise exception 'Le journal a déjà été configuré. Déverrouillez-le avec votre phrase.';
 end if;
 if exists(select 1 from public.couple_intimacy where couple_id=p_couple)
  or exists(select 1 from public.couple_feedback where couple_id=p_couple) then
  raise exception 'Le journal contient déjà des données anciennes; déverrouillez-les avant toute reconfiguration.';
 end if;
 update public.couples set journal_verifier=p_verifier where id=p_couple;
end;$$;
revoke all on function public.initialize_love_journal(uuid,text) from public,anon;
grant execute on function public.initialize_love_journal(uuid,text) to authenticated;

-- The partner may see library COUNTS without reading owner's private cards.
create or replace function public.my_love_evening_card_totals(p_couple uuid)
returns table(sensual integer,sexual integer,total integer)
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès réservé aux partenaires';end if;
 return query
 select (25+count(*) filter(where c.category='SENSUEL'))::integer,
        (25+count(*) filter(where c.category='SEXUEL'))::integer,
        (50+count(*))::integer
 from public.love_custom_challenges c
 where c.couple_id=p_couple and c.card_id between 26 and 35
   and length(btrim(c.title))>=3 and length(btrim(c.description))>=10
   and c.category in ('SENSUEL','SEXUEL');
end;$$;
revoke all on function public.my_love_evening_card_totals(uuid) from public,anon;
grant execute on function public.my_love_evening_card_totals(uuid) to authenticated;
