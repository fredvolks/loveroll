-- LoveRoll: 25 fixed cards + 10 optional creator-only slots per category.
-- Existing journals and challenges are preserved, without deletion.
alter table public.couples add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

-- Upgrade older couples: the creator of an invitation, or the first member.
update public.couples c set owner_user_id=coalesce(
 (select i.created_by from public.couple_invitations i
  join public.couple_members m on m.couple_id=i.couple_id and m.user_id=i.created_by
  where i.couple_id=c.id order by i.created_at limit 1),
 (select m.user_id from public.couple_members m
  where m.couple_id=c.id order by m.joined_at,m.user_id limit 1))
where c.owner_user_id is null and exists(
 select 1 from public.couple_members m where m.couple_id=c.id);

create or replace function couple_private.assign_love_owner()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.couples set owner_user_id=new.user_id
 where id=new.couple_id and owner_user_id is null;
 return new;
end;$$;
drop trigger if exists assign_love_owner on public.couple_members;
create trigger assign_love_owner after insert on public.couple_members
 for each row execute function couple_private.assign_love_owner();
revoke all on function couple_private.assign_love_owner() from public,anon,authenticated;

create table if not exists public.love_custom_challenges(
 couple_id uuid not null references public.couples(id) on delete cascade,
 category text not null check(category in ('SENSUEL','SEXUEL')),
 card_id smallint not null check(card_id between 26 and 35),
 title text not null check(length(trim(title)) between 3 and 120),
 description text not null check(length(trim(description)) between 10 and 900),
 timer_minutes smallint check(timer_minutes is null or timer_minutes between 1 and 60),
 recipient_user_id uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key(couple_id,category,card_id)
);
alter table public.love_custom_challenges enable row level security;
drop policy if exists love_custom_owner_read on public.love_custom_challenges;
create policy love_custom_owner_read on public.love_custom_challenges
for select to authenticated using(
 exists(select 1 from public.couples c
 where c.id=couple_id and c.owner_user_id=(select auth.uid())
 and couple_private.is_member(c.id)));
revoke all on public.love_custom_challenges from anon,authenticated;
grant select on public.love_custom_challenges to authenticated;

create or replace function public.save_love_custom_card(
 p_couple uuid,p_category text,p_card_id integer,
 p_title text,p_description text,p_timer_minutes integer default null,
 p_recipient uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples where id=p_couple and owner_user_id=auth.uid())
 then raise exception 'Seul l’administrateur peut modifier les cartes';end if;
 if p_category not in ('SENSUEL','SEXUEL') or p_card_id not between 26 and 35
 then raise exception 'Emplacement invalide';end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 120 or
    length(trim(coalesce(p_description,''))) not between 10 and 900 or
    (p_timer_minutes is not null and p_timer_minutes not between 1 and 60)
 then raise exception 'Carte ou minuterie invalide';end if;
 if p_recipient is not null and not exists(select 1 from public.couple_members m
  where m.couple_id=p_couple and m.user_id=p_recipient) then
  raise exception 'Destinataire non membre du couple';end if;
 insert into public.love_custom_challenges(couple_id,category,card_id,title,description,timer_minutes,recipient_user_id)
 values(p_couple,p_category,p_card_id,trim(p_title),trim(p_description),p_timer_minutes,p_recipient)
 on conflict(couple_id,category,card_id) do update
 set title=excluded.title,description=excluded.description,
 timer_minutes=excluded.timer_minutes,recipient_user_id=excluded.recipient_user_id,updated_at=now();
end;$$;
revoke all on function public.save_love_custom_card(uuid,text,integer,text,text,integer,uuid) from public,anon;
grant execute on function public.save_love_custom_card(uuid,text,integer,text,text,integer,uuid) to authenticated;

create or replace function public.delete_love_custom_card(
 p_couple uuid,p_category text,p_card_id integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples where id=p_couple and owner_user_id=auth.uid())
 then raise exception 'Seul l’administrateur peut supprimer les cartes';end if;
 delete from public.love_custom_challenges
 where couple_id=p_couple and category=p_category and card_id=p_card_id;
