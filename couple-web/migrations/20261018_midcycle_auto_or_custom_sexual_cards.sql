-- LoveRoll • source de vérité de la migration de sélection sexuelle.
-- À appliquer sur un schéma LoveRoll déjà installé (jamais sur Mon Wallet).
-- Deux styles différents => 50 cartes par style, tirées sans remise à la création
-- du bassin de 100. Sous-groupes him/her/both équilibrés dans chaque style.
-- Mode personnalisable n'importe quand: ne supprime ni historique ni défis pigés.
-- Les 100 SENSUEL existants et le 88/12 ne changent pas.
alter table public.couples
 add column if not exists sexual_card_mode text not null default 'custom'
 check (sexual_card_mode in ('automatic','custom'));

create table if not exists couple_private.love_auto_card_pool (
 couple_id uuid not null references public.couples(id) on delete cascade,
 cycle_number integer not null,
 slot smallint not null check (slot between 1 and 100),
 style_pair text not null,
 source_style text not null check (source_style in ('soft','medium','intense')),
 source_card_id integer not null check (source_card_id between 1 and 100),
 title text not null,
 description text not null,
 timer_minutes integer,
 drawer_role text not null,
 recipient_role text not null,
 created_at timestamptz not null default now(),
 primary key (couple_id,cycle_number,slot)
);
revoke all on couple_private.love_auto_card_pool from public,anon,authenticated;

