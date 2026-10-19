-- LoveRoll shared couple gameplay: one weekly result (already unique by couple/week),
-- both personal draws before reveal, and serialized alternating challenge offers.
-- Existing active sessions retain legacy behavior; NEW sessions use paired_turns=true.
alter table public.couple_sessions
 add column if not exists paired_turns boolean not null default false;
comment on column public.couple_sessions.paired_turns is
 'True for sequential A-B-A-B challenge offerings: completed offers advance turn; passed cards can be retried.';

CREATE OR REPLACE FUNCTION public.ensure_couple_session(p_couple uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare id_now uuid;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé'; end if;
 perform 1 from public.couples where id=p_couple for update;
 select id into id_now from public.couple_sessions where couple_id=p_couple
   and finished_at is null;
 if id_now is null then
  -- Never create more sessions in the current week than the weekly D6 allows.
  declare
   start_week date := ((now() at time zone 'America/Toronto')::date -
     (extract(isodow from (now() at time zone 'America/Toronto')::date)::int - 1));
   limit_week int;
   already int;
  begin
   select face into limit_week from public.couple_rolls
    where couple_id=p_couple and kind='weekly'
      and key=to_char(start_week,'YYYY-MM-DD');
   if limit_week is null then raise exception 'Brassez d’abord le dé de la semaine'; end if;
   select count(*) into already from public.couple_sessions
    where couple_id=p_couple and counted=true
      and (started_at at time zone 'America/Toronto')::date>=start_week;
   if already>=limit_week then raise exception 'Rituel de la semaine déjà complété'; end if;
  end;
  insert into public.couple_sessions(couple_id,opened_by,paired_turns)
   values(p_couple,auth.uid(),true) returning id into id_now;
  insert into public.couple_events(couple_id,event_type,actor_id,title)
   values(p_couple,'session',auth.uid(),'Soirée commencée');
 end if;
 return id_now;
end; $function$
;

CREATE OR REPLACE FUNCTION public.draw_for_partner(p_session uuid, p_preference text, p_random boolean DEFAULT false)
 RETURNS couple_challenges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 cats text[]:=array[]::text[]; weights integer[]:=array[]::integer[];
 total integer:=0; ticket integer; i integer; cid integer; d35 integer;
 chosen public.love_custom_challenges%rowtype;
 original public.love_base_challenges%rowtype;
 rowout public.couple_challenges%rowtype; capacity integer; v_no_repeat boolean; owner_id uuid;
 first_user uuid; second_user uuid; first_done integer; second_done integer;
 first_target integer; second_target integer; next_giver uuid;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then
  raise exception 'Soirée inaccessible';end if;
 if p_preference not in ('SENSUEL','SEXUEL') then
  raise exception 'Catégorie inconnue';end if;
 -- Lock the couple to serialize admin edits, draw-rule changes and both partners' picks.
 select coalesce(no_repeat_challenges,true),owner_user_id into v_no_repeat,owner_id
 from public.couples where id=s.couple_id for update;
 perform 1 from public.couple_sessions where id=p_session for update;
 select user_id into target from public.couple_members
  where couple_id=s.couple_id and user_id<>auth.uid();
 if target is null then raise exception 'Partenaire absent';end if;
 if (select count(*) from public.couple_personal_rolls
     where session_id=p_session and user_id in (auth.uid(),target))<>2 then
  raise exception 'Attendre les deux D6 personnels';end if;
 if s.paired_turns then
  -- All couples share ONE active challenge. Wait for the recipient's answer.
  if exists(select 1 from public.couple_challenges
    where session_id=p_session and status in ('proposed','accepted'))
  then raise exception 'Attendez la réponse au défi en cours avant le prochain lancer'; end if;

  first_user:=s.opened_by;
  select user_id into second_user from public.couple_members
   where couple_id=s.couple_id and user_id<>first_user;
  select face into first_target from public.couple_personal_rolls
   where session_id=p_session and user_id=first_user;
  select face into second_target from public.couple_personal_rolls
   where session_id=p_session and user_id=second_user;
  select count(*) into first_done from public.couple_challenges
   where session_id=p_session and offered_by=first_user and status='completed';
  select count(*) into second_done from public.couple_challenges
   where session_id=p_session and offered_by=second_user and status='completed';
  if first_target is null or second_target is null
   then raise exception 'Attendez les deux lancers personnels';end if;
  if first_done>=first_target and second_done>=second_target
   then raise exception 'Tous les défis de la soirée sont terminés';end if;
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
      and ((cc.recipient_role='owner' and target<>owner_id)
        or (cc.recipient_role='partner' and target=owner_id)
        or (cc.drawer_role='owner' and auth.uid()<>owner_id)
        or (cc.drawer_role='partner' and auth.uid()=owner_id)
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
  select count(*) into capacity from generate_series(1,35) card
   where (card<=25 or exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
   and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
      and ((cc.recipient_role='owner' and target<>owner_id)
        or (cc.recipient_role='partner' and target=owner_id)
        or (cc.drawer_role='owner' and auth.uid()<>owner_id)
        or (cc.drawer_role='partner' and auth.uid()=owner_id)
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
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
   weights:=array_append(weights,case when v_cat=p_preference then 88 else 12 end);
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
     and ((cc.recipient_role='owner' and target<>owner_id)
        or (cc.recipient_role='partner' and target=owner_id)
        or (cc.drawer_role='owner' and auth.uid()<>owner_id)
        or (cc.drawer_role='partner' and auth.uid()=owner_id)
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
 d35:=floor(random()*35)::integer+1;
 select * into chosen from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=cid;
 if chosen.card_id is null and cid<=25 then
  select * into original from public.love_base_challenges bc
  where bc.category=v_cat and bc.card_id=cid;
  if original.card_id is null then raise exception 'Carte officielle manquante';end if;
 end if;
 insert into public.couple_challenges(
  session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,card_timer_minutes)
 values(p_session,s.couple_id,auth.uid(),target,v_cat,d35,cid,
  coalesce(chosen.title,original.title),
  coalesce(chosen.description,original.description),
  case when chosen.card_id is not null then chosen.timer_minutes
   else original.timer_minutes end)
 returning * into rowout;
 if v_no_repeat then
  insert into public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
  values(s.couple_id,target,v_cat,cid)
  on conflict(couple_id,recipient_user_id,category,card_id) do nothing;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi offert');
 return rowout;
end;$function$
;

CREATE OR REPLACE FUNCTION public.finish_couple_session(p_session uuid, p_count boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c uuid; member uuid; target int; done int; paired boolean;
begin
 select couple_id into c from public.couple_sessions
  where id=p_session and finished_at is null for update;
 if c is null or not couple_private.is_member(c) then
  raise exception 'Soirée inaccessible'; end if;
 select paired_turns into paired from public.couple_sessions where id=p_session;
 if p_count then
  if (select count(*) from public.couple_members where couple_id=c)<>2 then
   raise exception 'Votre partenaire doit être connecté'; end if;
  for member in select user_id from public.couple_members where couple_id=c loop
   select face into target from public.couple_personal_rolls
    where session_id=p_session and user_id=member;
   if target is null then raise exception 'Les deux D6 sont nécessaires';end if;
   select count(*) into done from public.couple_challenges
    where session_id=p_session and status='completed'
      and (case when paired then offered_by=member else recipient=member end);
   if done<target then raise exception 'Il reste des défis à terminer';end if;
  end loop;
 end if;
 update public.couple_sessions set finished_at=now(), counted=p_count where id=p_session;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(c,'session',auth.uid(),
   case when p_count then 'Soirée terminée et comptée' else 'Soirée arrêtée sans la compter' end);
end; $function$
;
