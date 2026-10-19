
-- LoveRoll — personalized SEXUEL cards are a private, per-couple copy of MEDIUM.
-- Keeps previous love_custom_challenges and the 600 future style cards untouched.
-- Automatic mode never exposes this deck. Draws/history/cycle are not reset.
create table if not exists public.love_personal_sexual_cards (
 couple_id uuid not null references public.couples(id) on delete cascade,
 category text not null default 'SEXUEL' check(category='SEXUEL'),
 card_id smallint not null check(card_id between 1 and 100),
 title text not null check(length(btrim(title)) between 3 and 120),
 description text not null check(length(btrim(description)) between 10 and 900),
 timer_minutes smallint check(timer_minutes is null or timer_minutes between 1 and 60),
 drawer_role text not null default 'both' check(drawer_role in ('both','him','her','owner','partner')),
 recipient_role text not null default 'both' check(recipient_role in ('both','him','her','owner','partner')),
 drawer_user_id uuid,
 recipient_user_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(couple_id,card_id)
);
alter table public.love_personal_sexual_cards enable row level security;
revoke all on table public.love_personal_sexual_cards from public,anon,authenticated;
grant select on public.love_personal_sexual_cards to authenticated;
drop policy if exists love_personal_sexual_owner_read on public.love_personal_sexual_cards;
create policy love_personal_sexual_owner_read on public.love_personal_sexual_cards
 for select to authenticated
 using(exists(
  select 1 from public.couples c
  where c.id=couple_id and c.owner_user_id=(select auth.uid())
   and couple_private.is_member(c.id)
 ));

create or replace function couple_private.ensure_love_personal_sexual_cards(p_couple uuid)
returns integer language plpgsql security definer set search_path='' as $seed$
declare v_source integer; v_saved integer;
begin
 -- Internal routine only; callers must first lock the couple and verify ownership.
 select count(*) into v_source
 from public.love_future_style_cards f
 where f.couple_id=p_couple and f.category='SEXUEL' and f.style='medium'
 and f.card_id between 1 and 100;
 if v_source<>100 then
  raise exception 'La bibliothèque MEDIUM du duo doit contenir 100 cartes';
 end if;
 insert into public.love_personal_sexual_cards (
   couple_id,category,card_id,title,description,timer_minutes,
   drawer_role,recipient_role,drawer_user_id,recipient_user_id
 )
 select p_couple,'SEXUEL',f.card_id::smallint,f.title,f.description,
        f.timer_minutes::smallint,f.drawer_role,f.recipient_role,null,null
 from public.love_future_style_cards f
 where f.couple_id=p_couple and f.category='SEXUEL' and f.style='medium'
 on conflict (couple_id,card_id) do nothing;
 select count(*) into v_saved
 from public.love_personal_sexual_cards where couple_id=p_couple;
 if v_saved<>100 then
  raise exception 'La bibliothèque personnelle doit contenir exactement 100 cartes; trouvé %',v_saved;
 end if;
 return v_saved;
end;$seed$;
revoke all on function couple_private.ensure_love_personal_sexual_cards(uuid)
 from public,anon,authenticated;

-- A mode change never destroys or reseeds previously edited cards.
create or replace function public.set_love_sexual_card_mode(p_couple uuid,p_mode text)
returns text language plpgsql security definer set search_path='' as $mode$
declare v_owner uuid;
begin
 perform public.love_require_verified_identity();
 if (select auth.uid()) is null or p_mode is null or p_mode not in ('automatic','custom')
 then raise exception 'Mode inconnu ou connexion requise';end if;
 select c.owner_user_id into v_owner from public.couples c
 where c.id=p_couple for update;
 if not found or v_owner is distinct from (select auth.uid()) or not couple_private.is_member(p_couple)
 then raise exception 'Réservé à l’administrateur de ce duo';end if;
 if p_mode='automatic' then
  perform couple_private.ensure_love_style_pool(p_couple);
 else
  perform couple_private.ensure_love_personal_sexual_cards(p_couple);
 end if;
 update public.couples set sexual_card_mode=p_mode where id=p_couple;
 return p_mode;
end;$mode$;
revoke all on function public.set_love_sexual_card_mode(uuid,text)
 from public,anon,authenticated;
grant execute on function public.set_love_sexual_card_mode(uuid,text) to authenticated;

