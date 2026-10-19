-- LoveRoll — administrator may customize ALL 35 cards per category.
-- Settings: choose who can draw and who can receive, optional timer,
-- no card repeated until ALL currently eligible cards have been drawn.
-- No historical challenges or private calendar entries are deleted.

alter table public.love_custom_challenges
 drop constraint if exists love_custom_challenges_card_id_check;
alter table public.love_custom_challenges
 add constraint love_custom_challenges_card_id_check check(card_id between 1 and 35);
alter table public.love_custom_challenges
 add column if not exists drawer_user_id uuid references auth.users(id) on delete set null;
alter table public.couples
 add column if not exists no_repeat_challenges boolean not null default true;

create table if not exists public.love_card_draw_history(
 couple_id uuid not null references public.couples(id) on delete cascade,
 recipient_user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('SENSUEL','SEXUEL')),
 card_id smallint not null check(card_id between 1 and 35),
 drawn_at timestamptz not null default now(),
 primary key(couple_id,recipient_user_id,category,card_id)
);
alter table public.love_card_draw_history enable row level security;
revoke all on public.love_card_draw_history from public,anon,authenticated;

create or replace function public.save_love_custom_card(
 p_couple uuid,p_category text,p_card_id integer,p_title text,
 p_description text,p_timer_minutes integer,p_recipient uuid,p_drawer uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples c
    where c.id=p_couple and c.owner_user_id=auth.uid())
 then raise exception 'Seul l’administrateur peut modifier les cartes';end if;
 if p_category not in ('SENSUEL','SEXUEL') or
   p_card_id not between 1 and 35 then raise exception 'Carte invalide';end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 120 or
  length(trim(coalesce(p_description,''))) not between 10 and 900 or
  (p_timer_minutes is not null and p_timer_minutes not between 1 and 60)
 then raise exception 'Contenu ou minuteur invalide';end if;
 if p_drawer is not null and not exists(
  select 1 from public.couple_members m where m.couple_id=p_couple and m.user_id=p_drawer)
 then raise exception 'La personne qui pige doit être membre du couple';end if;
 if p_recipient is not null and not exists(
  select 1 from public.couple_members m where m.couple_id=p_couple and m.user_id=p_recipient)
 then raise exception 'Le destinataire doit être membre du couple';end if;
 if p_drawer is not null and p_recipient is not null and p_drawer=p_recipient
 then raise exception 'La personne qui pige ne peut pas offrir le défi à elle-même';end if;
 insert into public.love_custom_challenges(
  couple_id,category,card_id,title,description,timer_minutes,
  recipient_user_id,drawer_user_id)
 values(p_couple,p_category,p_card_id,trim(p_title),trim(p_description),
  p_timer_minutes,p_recipient,p_drawer)
 on conflict(couple_id,category,card_id) do update set
  title=excluded.title,description=excluded.description,
  timer_minutes=excluded.timer_minutes,recipient_user_id=excluded.recipient_user_id,
  drawer_user_id=excluded.drawer_user_id,updated_at=now();
end;$$;
revoke all on function public.save_love_custom_card(uuid,text,integer,text,text,integer,uuid,uuid) from public,anon;
grant execute on function public.save_love_custom_card(uuid,text,integer,text,text,integer,uuid,uuid)
 to authenticated;

