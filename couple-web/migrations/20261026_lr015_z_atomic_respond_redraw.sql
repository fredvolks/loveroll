-- LR-015 phase 3 DRAFT: an atomic recipient decision + same-category replacement.
-- Requires phase 2 exclusion registry, LR-016 monthly pass quota and a coordinated
-- client. It must NOT be deployed until real PostgreSQL concurrency tests pass.
BEGIN;

-- Distinguish an unlimited refusal from a quota-limited pass.
ALTER TABLE public.couple_challenges
 DROP CONSTRAINT IF EXISTS couple_challenges_status_check;
ALTER TABLE public.couple_challenges
 ADD CONSTRAINT couple_challenges_status_check
 CHECK (status IN ('proposed','accepted','passed','refused','completed'));
ALTER TABLE public.couple_challenges
 ADD COLUMN IF NOT EXISTS refused_at timestamptz;
ALTER TABLE public.couple_challenges
 ADD COLUMN IF NOT EXISTS replaces_challenge_id uuid
 REFERENCES public.couple_challenges(id) ON DELETE SET NULL;

-- One replacement outcome per challenge. An unavailable pool stores NULL,
-- ensuring a retry after a network error does not create a second challenge.
CREATE TABLE IF NOT EXISTS public.love_challenge_redraws (
 origin_id uuid PRIMARY KEY REFERENCES public.couple_challenges(id) ON DELETE CASCADE,
 replacement_id uuid UNIQUE REFERENCES public.couple_challenges(id) ON DELETE SET NULL,
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 action text NOT NULL CHECK(action IN ('pass','refuse')),
 excluded boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.love_challenge_redraws ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.love_challenge_redraws FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.love_respond_and_redraw(
 p_challenge uuid,p_action text,p_exclude boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $replace$
DECLARE
 v_couple uuid; v_limit integer; v_used integer; v_cycle integer;
 v_owner uuid; v_no_repeat boolean; v_card integer; v_face integer;
 v_new_id uuid; v_status text; v_prior public.love_challenge_redraws%rowtype;
 v_old public.couple_challenges%rowtype; v_session public.couple_sessions%rowtype;
 chosen public.love_custom_challenges%rowtype;
 original public.love_base_challenges%rowtype;
 v_month text:=to_char(now() AT TIME ZONE 'America/Toronto','YYYY-MM');
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('pass','refuse')
    OR (p_action='pass' AND p_exclude IS TRUE) THEN
  RAISE EXCEPTION 'Action de remplacement invalide';
 END IF;

 SELECT q.couple_id INTO v_couple
 FROM public.couple_challenges q WHERE q.id=p_challenge;
 IF NOT FOUND OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Défi inaccessible';
 END IF;
 -- Same lock order as normal draws: couple first, then session/challenge.
 SELECT c.monthly_pass_limit,c.challenge_cycle_number,c.owner_user_id,
        coalesce(c.no_repeat_challenges,true)
 INTO v_limit,v_cycle,v_owner,v_no_repeat
 FROM public.couples c WHERE c.id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 SELECT * INTO v_old FROM public.couple_challenges q
 WHERE q.id=p_challenge AND q.couple_id=v_couple FOR UPDATE;
 IF NOT FOUND OR v_old.recipient IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'Seul le destinataire peut répondre';
 END IF;
 -- Idempotent response to repeated taps and post-reconnect retries.
 SELECT * INTO v_prior FROM public.love_challenge_redraws r
 WHERE r.origin_id=p_challenge;
 IF FOUND THEN
  RETURN jsonb_build_object(
   'original_id',p_challenge,'action',v_prior.action,
   'excluded',v_prior.excluded,'replacement_id',v_prior.replacement_id,
   'already_processed',true
  );
 END IF;
 SELECT * INTO v_session FROM public.couple_sessions s
 WHERE s.id=v_old.session_id AND s.couple_id=v_couple FOR UPDATE;
 IF NOT FOUND OR v_session.finished_at IS NOT NULL THEN
  RAISE EXCEPTION 'Cette soirée est clôturée';
 END IF;
 IF v_old.status NOT IN ('proposed','accepted') THEN
  RAISE EXCEPTION 'Défi déjà terminé ou répondu';
 END IF;

 IF p_action='pass' THEN
  SELECT count(*)::integer INTO v_used
  FROM public.couple_challenges q
  WHERE q.couple_id=v_couple AND q.recipient=v_old.recipient
    AND q.status='passed' AND q.passed_at IS NOT NULL
    AND to_char(q.passed_at AT TIME ZONE 'America/Toronto','YYYY-MM')=v_month;
  IF v_used>=v_limit THEN
   RAISE EXCEPTION 'Limite mensuelle de passes atteinte (% / %)',v_used,v_limit;
  END IF;
 END IF;
 v_status:=CASE WHEN p_action='pass' THEN 'passed' ELSE 'refused' END;
 UPDATE public.couple_challenges
 SET status=v_status,refused_at=CASE WHEN p_action='refuse' THEN now() ELSE refused_at END
 WHERE id=p_challenge;

 IF p_action='refuse' AND p_exclude IS TRUE THEN
  INSERT INTO public.love_cycle_excluded_cards(
   couple_id,cycle_number,category,card_id,excluded_by
  ) VALUES(v_couple,v_cycle,v_old.category,v_old.card_id,(select auth.uid()))
  ON CONFLICT(couple_id,cycle_number,category,card_id) DO NOTHING;
 ELSE
  -- Keep this historical occurrence, but permit the card in a later night.
  DELETE FROM public.love_card_draw_history h
  WHERE h.couple_id=v_couple AND h.recipient_user_id=v_old.recipient
   AND h.category=v_old.category AND h.card_id=v_old.card_id;
 END IF;

 -- New challenge MUST stay in the original category and recipient's turn.
 -- Same-night cards (even passed/refused) and cycle exclusions are ineligible.
 SELECT candidate.card INTO v_card
 FROM generate_series(1,100) AS candidate(card)
 WHERE (candidate.card<=25 OR EXISTS(
  SELECT 1 FROM couple_private.love_active_challenges cc
  WHERE cc.couple_id=v_couple AND cc.category=v_old.category
   AND cc.card_id=candidate.card))
 AND NOT EXISTS(
  SELECT 1 FROM couple_private.love_active_challenges cc
  WHERE cc.couple_id=v_couple AND cc.category=v_old.category
   AND cc.card_id=candidate.card AND (
    NOT couple_private.love_role_allows(cc.recipient_role,v_old.recipient,v_owner)
    OR NOT couple_private.love_role_allows(cc.drawer_role,v_old.offered_by,v_owner)
    OR (cc.recipient_user_id IS NOT NULL AND cc.recipient_user_id<>v_old.recipient)
    OR (cc.drawer_user_id IS NOT NULL AND cc.drawer_user_id<>v_old.offered_by)))
 AND NOT EXISTS(
  SELECT 1 FROM public.love_cycle_excluded_cards ex
  WHERE ex.couple_id=v_couple AND ex.cycle_number=v_cycle
   AND ex.category=v_old.category AND ex.card_id=candidate.card)
 AND (NOT v_no_repeat OR NOT EXISTS(
  SELECT 1 FROM public.love_card_draw_history h
  WHERE h.couple_id=v_couple AND h.recipient_user_id=v_old.recipient
   AND h.category=v_old.category AND h.card_id=candidate.card))
 AND NOT EXISTS(
  SELECT 1 FROM public.couple_challenges seen
  WHERE seen.session_id=v_old.session_id AND seen.recipient=v_old.recipient
   AND seen.category=v_old.category AND seen.card_id=candidate.card)
 ORDER BY random() LIMIT 1;

 -- An exhausted lot cannot consume a pass or a refusal: the raised
 -- exception rolls back the status, pass stamp, exclusions and history.
 -- The client can offer to restore a deliberately excluded card.
 IF v_card IS NULL THEN
  RAISE EXCEPTION 'Aucun autre défi admissible dans cette catégorie pour ce soir';
 END IF;
 IF v_card IS NOT NULL THEN
  -- Avoid a duplicate official D100 face in the same person's category/night.
  SELECT possible.face INTO v_face
  FROM generate_series(1,100) AS possible(face)
  WHERE NOT EXISTS(
   SELECT 1 FROM public.couple_challenges used
   WHERE used.session_id=v_old.session_id AND used.recipient=v_old.recipient
     AND used.category=v_old.category AND used.face=possible.face)
  ORDER BY random() LIMIT 1;
  IF v_face IS NULL THEN
   RAISE EXCEPTION 'Aucune face D100 disponible pour cette soirée';
  END IF;
  SELECT * INTO chosen FROM couple_private.love_active_challenges cc
  WHERE cc.couple_id=v_couple AND cc.category=v_old.category AND cc.card_id=v_card;
  IF chosen.card_id IS NULL AND v_card<=25 THEN
   SELECT * INTO original FROM public.love_base_challenges bc
   WHERE bc.category=v_old.category AND bc.card_id=v_card;
   IF original.card_id IS NULL THEN RAISE EXCEPTION 'Carte officielle manquante'; END IF;
  END IF;
  INSERT INTO public.couple_challenges(
   session_id,couple_id,offered_by,recipient,category,face,card_id,
   card_title,card_description,card_timer_minutes,is_gifted,replaces_challenge_id
  ) VALUES(
   v_old.session_id,v_couple,v_old.offered_by,v_old.recipient,
   v_old.category,v_face,v_card,
   coalesce(chosen.title,original.title),
   coalesce(chosen.description,original.description),
   CASE WHEN chosen.card_id IS NOT NULL THEN chosen.timer_minutes
        ELSE original.timer_minutes END,
   coalesce(v_old.is_gifted,false),p_challenge
  ) RETURNING id INTO v_new_id;
  IF v_no_repeat THEN
   INSERT INTO public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
   VALUES(v_couple,v_old.recipient,v_old.category,v_card)
   ON CONFLICT(couple_id,recipient_user_id,category,card_id) DO NOTHING;
  END IF;
 END IF;

 INSERT INTO public.love_challenge_redraws(
  origin_id,replacement_id,couple_id,actor_id,action,excluded
 ) VALUES(p_challenge,v_new_id,v_couple,(select auth.uid()),p_action,
          p_action='refuse' AND p_exclude IS TRUE);
 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(v_couple,'challenge',(select auth.uid()),
        CASE WHEN p_action='refuse' THEN 'Défi refusé' ELSE 'Défi passé' END);
 RETURN jsonb_build_object(
  'original_id',p_challenge,'action',p_action,
  'excluded',p_action='refuse' AND p_exclude IS TRUE,
  'replacement_id',v_new_id,'replacement_unavailable',v_new_id IS NULL,
  'already_processed',false
 );
END;
$replace$;
REVOKE ALL ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 TO authenticated;

-- Keep the ordinary D100 flow consistent with refused turns and cycle-scoped
-- exclusions. Based on the latest standalone draw definition from LR-015 #53.
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
 v_cycle integer;
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
   category_weights_enabled,category_preference_percent,challenge_cycle_number
 into v_no_repeat,owner_id,v_category_enabled,v_category_percent,v_cycle
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
   where session_id=p_session and (case when s.self_draws then recipient=first_user else offered_by=first_user end) and status NOT IN ('passed','refused');
  select count(*) into second_done from public.couple_challenges
   where session_id=p_session and (case when s.self_draws then recipient=second_user else offered_by=second_user end) and status NOT IN ('passed','refused');
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
   where cc.session_id=p_session and cc.recipient=auth.uid() and cc.status NOT IN ('passed','refused');
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
    select 1 from public.love_cycle_excluded_cards ex
    where ex.couple_id=s.couple_id and ex.cycle_number=v_cycle
      and ex.category=cats.category and ex.card_id=candidate.card)
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
   and not exists(
    select 1 from public.love_cycle_excluded_cards ex
    where ex.couple_id=s.couple_id and ex.cycle_number=v_cycle
      and ex.category=v_cat and ex.card_id=card)
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
 and not exists(
   select 1 from public.love_cycle_excluded_cards ex
   where ex.couple_id=s.couple_id and ex.cycle_number=v_cycle
     and ex.category=v_cat and ex.card_id=card)
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

-- Readiness feature gate: the client must never display refusal controls
-- before the atomic transaction RPC exists and the owning migrations are live.
CREATE OR REPLACE FUNCTION public.love_redraw_capabilities(p_couple uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $ready$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL OR p_couple IS NULL
   OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 RETURN true;
END;
$ready$;
REVOKE ALL ON FUNCTION public.love_redraw_capabilities(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_redraw_capabilities(uuid) TO authenticated;

-- Shared queue counts must exclude BOTH passed and refused occurrences.
-- Otherwise partners could see different numbers of remaining D6 draws.
CREATE OR REPLACE FUNCTION public.my_love_evening_board(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $board$
DECLARE s public.couple_sessions%rowtype;
 a uuid;b uuid; target_a int;target_b int;draw_a int;draw_b int;
 done_a int;done_b int;turn_uid uuid;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO s FROM public.couple_sessions WHERE id=p_session;
 IF NOT FOUND OR NOT couple_private.is_member(s.couple_id) THEN
  RAISE EXCEPTION 'Accès refusé';END IF;
 a:=coalesce(s.starting_user_id,s.opened_by);
 SELECT m.user_id INTO b FROM public.couple_members m
 WHERE m.couple_id=s.couple_id AND m.user_id<>a LIMIT 1;
 IF b IS NULL THEN RETURN jsonb_build_object('ready',false);END IF;
 SELECT pr.face+(SELECT count(*) FROM public.couple_challenge_gifts g
   WHERE g.session_id=p_session AND g.receiver_user_id=a)
   -(SELECT count(*) FROM public.couple_challenge_gifts g
   WHERE g.session_id=p_session AND g.donor_user_id=a)
 INTO target_a FROM public.couple_personal_rolls pr
 WHERE pr.session_id=p_session AND pr.user_id=a;
 SELECT pr.face+(SELECT count(*) FROM public.couple_challenge_gifts g
   WHERE g.session_id=p_session AND g.receiver_user_id=b)
   -(SELECT count(*) FROM public.couple_challenge_gifts g
   WHERE g.session_id=p_session AND g.donor_user_id=b)
 INTO target_b FROM public.couple_personal_rolls pr
 WHERE pr.session_id=p_session AND pr.user_id=b;
 IF target_a IS NULL OR target_b IS NULL THEN
  RETURN jsonb_build_object('ready',false,'first',a,'next',null,
   'targets','{}'::jsonb,'completed','{}'::jsonb,'drawn','{}'::jsonb);
 END IF;
 SELECT count(*) FILTER (WHERE recipient=a AND status NOT IN ('passed','refused')),
  count(*) FILTER (WHERE recipient=b AND status NOT IN ('passed','refused')),
  count(*) FILTER (WHERE recipient=a AND status='completed'),
  count(*) FILTER (WHERE recipient=b AND status='completed')
 INTO draw_a,draw_b,done_a,done_b
 FROM public.couple_challenges WHERE session_id=p_session;
 IF draw_a>=target_a AND draw_b>=target_b THEN turn_uid:=null;
 ELSIF draw_a>=target_a THEN turn_uid:=b;
 ELSIF draw_b>=target_b THEN turn_uid:=a;
 ELSIF draw_a<=draw_b THEN turn_uid:=a;
 ELSE turn_uid:=b;END IF;
 RETURN jsonb_build_object('ready',true,'first',a,'next',turn_uid,
  'finished',done_a>=target_a AND done_b>=target_b,
  'drawsFinished',draw_a>=target_a AND draw_b>=target_b,
  'targets',jsonb_build_object(a::text,target_a,b::text,target_b),
  'drawn',jsonb_build_object(a::text,draw_a,b::text,draw_b),
  'completed',jsonb_build_object(a::text,done_a,b::text,done_b),
  'remaining',jsonb_build_object(a::text,greatest(0,target_a-draw_a),
    b::text,greatest(0,target_b-draw_b)));
END;
$board$;
REVOKE ALL ON FUNCTION public.my_love_evening_board(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_love_evening_board(uuid) TO authenticated;


-- LR-015: stop older cached PWA clients from bypassing the replacement flow.
-- 'accepted' and 'completed' retain the existing, previously secured behavior.
CREATE OR REPLACE FUNCTION public.answer_challenge(p_id uuid,p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $answer$
DECLARE
 c public.couple_challenges%rowtype;
 v_couple uuid;
 v_limit integer;
 v_used integer;
 v_month text:=to_char(now() AT TIME ZONE 'America/Toronto','YYYY-MM');
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_status NOT IN ('accepted','passed','completed') THEN
  RAISE EXCEPTION 'Statut invalide';
 END IF;
 -- Compatibility for already installed PWAs: passing MUST use the very same
 -- atomic replacement, monthly quota and idempotency as the new client.
 -- Reuse its own couple-first locks; do not take a challenge lock here.
 IF p_status='passed' THEN
  PERFORM public.love_respond_and_redraw(p_id,'pass',false);
  RETURN;
 END IF;
 SELECT couple_id INTO v_couple FROM public.couple_challenges WHERE id=p_id;
 IF NOT FOUND OR v_couple IS NULL OR NOT couple_private.is_member(v_couple) THEN
  RAISE EXCEPTION 'Défi inaccessible';
 END IF;
 SELECT monthly_pass_limit INTO v_limit
 FROM public.couples WHERE id=v_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 SELECT * INTO c FROM public.couple_challenges
  WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR c.couple_id IS DISTINCT FROM v_couple
   OR c.recipient IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'Seul le destinataire peut répondre';
 END IF;
 -- A late timer callback or cached client must not rewrite the outcome
 -- of an evening once it is closed. Same couple -> challenge -> session
 -- lock order as love_respond_and_redraw, preventing cross-device races.
 PERFORM 1 FROM public.couple_sessions closed_session
 WHERE closed_session.id=c.session_id AND closed_session.couple_id=v_couple
   AND closed_session.finished_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cette soirée est clôturée'; END IF;
 IF p_status='completed' AND c.status<>'accepted' THEN
  RAISE EXCEPTION 'Acceptez d’abord le défi';
 END IF;
 IF c.status NOT IN ('proposed','accepted') THEN
  RAISE EXCEPTION 'Défi déjà terminé';
 END IF;
 IF p_status='passed' THEN
  SELECT count(*)::integer INTO v_used
  FROM public.couple_challenges q
  WHERE q.couple_id=v_couple AND q.recipient=c.recipient
    AND q.status='passed' AND q.passed_at IS NOT NULL
    AND to_char(q.passed_at AT TIME ZONE 'America/Toronto','YYYY-MM')=v_month;
  IF v_used>=v_limit THEN
   RAISE EXCEPTION 'Limite mensuelle de passes atteinte (% / %)',v_used,v_limit;
  END IF;
 END IF;
 -- Existing BEFORE UPDATE trigger stamps passed_at exactly on this transition.
 UPDATE public.couple_challenges SET status=p_status WHERE id=p_id;
 IF p_status='passed' THEN
  -- Preserve existing bag recycling until LR-015 replaces its turn logic
  -- with an atomic, idempotent replacement draw.
  DELETE FROM public.love_card_draw_history h
  WHERE h.couple_id=c.couple_id AND h.recipient_user_id=c.recipient
    AND h.category=c.category AND h.card_id=c.card_id;
 END IF;
END
$answer$;
REVOKE ALL ON FUNCTION public.answer_challenge(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.answer_challenge(uuid,text)
 TO authenticated;

-- LR-015: enrich the member-checked calendar with links only; no challenge
-- titles or private user content are exposed beyond existing calendar rights.
CREATE OR REPLACE FUNCTION public.love_evening_replacement_links(p_couple uuid)
RETURNS TABLE(origin_id uuid,replacement_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $links$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR (SELECT auth.uid()) IS NULL
   OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 RETURN QUERY
 SELECT r.origin_id,r.replacement_id FROM public.love_challenge_redraws r
 WHERE r.couple_id=p_couple AND r.replacement_id IS NOT NULL
 ORDER BY r.created_at,r.origin_id;
END;
$links$;
REVOKE ALL ON FUNCTION public.love_evening_replacement_links(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_evening_replacement_links(uuid)
 TO authenticated;

-- Existing calendar RPC signature is preserved. Only the meaning of "drawn"
-- changes to official occupied D6 slots; all historic occurrences remain in
-- the separate, append-only challenge history and passed count.
CREATE OR REPLACE FUNCTION public.love_evening_session_stats(p_couple uuid)
RETURNS TABLE(session_id uuid,user_id uuid,target integer,drawn integer,
 completed integer,incomplete integer,passed integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $stats$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès refusé';
 END IF;
 RETURN QUERY
 SELECT s.id,m.user_id,
  CASE WHEN r.face IS NULL THEN NULL::integer
   ELSE greatest(0,r.face::integer+
    (SELECT count(*)::integer FROM public.couple_challenge_gifts g
     WHERE g.session_id=s.id AND g.receiver_user_id=m.user_id)-
    (SELECT count(*)::integer FROM public.couple_challenge_gifts g
     WHERE g.session_id=s.id AND g.donor_user_id=m.user_id))
  END AS target,
  (SELECT count(*)::integer FROM public.couple_challenges q
   WHERE q.session_id=s.id AND q.recipient=m.user_id
    AND q.status NOT IN ('passed','refused')) AS drawn,
  (SELECT count(*)::integer FROM public.couple_challenges q
   WHERE q.session_id=s.id AND q.recipient=m.user_id
    AND q.status='completed') AS completed,
  (SELECT count(*)::integer FROM public.couple_challenges q
   WHERE q.session_id=s.id AND q.recipient=m.user_id
    AND q.status IN ('proposed','accepted')) AS incomplete,
  (SELECT count(*)::integer FROM public.couple_challenges q
   WHERE q.session_id=s.id AND q.recipient=m.user_id
    AND q.status='passed') AS passed
 FROM public.couple_sessions s
 JOIN public.couple_members m ON m.couple_id=s.couple_id
 LEFT JOIN public.couple_personal_rolls r ON r.session_id=s.id AND r.user_id=m.user_id
 WHERE s.couple_id=p_couple
 ORDER BY s.started_at DESC,m.user_id;
END;
$stats$;
REVOKE ALL ON FUNCTION public.love_evening_session_stats(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_evening_session_stats(uuid)
 TO authenticated;

COMMIT;