create or replace function public.save_love_personal_sexual_card(
 p_couple uuid,p_card_id integer,p_title text,p_description text,
 p_timer_minutes integer,p_drawer_role text,p_recipient_role text
) returns void language plpgsql security definer set search_path='' as $save$
declare v_mode text;
begin
 perform public.love_require_verified_identity();
 select c.sexual_card_mode into v_mode from public.couples c
 where c.id=p_couple and c.owner_user_id=(select auth.uid()) for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Réservé à l’administrateur du duo';end if;
 if v_mode<>'custom' then raise exception 'Sélectionnez Mes 100 cartes personnalisées';end if;
 if p_card_id not between 1 and 100
 or length(btrim(coalesce(p_title,''))) not between 3 and 120
 or length(btrim(coalesce(p_description,''))) not between 10 and 900
 or (p_timer_minutes is not null and p_timer_minutes not between 1 and 60)
 then raise exception 'Carte ou minuteur invalide';end if;
 if p_drawer_role not in ('both','him','her','owner','partner')
 or p_recipient_role not in ('both','him','her','owner','partner')
 or (p_drawer_role=p_recipient_role and p_drawer_role in ('owner','partner'))
 then raise exception 'Restrictions de pige invalides';end if;
 perform couple_private.ensure_love_personal_sexual_cards(p_couple);
 insert into public.love_personal_sexual_cards(
  couple_id,category,card_id,title,description,timer_minutes,
  drawer_role,recipient_role,drawer_user_id,recipient_user_id
 ) values(
  p_couple,'SEXUEL',p_card_id::smallint,btrim(p_title),btrim(p_description),
  p_timer_minutes::smallint,p_drawer_role,p_recipient_role,null,null
 )
 on conflict(couple_id,card_id) do update set
 title=excluded.title,description=excluded.description,timer_minutes=excluded.timer_minutes,
 drawer_role=excluded.drawer_role,recipient_role=excluded.recipient_role,
 drawer_user_id=null,recipient_user_id=null,updated_at=now();
