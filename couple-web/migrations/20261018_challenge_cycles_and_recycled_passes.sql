-- LoveRoll 149 — New 200-completion cycles; weekly/monthly rules unaffected.
-- One shared cycle counter for the pair, historical nights and old draws kept.
alter table public.couples
 add column if not exists challenge_cycle_number integer not null default 1,
 add column if not exists challenge_cycle_target integer not null default 200,
 add column if not exists challenge_cycle_started_at timestamptz not null default now(),
 add column if not exists challenge_cycle_pending boolean not null default false;

alter table public.couples
 add constraint love_challenge_cycle_number_valid check (challenge_cycle_number>=1),
 add constraint love_challenge_cycle_target_valid check (challenge_cycle_target=200);

create table if not exists public.love_cycle_responses(
 couple_id uuid not null references public.couples(id) on delete cascade,
 cycle_number integer not null check(cycle_number>=1),
 user_id uuid not null references auth.users(id) on delete cascade,
 choice text not null check (choice in ('down','same','up')),
 answered_at timestamptz not null default now(),
 primary key(couple_id,cycle_number,user_id)
);
alter table public.love_cycle_responses enable row level security;
revoke all on public.love_cycle_responses from public,anon,authenticated;

-- Future Soft / Medium / Intense library, 200 cards per style, untouched by
-- the live existing Sensuel/Sexuel draw algorithm until content is supplied.
create table if not exists public.love_future_style_cards(
 couple_id uuid not null references public.couples(id) on delete cascade,
 style text not null check(style in ('soft','medium','intense')),
 category text not null check(category in ('SENSUEL','SEXUEL')),
 card_id integer not null check(card_id between 1 and 100),
 title text not null,
 description text not null,
 timer_minutes integer check(timer_minutes between 1 and 60),
 created_at timestamptz not null default now(),
 primary key(couple_id,style,category,card_id)
);
alter table public.love_future_style_cards enable row level security;
revoke all on public.love_future_style_cards from public,anon,authenticated;

-- Admin may start a fresh bag on demand, never erase old achievements,
-- pass dates, calendar history, gifts, journal or Supabase accounts.
create or replace function public.reset_love_challenges_admin(p_couple uuid)
returns jsonb language plpgsql security definer set search_path='' as $reset$
declare v_number integer; v_owner uuid;
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null or p_couple is null then raise exception 'Connexion requise'; end if;
 select owner_user_id into v_owner from public.couples where id=p_couple for update;
 if not found or v_owner is distinct from auth.uid() or not couple_private.is_member(p_couple)
 then raise exception 'Seul l’administrateur peut recommencer les 200 défis'; end if;
 if exists(select 1 from public.couple_sessions where couple_id=p_couple and finished_at is null)
 then raise exception 'Terminez ou clôturez la soirée avant de recommencer les défis'; end if;
 delete from public.love_card_draw_history where couple_id=p_couple;
 update public.couples set challenge_cycle_number=challenge_cycle_number+1,
  challenge_cycle_pending=false,challenge_cycle_started_at=clock_timestamp()
 where id=p_couple returning challenge_cycle_number into v_number;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'challenge',auth.uid(),'Nouveau cycle de 200 défis');
 return jsonb_build_object('cycle',v_number,'completed',0,'required',200,'pending',false);
end;$reset$;
revoke all on function public.reset_love_challenges_admin(uuid) from public,anon,authenticated;
grant execute on function public.reset_love_challenges_admin(uuid) to authenticated;

