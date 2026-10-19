-- LoveRoll: privacy-first personal diary, reversible pairing, private wellbeing.
-- Run on the dedicated LoveRoll Supabase project only. This migration preserves
-- every original couple_intimacy and other couple record; it never deletes a journal entry.

create table if not exists public.love_wellbeing (
 user_id uuid primary key references auth.users(id) on delete cascade,
 relationship_state text not null check(relationship_state in ('great','good','distant','difficult','skip')),
 intimacy_state text not null check(intimacy_state in ('fulfilled','improve','different','infrequent','sensitive','skip')),
 updated_at timestamptz not null default now()
);
alter table public.love_wellbeing enable row level security;
drop policy if exists love_wellbeing_own_read on public.love_wellbeing;
create policy love_wellbeing_own_read on public.love_wellbeing for select to authenticated
 using (user_id=(select auth.uid()));
revoke all on public.love_wellbeing from anon,authenticated;
grant select on public.love_wellbeing to authenticated;

-- Each relationship activity is kept in the author's private calendar, using
-- the original encrypted contents and salt. Even a new partner has no access.
create table if not exists public.love_personal_intimacy (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_event_id uuid not null,
 source_couple_id uuid not null,
 happened_on date not null,
 ciphertext text not null check(length(ciphertext) between 20 and 30000),
 journal_salt text not null,
 created_at timestamptz not null,
 unique(user_id,source_event_id)
);
create index if not exists love_personal_intimacy_owner_date_idx
 on public.love_personal_intimacy(user_id,happened_on desc);
alter table public.love_personal_intimacy enable row level security;
drop policy if exists love_personal_intimacy_own_read on public.love_personal_intimacy;
create policy love_personal_intimacy_own_read on public.love_personal_intimacy for select to authenticated
 using (user_id=(select auth.uid()));
revoke all on public.love_personal_intimacy from anon,authenticated;
grant select on public.love_personal_intimacy to authenticated;

-- Preserve existing activities before changing any relationship membership.
insert into public.love_personal_intimacy
 (user_id,source_event_id,source_couple_id,happened_on,ciphertext,journal_salt,created_at)
select i.author_id,i.id,i.couple_id,i.happened_on,i.ciphertext,c.journal_salt,i.created_at
from public.couple_intimacy i
join public.couples c on c.id=i.couple_id
join public.couple_members m on m.couple_id=i.couple_id and m.user_id=i.author_id
on conflict(user_id,source_event_id) do nothing;

create or replace function public.save_my_wellbeing(p_relationship text,p_intimacy text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_relationship not in ('great','good','distant','difficult','skip')
   or p_intimacy not in ('fulfilled','improve','different','infrequent','sensitive','skip') then
  raise exception 'Sélectionnez une réponse à chaque question';end if;
 insert into public.love_wellbeing(user_id,relationship_state,intimacy_state)
 values(auth.uid(),p_relationship,p_intimacy)
 on conflict(user_id) do update set relationship_state=excluded.relationship_state,
  intimacy_state=excluded.intimacy_state,updated_at=now();
end;$$;
revoke all on function public.save_my_wellbeing(text,text) from public,anon;
grant execute on function public.save_my_wellbeing(text,text) to authenticated;

-- Only a generic combined guidance tier is disclosed, never individual answers.
create or replace function public.get_love_guidance(p_couple uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare gentle boolean; reconnect boolean; quality boolean;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_couple is not null and not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 select
  coalesce(bool_or(w.relationship_state='difficult' or w.intimacy_state='sensitive'),false),
  coalesce(bool_or(w.relationship_state='distant' or w.intimacy_state in ('different','infrequent')),false),
  coalesce(bool_or(w.relationship_state='good' or w.intimacy_state='improve'),false)
 into gentle,reconnect,quality
 from public.love_wellbeing w
 where w.user_id=auth.uid()
    or (p_couple is not null and exists(
     select 1 from public.couple_members m where m.couple_id=p_couple and m.user_id=w.user_id));
 if gentle then return 'gentle';end if;
 if reconnect then return 'reconnect';end if;
 if quality then return 'quality';end if;
 return 'playful';
end;$$;
revoke all on function public.get_love_guidance(uuid) from public,anon;
grant execute on function public.get_love_guidance(uuid) to authenticated;

-- New entries are simultaneously saved in the shared journal and the
-- author's *private* long-term archive in one transaction.
create or replace function public.add_my_love_event(p_couple uuid,p_happened_on date,p_ciphertext text)
returns uuid language plpgsql security definer set search_path='' as $$
declare e uuid; original_salt text;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 if p_happened_on is null or p_happened_on>current_date then
  raise exception 'Date invalide';end if;
 if p_ciphertext is null or length(p_ciphertext) not between 20 and 30000 then
  raise exception 'Données chiffrées invalides';end if;
 select journal_salt into original_salt from public.couples where id=p_couple for update;
 if original_salt is null then raise exception 'Couple introuvable';end if;
 -- Repeat membership check after row lock to serialize against detachment.
 if not couple_private.is_member(p_couple) then raise exception 'Accès retiré';end if;
 insert into public.couple_intimacy(couple_id,author_id,happened_on,ciphertext)
 values(p_couple,auth.uid(),p_happened_on,p_ciphertext) returning id into e;
 insert into public.love_personal_intimacy
  (user_id,source_event_id,source_couple_id,happened_on,ciphertext,journal_salt,created_at)
 values(auth.uid(),e,p_couple,p_happened_on,p_ciphertext,original_salt,now());
 return e;
end;$$;
revoke all on function public.add_my_love_event(uuid,date,text) from public,anon;
grant execute on function public.add_my_love_event(uuid,date,text) to authenticated;

-- Ending a match retires access for BOTH accounts atomically. It does not
-- delete or modify the shared history; it is retained server-side but has
-- zero active members and cannot be reused for a future partner.
create or replace function public.end_love_match(p_couple uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 -- Backfill all existing authored events for both participants.
 insert into public.love_personal_intimacy
  (user_id,source_event_id,source_couple_id,happened_on,ciphertext,journal_salt,created_at)
 select i.author_id,i.id,i.couple_id,i.happened_on,i.ciphertext,c.journal_salt,i.created_at
 from public.couple_intimacy i
 join public.couples c on c.id=i.couple_id
 join public.couple_members m on m.couple_id=i.couple_id and m.user_id=i.author_id
 where i.couple_id=p_couple
 on conflict(user_id,source_event_id) do nothing;
 update public.couple_invitations set expires_at=now()
 where couple_id=p_couple and accepted_at is null;
 delete from public.couple_members where couple_id=p_couple;
end;$$;
revoke all on function public.end_love_match(uuid) from public,anon;
grant execute on function public.end_love_match(uuid) to authenticated;