end;$$;
revoke all on function public.delete_love_custom_card(uuid,text,integer) from public,anon;
grant execute on function public.delete_love_custom_card(uuid,text,integer) to authenticated;

-- Store card ID independently of physical D20 face (1..20).
alter table public.couple_challenges add column if not exists card_id smallint;
update public.couple_challenges set card_id=face where card_id is null;
alter table public.couple_challenges alter column card_id set not null;
alter table public.couple_challenges drop constraint if exists couple_challenges_card_id_check;
alter table public.couple_challenges add constraint couple_challenges_card_id_check
 check(card_id between 1 and 35);
alter table public.couple_challenges add column if not exists card_title text;
alter table public.couple_challenges add column if not exists card_description text;
alter table public.couple_challenges add column if not exists card_timer_minutes smallint;
alter table public.couple_challenges
 drop constraint if exists couple_challenges_session_id_recipient_category_face_key;
create unique index if not exists love_challenge_unique_card
 on public.couple_challenges(session_id,recipient,category,card_id);

-- Only the creator can list the custom catalogue. Drawn cards' texts
-- are snapshotted into couple_challenges and visible to both active members.
create or replace function public.draw_for_partner(
 p_session uuid,p_preference text,p_random boolean default false)
returns public.couple_challenges language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 cats text[]:=array[]::text[]; weights integer[]:=array[]::integer[];
 total integer:=0; ticket integer; i integer; cid integer; d20 integer;
 chosen public.love_custom_challenges%rowtype;
 rowout public.couple_challenges%rowtype; capacity integer;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then
  raise exception 'Soirée inaccessible';end if;
 if p_preference not in ('SENSUEL','SEXUEL') then
  raise exception 'Catégorie inconnue';end if;
 perform 1 from public.couple_sessions where id=p_session for update;
 select user_id into target from public.couple_members
  where couple_id=s.couple_id and user_id<>auth.uid();
 if target is null then raise exception 'Partenaire absent';end if;
 if (select count(*) from public.couple_personal_rolls
     where session_id=p_session and user_id in (auth.uid(),target))<>2 then
  raise exception 'Attendre les deux D6 personnels';end if;
 if exists(select 1 from public.couple_challenges
 where session_id=p_session and recipient=target and status in ('proposed','accepted')) then
  raise exception 'Attendre la réponse au défi précédent';end if;
 if (select count(*) from public.couple_challenges
 where session_id=p_session and recipient=target and status='completed') >=
    (select face from public.couple_personal_rolls where session_id=p_session and user_id=target)
 then raise exception 'Défis terminés';end if;
 for i in 1..2 loop
  v_cat:=(array['SENSUEL','SEXUEL'])[i];
  select count(*) into capacity from generate_series(1,35) card
   where (card<=25 or (card>=26 and exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
    and (cc.recipient_user_id is null or cc.recipient_user_id=target))))
   and not exists(select 1 from public.couple_challenges used
    where used.session_id=p_session and used.recipient=target
     and used.category=v_cat and used.card_id=card);
  if capacity>0 then
   cats:=array_append(cats,v_cat);
   weights:=array_append(weights,case when v_cat=p_preference then 80 else 20 end);
   total:=total+weights[array_length(weights,1)];
  end if;
 end loop;
 if total=0 then raise exception 'Toutes les cartes ont déjà été proposées';end if;
 ticket:=floor(random()*total)::integer;
 for i in 1..array_length(cats,1) loop
  if ticket<weights[i] then v_cat:=cats[i];exit;end if;
  ticket:=ticket-weights[i];
 end loop;
 select card into cid from generate_series(1,35) card
 where (card<=25 or (card>=26 and exists(
  select 1 from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
  and (cc.recipient_user_id is null or cc.recipient_user_id=target))))
 and not exists(select 1 from public.couple_challenges used
   where used.session_id=p_session and used.recipient=target
    and used.category=v_cat and used.card_id=card)
 order by random() limit 1;
 if cid is null then raise exception 'Aucune carte disponible';end if;
 d20:=floor(random()*20)::integer+1;
 if cid>=26 then
  select * into chosen from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=cid;
 end if;
 insert into public.couple_challenges(
  session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,card_timer_minutes)
 values(p_session,s.couple_id,auth.uid(),target,v_cat,d20,cid,
  case when cid>=26 then chosen.title else null end,
  case when cid>=26 then chosen.description else null end,
  case when cid>=26 then chosen.timer_minutes else null end)
 returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi offert');
 return rowout;