create or replace function public.love_cycle_status(p_couple uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $status$
declare v_couple public.couples%rowtype; v_completed bigint;
 v_self boolean;v_answered bigint;
begin
 perform public.love_require_verified_identity();
 if p_couple is null or not couple_private.is_member(p_couple)
 then raise exception 'Accès au duo refusé';end if;
 select * into v_couple from public.couples where id=p_couple;
 if not found then raise exception 'Duo introuvable'; end if;
 select count(*) into v_completed
 from public.couple_challenges ch join public.couple_sessions s on s.id=ch.session_id
 where ch.couple_id=p_couple and ch.status='completed' and s.counted=true
   and s.started_at>=v_couple.challenge_cycle_started_at;
 select exists(select 1 from public.love_cycle_responses r
  where r.couple_id=p_couple and r.cycle_number=v_couple.challenge_cycle_number
    and r.user_id=auth.uid()) into v_self;
 select count(*) into v_answered from public.love_cycle_responses r
 where r.couple_id=p_couple and r.cycle_number=v_couple.challenge_cycle_number;
 return jsonb_build_object('cycle',v_couple.challenge_cycle_number,
  'completed',least(v_completed,v_couple.challenge_cycle_target),
  'required',v_couple.challenge_cycle_target,'pending',v_couple.challenge_cycle_pending,
  'answered_self',v_self,'answers_received',v_answered);
end;$status$;
revoke all on function public.love_cycle_status(uuid) from public,anon,authenticated;
grant execute on function public.love_cycle_status(uuid) to authenticated;

-- Each member answers independently: decrease, keep, or increase one notch.
-- When BOTH respond, the 200-card shuffle bag automatically starts a new
-- cycle. Changes are atomic; zero prior results or private notes are deleted.
create or replace function public.answer_love_cycle_intensity(
 p_couple uuid,p_choice text
) returns jsonb language plpgsql security definer set search_path='' as $response$
declare v_couple public.couples%rowtype; v_received integer; v_total integer;
begin
 perform public.love_require_verified_identity();
 if p_choice is null or p_choice not in ('down','same','up')
 then raise exception 'Choisissez diminuer, conserver ou augmenter'; end if;
 select * into v_couple from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Accès refusé'; end if;
 if not v_couple.challenge_cycle_pending
 then raise exception 'Le bilan des 200 défis n’est pas encore ouvert'; end if;
 if exists(select 1 from public.couple_sessions s
  where s.couple_id=p_couple and s.finished_at is null)
 then raise exception 'Clôturez la soirée avant le questionnaire'; end if;
 insert into public.love_cycle_responses(couple_id,cycle_number,user_id,choice)
 values(p_couple,v_couple.challenge_cycle_number,auth.uid(),p_choice)
 on conflict(couple_id,cycle_number,user_id) do nothing;
 select count(*) into v_received from public.love_cycle_responses
 where couple_id=p_couple and cycle_number=v_couple.challenge_cycle_number;
 select count(*) into v_total from public.couple_members where couple_id=p_couple;
 if v_total=2 and v_received=2 then
  update public.couple_profiles p set play_style=
   case r.choice
    when 'up' then case p.play_style when 'soft' then 'medium'
      when 'medium' then 'intense' else 'intense' end
    when 'down' then case p.play_style when 'intense' then 'medium'
      when 'medium' then 'soft' else 'soft' end
    else p.play_style end
  from public.love_cycle_responses r
  where r.couple_id=p_couple and r.cycle_number=v_couple.challenge_cycle_number
    and r.user_id=p.id;
  delete from public.love_card_draw_history where couple_id=p_couple;
  update public.couples set challenge_cycle_number=challenge_cycle_number+1,
    challenge_cycle_pending=false,challenge_cycle_started_at=clock_timestamp()
  where id=p_couple;
  insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(p_couple,'challenge',auth.uid(),'200 défis terminés : nouveau cycle partagé');
  return jsonb_build_object('completed',true,'new_cycle',v_couple.challenge_cycle_number+1);
 end if;
 return jsonb_build_object('completed',false,'answers_received',v_received,'required_answers',2);
end;$response$;
revoke all on function public.answer_love_cycle_intensity(uuid,text) from public,anon,authenticated;
grant execute on function public.answer_love_cycle_intensity(uuid,text) to authenticated;

-- Original official RPC bodies retained. Only milestones and passed-card
-- eligibility change; probabilities, dice faces and gift limits untouched.
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
CREATE OR REPLACE FUNCTION public.answer_challenge(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.couple_challenges%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 if p_status not in ('accepted','passed','completed') then raise exception 'Statut invalide';end if;
 select * into c from public.couple_challenges where id=p_id for update;
 if not found or c.recipient<>auth.uid() then raise exception 'Seul le destinataire peut répondre';end if;
 if p_status='completed' and c.status<>'accepted' then raise exception 'Acceptez d’abord le défi';end if;
 if c.status not in ('proposed','accepted') then raise exception 'Défi déjà terminé';end if;
 update public.couple_challenges set status=p_status where id=p_id;
 -- A passed challenge returns to the eligible shuffle bag, both for this
 -- evening and later ones. Keep the original challenge & pass timestamp.
 if p_status='passed' then
  perform 1 from public.couples where id=c.couple_id for update;
  delete from public.love_card_draw_history h
   where h.couple_id=c.couple_id and h.recipient_user_id=c.recipient
     and h.category=c.category and h.card_id=c.card_id;
 end if;
end; $function$;
CREATE OR REPLACE FUNCTION public.finish_couple_session(p_session uuid, p_count boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c uuid; member uuid; target int; done int; paired boolean;
 cycle_start timestamptz; cycle_goal integer; cycle_completed integer;
BEGIN
 PERFORM public.love_require_verified_identity();
 select couple_id into c from public.couple_sessions
  where id=p_session and finished_at is null;
 if c is null or not couple_private.is_member(c) then
  raise exception 'Soirée inaccessible'; end if;
 -- Use the same couple-first lock order as card draws and admin resets.
 select challenge_cycle_started_at,challenge_cycle_target
 into cycle_start,cycle_goal from public.couples where id=c for update;
 perform 1 from public.couple_sessions
  where id=p_session and finished_at is null for update;
 if not found then raise exception 'Soirée déjà clôturée'; end if;
 select paired_turns into paired from public.couple_sessions where id=p_session;
 if p_count then
  if (select count(*) from public.couple_members where couple_id=c)<>2 then
   raise exception 'Votre partenaire doit être connecté'; end if;
  for member in select user_id from public.couple_members where couple_id=c loop
   select pr.face
      + (select count(*) from public.couple_challenge_gifts g where g.session_id=p_session and g.receiver_user_id=member)
      - (select count(*) from public.couple_challenge_gifts g where g.session_id=p_session and g.donor_user_id=member)
    into target from public.couple_personal_rolls pr
    where pr.session_id=p_session and pr.user_id=member and
     (paired is true or pr.user_id=member);
   if target is null then raise exception 'Les deux D6 sont nécessaires';end if;
   select count(*) into done from public.couple_challenges
    where session_id=p_session and status='completed'
      and (case when paired and (select self_draws from public.couple_sessions where id=p_session) then recipient=member when paired then offered_by=member else recipient=member end);
   if done<target then raise exception 'Il reste des défis à terminer';end if;
  end loop;
 end if;
 update public.couple_sessions set finished_at=now(), counted=p_count where id=p_session;
 if p_count then
  select count(*) into cycle_completed
  from public.couple_challenges cc
  join public.couple_sessions ss on ss.id=cc.session_id
  where cc.couple_id=c and cc.status='completed' and ss.counted=true
    and ss.started_at>=cycle_start;
  if cycle_completed>=cycle_goal then
   update public.couples set challenge_cycle_pending=true where id=c;
  end if;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(c,'session',auth.uid(),
   case when p_count then 'Soirée terminée et comptée' else 'Soirée arrêtée sans la compter' end);
end; $function$;
CREATE OR REPLACE FUNCTION public.ensure_couple_session(p_couple uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 id_now uuid; start_user uuid;
 start_week date; today_qc date; limit_week int; already int;
 last_reset timestamptz; weekly_created timestamptz;
 stale_id uuid; already_today int;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF NOT couple_private.is_member(p_couple) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 PERFORM 1 FROM public.couples WHERE id=p_couple FOR UPDATE;
 IF (select challenge_cycle_pending from public.couples where id=p_couple) THEN
  RAISE EXCEPTION 'Répondez au questionnaire des 200 défis avant une nouvelle soirée';
 END IF;
 today_qc:=(now() AT TIME ZONE 'America/Toronto')::date;
 start_week:=today_qc-(extract(isodow from today_qc)::int-1);
 SELECT r.face,r.created_at INTO limit_week,weekly_created
 FROM public.couple_rolls r
 WHERE r.couple_id=p_couple AND r.kind='weekly'
  AND r.key=to_char(start_week,'YYYY-MM-DD');
 IF limit_week IS NULL THEN RAISE EXCEPTION 'Brassez d’abord le dé de la semaine'; END IF;
 SELECT s.id INTO stale_id FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.finished_at IS NULL
  AND s.started_at<weekly_created FOR UPDATE;
 IF stale_id IS NOT NULL THEN
  UPDATE public.couple_sessions SET finished_at=now(),counted=false
  WHERE id=stale_id AND finished_at IS NULL;
 END IF;
 SELECT s.id INTO id_now FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.finished_at IS NULL;
 IF id_now IS NOT NULL THEN RETURN id_now; END IF;
 SELECT max(reset_at) INTO last_reset FROM public.love_all_dice_reset_audit
 WHERE couple_id=p_couple AND week_key=to_char(start_week,'YYYY-MM-DD');
 SELECT count(*) INTO already FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.counted=true
  AND (s.started_at AT TIME ZONE 'America/Toronto')::date>=start_week
  AND (last_reset IS NULL OR s.started_at>=last_reset);
 IF already>=limit_week THEN RAISE EXCEPTION 'Rituel de la semaine déjà complété'; END IF;
 -- Enforce daily limit even after manual closure; old stale sessions from
 -- before the current weekly roll must not disable the new week's session.
 SELECT count(*) INTO already_today FROM public.couple_sessions s
 WHERE s.couple_id=p_couple AND s.started_at>=weekly_created
 AND ((s.started_at AT TIME ZONE 'America/Toronto')::date=today_qc
   OR (s.finished_at IS NOT NULL
    AND (s.finished_at AT TIME ZONE 'America/Toronto')::date=today_qc));
 IF already_today>0 THEN
  RAISE EXCEPTION 'Une seule soirée par jour. Revenez demain (heure du Québec).';
 END IF;
 SELECT m.user_id INTO start_user FROM public.couple_members m
 WHERE m.couple_id=p_couple ORDER BY random() LIMIT 1;
 IF start_user IS NULL OR
  (SELECT count(*) FROM public.couple_members WHERE couple_id=p_couple)<>2
 THEN RAISE EXCEPTION 'Les deux partenaires doivent être connectés'; END IF;
 INSERT INTO public.couple_sessions(couple_id,opened_by,paired_turns,starting_user_id,self_draws)
 VALUES(p_couple,auth.uid(),true,start_user,true) RETURNING id INTO id_now;
 INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
 VALUES(p_couple,'session',auth.uid(),'Soirée commencée');
 RETURN id_now;
END;
$function$;