CREATE OR REPLACE FUNCTION couple_private.ensure_love_style_pool(p_couple uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_styles text[];
 v_pair text;
 v_cycle integer;
 v_count integer;
 v_pair_check text;
 v_needed integer;
begin
 select challenge_cycle_number into v_cycle from public.couples where id=p_couple;
 if not found then raise exception 'Duo introuvable'; end if;
 select array_agg(q.play_style order by q.play_style) into v_styles from (
  select coalesce(p.play_style,'medium') as play_style
  from public.couple_members m
  join public.couple_profiles p on p.id=m.user_id
  where m.couple_id=p_couple
  order by m.joined_at,m.user_id
  limit 2
 ) q;
 if array_length(v_styles,1) is distinct from 2
   or v_styles[1] not in ('soft','medium','intense')
   or v_styles[2] not in ('soft','medium','intense')
 then raise exception 'Les deux partenaires doivent choisir un style'; end if;
 v_pair:=v_styles[1]||'|'||v_styles[2];
 select count(*),min(style_pair) into v_count,v_pair_check
 from couple_private.love_auto_card_pool
 where couple_id=p_couple and cycle_number=v_cycle;
 if v_count=100 and v_pair_check=v_pair then return;end if;

 v_needed:=case when v_styles[1]=v_styles[2] then 100 else 50 end;
 if exists (
  select 1 from (select distinct unnest(v_styles) as style) st
  where (select count(*) from public.love_future_style_cards f
         where f.couple_id=p_couple and f.category='SEXUEL' and f.style=st.style)<v_needed
 ) then raise exception 'Bibliothèque de style incomplète';end if;
 delete from couple_private.love_auto_card_pool where couple_id=p_couple and cycle_number=v_cycle;
 with sampled as (
  select f.*,
   row_number() over(partition by f.style,f.drawer_role order by random()) as position,
   count(*) over(partition by f.style,f.drawer_role) as role_total
  from public.love_future_style_cards f
  where f.couple_id=p_couple and f.category='SEXUEL' and f.style=any(v_styles)
 ), fifty_or_hundred as (
  select * from sampled where position<=case when v_styles[1]=v_styles[2] then role_total else role_total/2 end
 ), allocated as (
  select *,row_number() over(order by random())::smallint as slot
  from fifty_or_hundred
 )
 insert into couple_private.love_auto_card_pool(
  couple_id,cycle_number,slot,style_pair,source_style,source_card_id,
  title,description,timer_minutes,drawer_role,recipient_role)
 select p_couple,v_cycle,a.slot,v_pair,a.style,a.card_id,
        a.title,a.description,a.timer_minutes,a.drawer_role,a.recipient_role
 from allocated a;
 get diagnostics v_count=row_count;
 if v_count<>100 then raise exception 'Le lot automatique doit contenir exactement 100 cartes, reçu %',v_count;end if;
end;$function$;

revoke all on function couple_private.ensure_love_style_pool(uuid) from public,anon,authenticated;

create or replace view couple_private.love_active_challenges as
SELECT cc.couple_id,
    cc.category,
    cc.card_id,
    cc.title,
    cc.description,
    cc.timer_minutes,
    cc.recipient_user_id,
    cc.updated_at,
    cc.drawer_user_id,
    cc.drawer_role,
    cc.recipient_role
   FROM love_custom_challenges cc
     JOIN couples c ON c.id = cc.couple_id
  WHERE cc.category <> 'SEXUEL'::text OR c.sexual_card_mode = 'custom'::text
UNION ALL
 SELECT p.couple_id,
    'SEXUEL'::text AS category,
    p.slot AS card_id,
    p.title,
    p.description,
    p.timer_minutes::smallint AS timer_minutes,
    NULL::uuid AS recipient_user_id,
    p.created_at AS updated_at,
    NULL::uuid AS drawer_user_id,
    p.drawer_role,
    p.recipient_role
   FROM couple_private.love_auto_card_pool p
     JOIN couples c ON c.id = p.couple_id AND c.challenge_cycle_number = p.cycle_number
  WHERE c.sexual_card_mode = 'automatic'::text;

revoke all on couple_private.love_active_challenges from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.set_love_sexual_card_mode(p_couple uuid, p_mode text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_owner uuid;
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null or p_mode not in ('automatic','custom')
 then raise exception 'Mode inconnu ou connexion requise'; end if;
 select c.owner_user_id into v_owner
 from public.couples c where c.id=p_couple for update;
 if not found or v_owner is distinct from auth.uid()
   or not couple_private.is_member(p_couple)
 then raise exception 'Réservé à l’administrateur de ce duo';end if;
 if p_mode='automatic' then
  perform couple_private.ensure_love_style_pool(p_couple);
 end if;
 update public.couples set sexual_card_mode=p_mode where id=p_couple;
 return p_mode;
end;$function$;

revoke all on function public.set_love_sexual_card_mode(uuid,text) from public,anon,authenticated;
grant execute on function public.set_love_sexual_card_mode(uuid,text) to authenticated;

-- Modification minimale du moteur officiel : la sélection de catégorie et le
-- tirage D100 restent inchangés; le catalogue privé décide seulement la carte.
CREATE OR REPLACE FUNCTION public.draw_for_partner(p_session uuid, p_preference text, p_random boolean DEFAULT false)
 RETURNS couple_challenges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 cats text[]:=array[]::text[]; weights integer[]:=array[]::integer[];
 total integer:=0; ticket integer; i integer; cid integer; d100 integer;
 chosen public.love_custom_challenges%rowtype;
 original public.love_base_challenges%rowtype;
 rowout public.couple_challenges%rowtype; capacity integer; v_no_repeat boolean; owner_id uuid;
 v_category_enabled boolean; v_category_percent integer;
 first_user uuid; second_user uuid; first_done integer; second_done integer;
 first_target integer; second_target integer; next_giver uuid;
 base_turns integer; donated_turns integer; completed_by_me integer; gifted_turn boolean:=false;
BEGIN
 PERFORM public.love_require_verified_identity();
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then
  raise exception 'Soirée inaccessible';end if;
 if (select challenge_cycle_pending from public.couples where id=s.couple_id) then
  raise exception 'Le bilan des 200 défis attend les réponses du duo';
 end if;
 if p_preference not in ('SENSUEL','SEXUEL') then
  raise exception 'Catégorie inconnue';end if;
 -- Lock the couple to serialize admin edits, draw-rule changes and both partners' picks.
 select coalesce(no_repeat_challenges,true),owner_user_id,
   category_weights_enabled,category_preference_percent
 into v_no_repeat,owner_id,v_category_enabled,v_category_percent
 from public.couples where id=s.couple_id for update;
 perform 1 from public.couple_sessions where id=p_session for update;
 select user_id into target from public.couple_members
  where couple_id=s.couple_id and user_id<>auth.uid();
 if target is null then raise exception 'Partenaire absent';end if;
 if s.self_draws then target:=auth.uid();end if;
 if (select count(*) from public.couple_personal_rolls
     where session_id=p_session)<>2 then
  raise exception 'Attendre les deux D6 personnels';end if;
 if s.paired_turns then
  -- Queue several personal challenges; progress/alternation counts assigned draws,
  -- not completed tasks. The two partners can play the queue later.
  first_user:=coalesce(s.starting_user_id,s.opened_by);
  select user_id into second_user from public.couple_members
   where couple_id=s.couple_id and user_id<>first_user;
  select pr.face
      + (select count(*) from public.couple_challenge_gifts g where g.session_id=p_session and g.receiver_user_id=first_user)
      - (select count(*) from public.couple_challenge_gifts g where g.session_id=p_session and g.donor_user_id=first_user)
   into first_target from public.couple_personal_rolls pr
   where pr.session_id=p_session and pr.user_id=first_user;
  select pr.face
      + (select count(*) from public.couple_challenge_gifts g where g.session_id=p_session and g.receiver_user_id=second_user)
      - (select count(*) from public.couple_challenge_gifts g where g.session_id=p_session and g.donor_user_id=second_user)
   into second_target from public.couple_personal_rolls pr
   where pr.session_id=p_session and pr.user_id=second_user;
  select count(*) into first_done from public.couple_challenges
   where session_id=p_session and (case when s.self_draws then recipient=first_user else offered_by=first_user end) and status<>'passed';
  select count(*) into second_done from public.couple_challenges
   where session_id=p_session and (case when s.self_draws then recipient=second_user else offered_by=second_user end) and status<>'passed';
  if first_target is null or second_target is null
   then raise exception 'Attendez les deux lancers personnels';end if;
  if first_done>=first_target and second_done>=second_target
   then raise exception 'Tous les défis de la soirée sont déjà pigés';end if;
  if first_done>=first_target then next_giver:=second_user;
  elsif second_done>=second_target then next_giver:=first_user;
  elsif first_done<=second_done then next_giver:=first_user;
  else next_giver:=second_user;end if;
  if auth.uid()<>next_giver
   then raise exception 'Ce n’est pas votre tour : attendez le lancer de votre partenaire';end if;
 else
  -- Sessions opened before this update preserve the previous rules.
  if exists(select 1 from public.couple_challenges
   where session_id=p_session and recipient=target and status in ('proposed','accepted'))
   then raise exception 'Attendre la réponse au défi précédent';end if;
  if (select count(*) from public.couple_challenges
   where session_id=p_session and recipient=target and status='completed') >=
     (select face from public.couple_personal_rolls
      where session_id=p_session and user_id=target)
   then raise exception 'Défis terminés';end if;
 end if;
 if s.self_draws then
  -- The recipient chooses the category unconditionally for a transferred
  -- challenge, after their ordinary remaining turns have been completed.
  select pr.face into base_turns from public.couple_personal_rolls pr
   where pr.session_id=p_session and pr.user_id=auth.uid();
  select count(*) into donated_turns from public.couple_challenge_gifts g
   where g.session_id=p_session and g.donor_user_id=auth.uid();
  select count(*) into completed_by_me from public.couple_challenges cc
   where cc.session_id=p_session and cc.recipient=auth.uid() and cc.status<>'passed';
  gifted_turn:=completed_by_me>=greatest(0,base_turns-donated_turns)
   and exists(select 1 from public.couple_challenge_gifts g
    where g.session_id=p_session and g.receiver_user_id=auth.uid());
 end if;
 -- Prepare or refresh the 100-card automatic pool from the two live styles.
 -- Called AFTER locking couples so concurrent draws cannot reshuffle.
 if (select c.sexual_card_mode from public.couples c where c.id=s.couple_id)='automatic' then
  perform couple_private.ensure_love_style_pool(s.couple_id);
 end if;
 -- A persistent shuffle bag, per couple + recipient, spanning evenings.
 -- Reset ONLY when every currently eligible card across BOTH categories has been drawn.
 if v_no_repeat and not exists(
  select 1 from (values ('SENSUEL'::text),('SEXUEL'::text)) cats(category)
  cross join generate_series(1,100) candidate(card)
  where (candidate.card<=25 or exists(
    select 1 from couple_private.love_active_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card))
   and not exists(
    select 1 from couple_private.love_active_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card
      and ((not couple_private.love_role_allows(cc.recipient_role,target,owner_id))
        or (not couple_private.love_role_allows(cc.drawer_role,auth.uid(),owner_id))
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
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
  select count(*) into capacity from generate_series(1,100) card
   where (card<=25 or exists(
    select 1 from couple_private.love_active_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
   and not exists(
    select 1 from couple_private.love_active_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
      and ((not couple_private.love_role_allows(cc.recipient_role,target,owner_id))
        or (not couple_private.love_role_allows(cc.drawer_role,auth.uid(),owner_id))
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
        or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
   and (not v_no_repeat or not exists(
    select 1 from public.love_card_draw_history history
    where history.couple_id=s.couple_id and history.recipient_user_id=target
     and history.category=v_cat and history.card_id=card))
   and not exists(select 1 from public.couple_challenges used
    where used.session_id=p_session and used.recipient=target
     and used.category=v_cat and used.card_id=card and used.status<>'passed');
  if capacity>0 and (not gifted_turn or p_random or v_cat=p_preference) then
   cats:=array_append(cats,v_cat);
   weights:=array_append(weights,
    case when gifted_turn and not p_random then 100
         when p_random then 50
         when not coalesce(v_category_enabled,true) then 50
         when v_cat=p_preference then v_category_percent
         else 100-v_category_percent end);
   total:=total+weights[array_length(weights,1)];
  end if;
 end loop;
 if total=0 then raise exception 'Toutes les cartes ont déjà été proposées';end if;
 ticket:=floor(random()*total)::integer;
 for i in 1..array_length(cats,1) loop
  if ticket<weights[i] then v_cat:=cats[i];exit;end if;
  ticket:=ticket-weights[i];
 end loop;
 select card into cid from generate_series(1,100) card
 where (card<=25 or exists(
  select 1 from couple_private.love_active_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
 and not exists(
    select 1 from couple_private.love_active_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
     and ((not couple_private.love_role_allows(cc.recipient_role,target,owner_id))
        or (not couple_private.love_role_allows(cc.drawer_role,auth.uid(),owner_id))
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
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
 d100:=floor(random()*100)::integer+1;
 select * into chosen from couple_private.love_active_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=cid;
 if chosen.card_id is null and cid<=25 then
  select * into original from public.love_base_challenges bc
  where bc.category=v_cat and bc.card_id=cid;
  if original.card_id is null then raise exception 'Carte officielle manquante';end if;
 end if;
 insert into public.couple_challenges(
  session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,card_timer_minutes,is_gifted)
 values(p_session,s.couple_id,(case when s.self_draws then (select m.user_id from public.couple_members m where m.couple_id=s.couple_id and m.user_id<>auth.uid()) else auth.uid() end),target,v_cat,d100,cid,
  coalesce(chosen.title,original.title),
  coalesce(chosen.description,original.description),
  case when chosen.card_id is not null then chosen.timer_minutes
   else original.timer_minutes end, gifted_turn)
 returning * into rowout;
 if v_no_repeat then
  insert into public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
  values(s.couple_id,target,v_cat,cid)
  on conflict(couple_id,recipient_user_id,category,card_id) do nothing;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi offert');
 return rowout;
end;$function$;