-- Keep seven-argument calls compatible with older installed versions.
create or replace function public.save_love_custom_card(
 p_couple uuid,p_category text,p_card_id integer,p_title text,
 p_description text,p_timer_minutes integer default null,p_recipient uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.save_love_custom_card(
  p_couple,p_category,p_card_id,p_title,p_description,p_timer_minutes,p_recipient,null::uuid);
end;$$;
revoke all on function public.save_love_custom_card(uuid,text,integer,text,text,integer,uuid) from public,anon;
grant execute on function public.save_love_custom_card(uuid,text,integer,text,text,integer,uuid)
 to authenticated;

-- For original 1..25 cards, remove the override to restore factory content.
-- For slots 26..35, remove the filled card from future drawings.
create or replace function public.delete_love_custom_card(
 p_couple uuid,p_category text,p_card_id integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples c
    where c.id=p_couple and c.owner_user_id=auth.uid())
 then raise exception 'Seul l’administrateur peut rétablir les cartes';end if;
 if p_category not in ('SENSUEL','SEXUEL') or p_card_id not between 1 and 35
 then raise exception 'Carte invalide';end if;
 delete from public.love_custom_challenges where
  couple_id=p_couple and category=p_category and card_id=p_card_id;
end;$$;
revoke all on function public.delete_love_custom_card(uuid,text,integer) from public,anon;
grant execute on function public.delete_love_custom_card(uuid,text,integer) to authenticated;

create or replace function public.set_love_draw_rule(
 p_couple uuid,p_no_repeat boolean)
returns void language plpgsql security definer set search_path='' as $$
declare previous boolean;
begin
 if auth.uid() is null or p_no_repeat is null then
  raise exception 'Paramètre invalide';end if;
 select no_repeat_challenges into previous from public.couples c
 where c.id=p_couple and c.owner_user_id=auth.uid() for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Réglage réservé à l’administrateur';end if;
 if previous is distinct from p_no_repeat then
  update public.couples set no_repeat_challenges=p_no_repeat where id=p_couple;
  -- Start a fresh cycle when toggling the option, not deleting any game logs.
  delete from public.love_card_draw_history where couple_id=p_couple;
 end if;
end;$$;
revoke all on function public.set_love_draw_rule(uuid,boolean) from public,anon;
grant execute on function public.set_love_draw_rule(uuid,boolean) to authenticated;

create or replace function public.draw_for_partner(
 p_session uuid,p_preference text,p_random boolean default false)
returns public.couple_challenges language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 cats text[]:=array[]::text[]; weights integer[]:=array[]::integer[];
 total integer:=0; ticket integer; i integer; cid integer; d20 integer;
 chosen public.love_custom_challenges%rowtype;
 rowout public.couple_challenges%rowtype; capacity integer; v_no_repeat boolean;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then
  raise exception 'Soirée inaccessible';end if;
 if p_preference not in ('SENSUEL','SEXUEL') then
  raise exception 'Catégorie inconnue';end if;
 -- Lock the couple to serialize admin edits, draw-rule changes and both partners' picks.
 select coalesce(no_repeat_challenges,true) into v_no_repeat
 from public.couples where id=s.couple_id for update;
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
 -- A persistent shuffle bag, per couple + recipient, spanning evenings.
 -- Reset ONLY when every currently eligible card across BOTH categories has been drawn.
 if v_no_repeat and not exists(
  select 1 from (values ('SENSUEL'::text),('SEXUEL'::text)) cats(category)
  cross join generate_series(1,35) candidate(card)
  where (candidate.card<=25 or exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card))
   and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card
      and ((cc.recipient_user_id is not null and cc.recipient_user_id<>target)
        or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
   and not exists(
    select 1 from public.love_card_draw_history history
    where history.couple_id=s.couple_id and history.recipient_user_id=target
      and history.category=cats.category and history.card_id=candidate.card)
 ) then
  delete from public.love_card_draw_history
  where couple_id=s.couple_id and recipient_user_id=target;
 end if;
 for i in 1..2 loop
  v_cat:=(array['SENSUEL','SEXUEL'])[i];
  select count(*) into capacity from generate_series(1,35) card
   where (card<=25 or exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
   and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
      and ((cc.recipient_user_id is not null and cc.recipient_user_id<>target)
        or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
   and (not v_no_repeat or not exists(
    select 1 from public.love_card_draw_history history
    where history.couple_id=s.couple_id and history.recipient_user_id=target
     and history.category=v_cat and history.card_id=card))
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
 where (card<=25 or exists(
  select 1 from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
 and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
     and ((cc.recipient_user_id is not null and cc.recipient_user_id<>target)
       or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
 and (not v_no_repeat or not exists(
   select 1 from public.love_card_draw_history history
   where history.couple_id=s.couple_id and history.recipient_user_id=target
    and history.category=v_cat and history.card_id=card))
 and not exists(select 1 from public.couple_challenges used
   where used.session_id=p_session and used.recipient=target
    and used.category=v_cat and used.card_id=card)
 order by random() limit 1;
 if cid is null then raise exception 'Aucune carte disponible';end if;
 d20:=floor(random()*20)::integer+1;
 if true then
  select * into chosen from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=cid;
 end if;
 insert into public.couple_challenges(
  session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,card_timer_minutes)
 values(p_session,s.couple_id,auth.uid(),target,v_cat,d20,cid,
  case when chosen.card_id is not null then chosen.title else null end,
  case when chosen.card_id is not null then chosen.description else null end,
  case when chosen.card_id is not null then chosen.timer_minutes else null end)
 returning * into rowout;
 if v_no_repeat then
  insert into public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
  values(s.couple_id,target,v_cat,cid)
  on conflict(couple_id,recipient_user_id,category,card_id) do nothing;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi offert');
 return rowout;
end;$$;

revoke all on function public.draw_for_partner(uuid,text,boolean) from public,anon;
grant execute on function public.draw_for_partner(uuid,text,boolean) to authenticated;

-- Refresh PostgREST RPC signature cache for the new eight-argument endpoint.
notify pgrst, 'reload schema';
