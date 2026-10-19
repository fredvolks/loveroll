-- LoveRoll v111. Gender-aware card roles without replacing identities or existing cards.
BEGIN;
ALTER TABLE public.couple_profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.couple_profiles DROP CONSTRAINT IF EXISTS couple_profiles_gender_check;
ALTER TABLE public.couple_profiles ADD CONSTRAINT couple_profiles_gender_check CHECK (gender IS NULL OR gender IN ('him','her'));
ALTER TABLE public.love_custom_challenges DROP CONSTRAINT IF EXISTS love_custom_drawer_role_check;
ALTER TABLE public.love_custom_challenges ADD CONSTRAINT love_custom_drawer_role_check CHECK (drawer_role IN ('both','him','her','owner','partner'));
ALTER TABLE public.love_custom_challenges DROP CONSTRAINT IF EXISTS love_custom_recipient_role_check;
ALTER TABLE public.love_custom_challenges ADD CONSTRAINT love_custom_recipient_role_check CHECK (recipient_role IN ('both','him','her','owner','partner'));

-- Profile gender belongs to the authenticated person only.
CREATE OR REPLACE FUNCTION public.save_my_gender(p_gender text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_gender NOT IN ('him','her') OR p_gender IS NULL THEN RAISE EXCEPTION 'Genre invalide'; END IF;
 UPDATE public.couple_profiles SET gender=p_gender WHERE id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Créez votre profil avant de choisir le genre'; END IF;
END;$$;
REVOKE ALL ON FUNCTION public.save_my_gender(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_my_gender(text) TO authenticated;

-- This internal role checker supports both NEW gender roles and OLD user-position
-- roles for cards already saved. It never uses a display name for eligibility.
CREATE OR REPLACE FUNCTION couple_private.love_role_allows(p_role text,p_person uuid,p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE p_role
  WHEN 'both' THEN true
  WHEN 'owner' THEN p_person=p_owner
  WHEN 'partner' THEN p_person<>p_owner
  WHEN 'him' THEN EXISTS(SELECT 1 FROM public.couple_profiles p WHERE p.id=p_person AND p.gender='him')
  WHEN 'her' THEN EXISTS(SELECT 1 FROM public.couple_profiles p WHERE p.id=p_person AND p.gender='her')
  ELSE false END;
$$;
REVOKE ALL ON FUNCTION couple_private.love_role_allows(text,uuid,uuid) FROM PUBLIC;

-- draw_for_partner: preserves verified member, admin, and 88/12 gates.
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
 first_user uuid; second_user uuid; first_done integer; second_done integer;
 first_target integer; second_target integer; next_giver uuid;
 base_turns integer; donated_turns integer; completed_by_me integer; gifted_turn boolean:=false;
BEGIN
 PERFORM public.love_require_verified_identity();
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
 -- A persistent shuffle bag, per couple + recipient, spanning evenings.
 -- Reset ONLY when every currently eligible card across BOTH categories has been drawn.
 if v_no_repeat and not exists(
  select 1 from (values ('SENSUEL'::text),('SEXUEL'::text)) cats(category)
  cross join generate_series(1,100) candidate(card)
  where (candidate.card<=25 or exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card))
   and not exists(
    select 1 from public.love_custom_challenges cc
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
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
   and not exists(
    select 1 from public.love_custom_challenges cc
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
  if capacity>0 and (not gifted_turn or v_cat=p_preference) then
   cats:=array_append(cats,v_cat);
   weights:=array_append(weights,case when gifted_turn then 100 when v_cat=p_preference then 88 else 12 end);
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
  select 1 from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
 and not exists(
    select 1 from public.love_custom_challenges cc
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
 select * into chosen from public.love_custom_challenges cc
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

-- save_love_card_with_roles: preserves verified member, admin, and 88/12 gates.
CREATE OR REPLACE FUNCTION public.save_love_card_with_roles(p_couple uuid, p_category text, p_card_id integer, p_title text, p_description text, p_timer_minutes integer, p_drawer_role text, p_recipient_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 PERFORM public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples c where c.id=p_couple
    and c.owner_user_id=auth.uid())
 then raise exception 'Seul l’administrateur peut modifier les cartes';end if;
 if p_category not in ('SENSUEL','SEXUEL') or
   p_card_id not between 1 and 100 then raise exception 'Carte invalide';end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 120 or
  length(trim(coalesce(p_description,''))) not between 10 and 900 or
  (p_timer_minutes is not null and p_timer_minutes not between 1 and 60)
 then raise exception 'Contenu ou minuteur invalide';end if;
 if p_drawer_role is null or p_recipient_role is null or
    p_drawer_role not in ('both','owner','partner','him','her') or
    p_recipient_role not in ('both','owner','partner','him','her')
 then raise exception 'Droits de pige ou de réception invalides';end if;
 if p_drawer_role=p_recipient_role and p_drawer_role in ('owner','partner')
 then raise exception 'On ne peut pas piger un défi pour soi-même';end if;
 insert into public.love_custom_challenges(
  couple_id,category,card_id,title,description,timer_minutes,
  drawer_role,recipient_role,drawer_user_id,recipient_user_id)
 values(p_couple,p_category,p_card_id,trim(p_title),trim(p_description),
  p_timer_minutes,p_drawer_role,p_recipient_role,null,null)
 on conflict(couple_id,category,card_id) do update set
  title=excluded.title,description=excluded.description,
  timer_minutes=excluded.timer_minutes,
  drawer_role=excluded.drawer_role,
  recipient_role=excluded.recipient_role,
  drawer_user_id=null,recipient_user_id=null,updated_at=now();
end;$function$;

-- import_love_evening_library: preserves verified member, admin, and 88/12 gates.
CREATE OR REPLACE FUNCTION public.import_love_evening_library(p_couple uuid, p_library jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_category text; card jsonb; n int; dur int; roles text[]; seen int[];
BEGIN
 PERFORM public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 perform 1 from public.couples where id=p_couple and owner_user_id=auth.uid() for update;
 if not found then raise exception 'Administrateur uniquement';end if;
 v_category:=p_library->>'category';
 if p_library->>'format'<>'loveroll-evening' or p_library->>'version'<>'1'
 or v_category not in ('SENSUEL','SEXUEL')
 or jsonb_typeof(p_library->'cards')<>'array' or jsonb_array_length(p_library->'cards') not in (35,100)
 then raise exception 'Liste invalide : 100 cartes Sensuel ou Sexuel requises';end if;
 seen:=array[]::int[];
 for card in select value from jsonb_array_elements(p_library->'cards') loop
  if jsonb_typeof(card)<>'object' or coalesce(card->>'card_id','') !~ '^[0-9]{1,3}$'
  then raise exception 'Numéro de carte invalide';end if;
  n:=(card->>'card_id')::int;
  if n not between 1 and jsonb_array_length(p_library->'cards') or n=any(seen) then raise exception 'Carte répétée ou hors plage : %',n;end if;
  seen:=array_append(seen,n);
  if n<=25 or coalesce(card->>'title','')<>'' or coalesce(card->>'description','')<>'' then
   if length(btrim(coalesce(card->>'title',''))) not between 3 and 120
     or length(btrim(coalesce(card->>'description',''))) not between 10 and 900
   then raise exception 'Titre ou consigne invalide carte %',n;end if;
  else
   if (card->>'timer_minutes') is not null or card->>'drawer_role'<>'both'
    or card->>'recipient_role'<>'both'
   then raise exception 'Un emplacement vide doit être sans minuteur et avec droits neutres';end if;
  end if;
  roles:=array[card->>'drawer_role',card->>'recipient_role'];
  if roles[1] not in ('both','owner','partner','him','her') or roles[2] not in ('both','owner','partner','him','her')
   or (roles[1]=roles[2] and roles[1] in ('owner','partner'))
   then raise exception 'Restrictions invalides carte %',n;end if;
  if (card->>'timer_minutes') is not null then
   if (card->>'timer_minutes') !~ '^[0-9]{1,2}$' then raise exception 'Minuteur invalide carte %',n;end if;
   dur:=(card->>'timer_minutes')::int;
   if dur not between 1 and 60 then raise exception 'Durée invalide carte %',n;end if;
  end if;
 end loop;
 delete from public.love_custom_challenges where couple_id=p_couple and category=v_category
 and (jsonb_array_length(p_library->'cards')=100 or card_id<=35);
 insert into public.love_custom_challenges(couple_id,category,card_id,title,description,
  timer_minutes,drawer_role,recipient_role,drawer_user_id,recipient_user_id)
 select p_couple,v_category,(x.value->>'card_id')::int,x.value->>'title',x.value->>'description',
  nullif(x.value->>'timer_minutes','')::int,x.value->>'drawer_role',x.value->>'recipient_role',null,null
 from jsonb_array_elements(p_library->'cards') as x(value)
 where coalesce(x.value->>'title','')<>'' and coalesce(x.value->>'description','')<>'';
end;$function$;
COMMIT;