end;$save$;
revoke all on function public.save_love_personal_sexual_card(uuid,integer,text,text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.save_love_personal_sexual_card(uuid,integer,text,text,integer,text,text)
 to authenticated;

create or replace function public.restore_love_personal_sexual_card(p_couple uuid,p_card_id integer)
returns void language plpgsql security definer set search_path='' as $restore$
declare v_mode text;
begin
 perform public.love_require_verified_identity();
 select c.sexual_card_mode into v_mode from public.couples c
 where c.id=p_couple and c.owner_user_id=(select auth.uid()) for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Réservé à l’administrateur du duo';end if;
 if v_mode<>'custom' or p_card_id not between 1 and 100
 then raise exception 'Carte personnelle indisponible';end if;
 perform couple_private.ensure_love_personal_sexual_cards(p_couple);
 update public.love_personal_sexual_cards p
 set title=f.title,description=f.description,timer_minutes=f.timer_minutes::smallint,
     drawer_role=f.drawer_role,recipient_role=f.recipient_role,
     drawer_user_id=null,recipient_user_id=null,updated_at=now()
 from public.love_future_style_cards f
 where p.couple_id=p_couple and p.card_id=p_card_id
   and f.couple_id=p_couple and f.category='SEXUEL'
   and f.style='medium' and f.card_id=p_card_id;
 if not found then raise exception 'Carte MEDIUM introuvable';end if;
end;$restore$;
revoke all on function public.restore_love_personal_sexual_card(uuid,integer)
 from public,anon,authenticated;
grant execute on function public.restore_love_personal_sexual_card(uuid,integer)
 to authenticated;

create or replace function public.import_love_personal_sexual_cards(p_couple uuid,p_library jsonb)
returns void language plpgsql security definer set search_path='' as $import$
declare v_mode text; card jsonb; n integer; duration integer; seen integer[]:=array[]::integer[];
        v_title text;v_desc text; v_drawer text;v_recipient text;
begin
 perform public.love_require_verified_identity();
 select c.sexual_card_mode into v_mode from public.couples c
 where c.id=p_couple and c.owner_user_id=(select auth.uid()) for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Réservé à l’administrateur du duo';end if;
 if v_mode<>'custom' then raise exception 'Activez Mes 100 cartes personnalisées';end if;
 if p_library->>'format'<>'loveroll-evening'
    or p_library->>'version' not in ('1','2')
    or p_library->>'category'<>'SEXUEL'
    or jsonb_typeof(p_library->'cards')<>'array'
    or jsonb_array_length(p_library->'cards') not between 1 and 100
 then raise exception 'Liste SEXUEL JSON invalide';end if;
 for card in select x.value from jsonb_array_elements(p_library->'cards') x loop
  if jsonb_typeof(card)<>'object'
     or coalesce(card->>'card_id','') !~ '^[0-9]{1,3}$'
  then raise exception 'Numéro de carte JSON invalide';end if;
  n:=(card->>'card_id')::integer;
  if n not between 1 and 100 or n=any(seen) then
   raise exception 'Numéro répété ou invalide : %',n;
  end if;
  seen:=array_append(seen,n);
  v_title:=btrim(coalesce(card->>'title',''));
  v_desc:=btrim(coalesce(card->>'description',''));
  if length(v_title) not between 3 and 120 or length(v_desc) not between 10 and 900
  then raise exception 'Titre ou description invalide, carte %',n;end if;
  v_drawer:=coalesce(card->>'drawer_role','both');
  v_recipient:=coalesce(card->>'recipient_role','both');
  if v_drawer not in ('both','him','her','owner','partner')
    or v_recipient not in ('both','him','her','owner','partner')
    or (v_drawer=v_recipient and v_drawer in ('owner','partner'))
  then raise exception 'Droits de pige invalides, carte %',n;end if;
  if card->>'timer_minutes' is not null then
   if coalesce(card->>'timer_minutes','') !~ '^[0-9]{1,2}$'
   then raise exception 'Minuteur invalide carte %',n;end if;
   duration:=(card->>'timer_minutes')::integer;
   if duration not between 1 and 60 then raise exception 'Durée invalide carte %',n;end if;
  end if;
 end loop;
 perform couple_private.ensure_love_personal_sexual_cards(p_couple);
 insert into public.love_personal_sexual_cards(
   couple_id,category,card_id,title,description,timer_minutes,
   drawer_role,recipient_role,drawer_user_id,recipient_user_id
 )
 select p_couple,'SEXUEL',(x.value->>'card_id')::smallint,btrim(x.value->>'title'),
        btrim(x.value->>'description'),nullif(x.value->>'timer_minutes','')::smallint,
        coalesce(x.value->>'drawer_role','both'),
        coalesce(x.value->>'recipient_role','both'),null,null
 from jsonb_array_elements(p_library->'cards') x
 on conflict(couple_id,card_id) do update set
 title=excluded.title,description=excluded.description,timer_minutes=excluded.timer_minutes,
 drawer_role=excluded.drawer_role,recipient_role=excluded.recipient_role,
 drawer_user_id=null,recipient_user_id=null,updated_at=now();
end;$import$;
revoke all on function public.import_love_personal_sexual_cards(uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.import_love_personal_sexual_cards(uuid,jsonb)
 to authenticated;

-- Same 11-column shape as love_custom_challenges.
-- The user's new private draft replaces only SEXUEL in custom mode.
-- Legacy personal overrides are retained in their previous table, without deletion.
create or replace view couple_private.love_active_challenges as
 select cc.couple_id,cc.category,cc.card_id,cc.title,cc.description,
  cc.timer_minutes,cc.recipient_user_id,cc.updated_at,cc.drawer_user_id,
  cc.drawer_role,cc.recipient_role
 from public.love_custom_challenges cc
 join public.couples c on c.id=cc.couple_id
 where cc.category<>'SEXUEL'
   or (cc.category='SEXUEL' and c.sexual_card_mode='custom'
     and not exists(
      select 1 from public.love_personal_sexual_cards p
      where p.couple_id=cc.couple_id
     ))
 union all
 select pc.couple_id,'SEXUEL'::text,pc.card_id,pc.title,pc.description,
  pc.timer_minutes,pc.recipient_user_id,pc.updated_at,pc.drawer_user_id,
  pc.drawer_role,pc.recipient_role
 from public.love_personal_sexual_cards pc
 join public.couples c on c.id=pc.couple_id
 where c.sexual_card_mode='custom'
 union all
 select p.couple_id,'SEXUEL'::text,p.slot::smallint,p.title,p.description,
  p.timer_minutes::smallint,null::uuid,p.created_at,null::uuid,
  p.drawer_role,p.recipient_role
 from couple_private.love_auto_card_pool p
 join public.couples c on c.id=p.couple_id
   and c.challenge_cycle_number=p.cycle_number
 where c.sexual_card_mode='automatic';
revoke all on couple_private.love_active_challenges from public,anon,authenticated;
