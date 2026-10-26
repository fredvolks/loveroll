-- LR-019: each (category,card_id) is one unique card in the shared 200-card cycle.
-- Replayed favorites are additional completed occurrences, NOT new unique cards.
-- Unmodified archive/receipt and per-person D6 completion requirements.
-- Draft migration; requires LR-015 and LR-019 core to be reviewed together.
BEGIN;

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
 select count(DISTINCT (ch.category,ch.card_id)) into v_completed
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
  select count(DISTINCT (cc.category,cc.card_id)) into cycle_completed
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


-- Advertise complete LR-019 availability only after the favorite registry,
-- LR-015 compatible D100/redraw engine AND corrected 200-unique cycle are
-- installed. The mobile UI must not show a functional-looking inert heart.
CREATE OR REPLACE FUNCTION public.love_favorites_capabilities(p_couple uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $ready$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (SELECT auth.uid()) IS NULL OR p_couple IS NULL
    OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 RETURN true;
END;
$ready$;
REVOKE ALL ON FUNCTION public.love_favorites_capabilities(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_favorites_capabilities(uuid)
 TO authenticated;

COMMIT;
