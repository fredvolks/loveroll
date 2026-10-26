-- LR-015, phase 1: return non-completed cards to the eligible draw bag
-- only upon an actual evening closure. Keep challenge occurrences/history immutable.
-- IMPORTANT: this does not yet implement rejected/excluded cards or replacement
-- turns, which must be delivered together with the coordinated client / LR-016.
BEGIN;

CREATE OR REPLACE FUNCTION public.close_love_evening_preserve(p_session uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $close$
DECLARE v_couple uuid; v_closed boolean;
BEGIN
 PERFORM public.love_require_verified_identity();
 -- Read identifier before any lock, then use the same lock order as
 -- draw_for_partner (couple FIRST, session SECOND) to avoid deadlocks.
 SELECT s.couple_id INTO v_couple
 FROM public.couple_sessions s WHERE s.id=p_session;
 IF v_couple IS NULL OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Soirée inaccessible';
 END IF;
 PERFORM 1 FROM public.couples WHERE id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 SELECT s.finished_at IS NOT NULL INTO v_closed
 FROM public.couple_sessions s
 WHERE s.id=p_session AND s.couple_id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Soirée introuvable'; END IF;
 -- Two clients closing the same session may race. The second call is
 -- idempotent: no second history recycle and no duplicate event.
 IF v_closed THEN RETURN; END IF;

 UPDATE public.couple_sessions SET finished_at=now(), counted=true
 WHERE id=p_session AND couple_id=v_couple AND finished_at IS NULL;

 -- Every route that sets finished_at fires the same AFTER UPDATE trigger,
 -- including this early close and finish_couple_session(p_count=false). No
 -- duplicate deletion, and completed cards of this cycle stay in the bag.
 -- A partially completed but counted night may still finish the 200-card
 -- cycle; preserve the same pending questionnaire logic as normal closure.
 UPDATE public.couples c SET challenge_cycle_pending=true
 WHERE c.id=v_couple
   AND (SELECT count(*) FROM public.couple_challenges done
    JOIN public.couple_sessions ds ON ds.id=done.session_id
    WHERE done.couple_id=v_couple AND done.status='completed'
      AND ds.counted=true AND ds.started_at>=c.challenge_cycle_started_at)
       >=c.challenge_cycle_target;

 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(v_couple,'session',auth.uid(),'Soirée clôturée · résultats conservés');
END;
$close$;

REVOKE ALL ON FUNCTION public.close_love_evening_preserve(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.close_love_evening_preserve(uuid)
 TO authenticated;

-- All closure paths, not only the new button, must recycle incomplete
-- cards exactly once when a session FIRST transitions from open to closed.
-- Existing finish_couple_session remains unchanged (including weekly limits).
CREATE OR REPLACE FUNCTION public.love_recycle_incomplete_after_close()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $recycle$
BEGIN
 IF OLD.finished_at IS NOT NULL OR NEW.finished_at IS NULL THEN RETURN NEW; END IF;
 -- Leave every challenge occurrence and calendar event untouched.
 -- Never release a card already completed at any time in the CURRENT
 -- 200-card cycle, even when the recent unfinished occurrence is abandoned.
 DELETE FROM public.love_card_draw_history h
 USING public.couple_challenges q, public.couples c
 WHERE q.session_id=NEW.id AND q.couple_id=NEW.couple_id
   AND q.status<>'completed'
   AND c.id=NEW.couple_id
   AND h.couple_id=NEW.couple_id
   AND h.recipient_user_id=q.recipient
   AND h.category=q.category AND h.card_id=q.card_id
   AND NOT EXISTS (
    SELECT 1 FROM public.couple_challenges done
    JOIN public.couple_sessions completed_session
      ON completed_session.id=done.session_id
    WHERE done.couple_id=NEW.couple_id
      AND done.recipient=q.recipient
      AND done.category=q.category AND done.card_id=q.card_id
      AND done.status='completed'
      AND completed_session.started_at>=c.challenge_cycle_started_at
   );
 RETURN NEW;
END;
$recycle$;
REVOKE ALL ON FUNCTION public.love_recycle_incomplete_after_close()
 FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS love_recycle_incomplete_close ON public.couple_sessions;
CREATE TRIGGER love_recycle_incomplete_close
AFTER UPDATE OF finished_at ON public.couple_sessions
FOR EACH ROW
WHEN (OLD.finished_at IS NULL AND NEW.finished_at IS NOT NULL)
EXECUTE FUNCTION public.love_recycle_incomplete_after_close();

-- LR-015 phase 1b: capacity and the final candidate query must agree.
-- A passed card must NOT be offered again in the same open evening. Prior
-- versions mistakenly counted passed cards as capacity and later excluded them
-- from the final SELECT, which could fail with 'Aucune carte disponible'.
-- The rest of this function is copied unchanged from the last existing
-- draw_for_partner definition in 20261018_midcycle_auto_or_custom_sexual_cards.sql.
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
     and used.category=v_cat and used.card_id=card);
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

COMMIT;