end;$$;
revoke all on function public.draw_for_partner(uuid,text,boolean) from public,anon;
grant execute on function public.draw_for_partner(uuid,text,boolean) to authenticated;

-- Each person privately rolls their own D6. Reveal both simultaneously only
-- after BOTH server-side rolls exist, so neither account sees the first result.
drop policy if exists personal_rolls_read on public.couple_personal_rolls;
create policy personal_rolls_read on public.couple_personal_rolls
for select to authenticated using (
 exists(select 1 from public.couple_sessions s
 where s.id=session_id and couple_private.is_member(s.couple_id))
 and (select count(*) from public.couple_personal_rolls pr2
      where pr2.session_id=couple_personal_rolls.session_id)=2
);
-- RLS self-query would recurse! Replace with security-definer gate.
create or replace function couple_private.both_rolls_ready(p_session uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select (select count(*) from public.couple_personal_rolls
  where session_id=p_session)=2
$$;
revoke all on function couple_private.both_rolls_ready(uuid) from public,anon;
grant execute on function couple_private.both_rolls_ready(uuid) to authenticated;
drop policy if exists personal_rolls_read on public.couple_personal_rolls;
create policy personal_rolls_read on public.couple_personal_rolls
for select to authenticated using (
 exists(select 1 from public.couple_sessions s
 where s.id=session_id and couple_private.is_member(s.couple_id))
 and couple_private.both_rolls_ready(session_id)
);

create or replace function public.my_love_roll_status(p_session uuid)
returns table(my_rolled boolean,partner_rolled boolean,both_ready boolean)
language plpgsql stable security definer set search_path='' as $$
declare partner uuid;
begin
 if auth.uid() is null or not exists(
 select 1 from public.couple_sessions s where s.id=p_session
 and couple_private.is_member(s.couple_id)) then raise exception 'Accès refusé';end if;
 select m.user_id into partner from public.couple_members m join public.couple_sessions s
 on s.couple_id=m.couple_id
 where s.id=p_session and m.user_id<>auth.uid() limit 1;
 return query select
  exists(select 1 from public.couple_personal_rolls r where r.session_id=p_session and r.user_id=auth.uid()),
  exists(select 1 from public.couple_personal_rolls r where r.session_id=p_session and r.user_id=partner),
  (select count(*)=2 from public.couple_personal_rolls r where r.session_id=p_session);
end;$$;
revoke all on function public.my_love_roll_status(uuid) from public,anon;
grant execute on function public.my_love_roll_status(uuid) to authenticated;

-- Do not expose the first roll through the RPC result itself.
create or replace function public.roll_my_evening_d6(p_session uuid)
returns public.couple_personal_rolls language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; r public.couple_personal_rolls%rowtype;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then
  raise exception 'Soirée inaccessible';end if;
 perform 1 from public.couple_sessions where id=p_session for update;
 select * into r from public.couple_personal_rolls
  where session_id=p_session and user_id=auth.uid();
 if not found then
  insert into public.couple_personal_rolls(session_id,user_id,face)
  values(p_session,auth.uid(),floor(random()*6)::integer+1) returning * into r;
  insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(s.couple_id,'roll',auth.uid(),'D6 personnel lancé');
 end if;
 if (select count(*) from public.couple_personal_rolls where session_id=p_session)<2 then
  r.face:=null;
 end if;
 return r;
end;$$;
-- NOTE: face column is non-null in the table and type, returning null field is fine.
revoke all on function public.roll_my_evening_d6(uuid) from public,anon;
grant execute on function public.roll_my_evening_d6(uuid) to authenticated;
