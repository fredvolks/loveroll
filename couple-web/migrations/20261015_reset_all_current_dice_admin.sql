-- LoveRoll 2026-10-15: reset all currently replayable dice, not card libraries or completed history.
-- This function makes NO changes until an authenticated couple owner explicitly confirms in UI.
create table if not exists public.love_all_dice_reset_audit (
 id bigint generated always as identity primary key,
 couple_id uuid not null references public.couples(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 reset_at timestamptz not null default now(),
 week_key text not null,
 month_key text not null,
 prior_rolls jsonb not null default '[]'::jsonb,
 prior_occasions jsonb not null default '[]'::jsonb,
 abandoned_session_ids jsonb not null default '[]'::jsonb
);
alter table public.love_all_dice_reset_audit enable row level security;
drop policy if exists love_all_dice_reset_owner_read on public.love_all_dice_reset_audit;
create policy love_all_dice_reset_owner_read on public.love_all_dice_reset_audit
 for select to authenticated using(
  exists(select 1 from public.couples c
    where c.id=couple_id and c.owner_user_id=(select auth.uid()))
 );
revoke all on public.love_all_dice_reset_audit from public, anon, authenticated;
grant select on public.love_all_dice_reset_audit to authenticated;

create or replace function public.reset_love_all_dice_admin(p_couple uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 local_day date;
 week_key text;
 month_key text;
 yr int;
 rolls_backup jsonb;
 occasions_backup jsonb;
 sessions_backup jsonb;
 affected integer:=0;
 sessions_closed integer:=0;
 rolls_removed integer:=0;
 occasions_removed integer:=0;
begin
 perform public.love_require_verified_identity();
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 -- Same lock as all official roll functions, so there are no concurrent races.
 perform 1 from public.couples c
   where c.id=p_couple and c.owner_user_id=auth.uid() for update;
 if not found or not couple_private.is_member(p_couple) then
  raise exception 'Réinitialisation réservée à l’administrateur du couple';
 end if;
 local_day:=(now() at time zone 'America/Toronto')::date;
 week_key:=to_char((local_day-(extract(isodow from local_day)::int-1))::date,'YYYY-MM-DD');
 month_key:=to_char(local_day,'YYYY-MM');
 yr:=extract(year from local_day)::int;

 -- Save identifiers and faces in a restricted audit. Never delete libraries,
 -- journal, completed sessions, completed challenge history or Advent openings.
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'kind',r.kind,'key',r.key,'face',r.face)),'[]'::jsonb)
 into rolls_backup from public.couple_rolls r
 where r.couple_id=p_couple and
   ((r.kind='weekly' and r.key=week_key) or
    (r.kind<>'weekly' and r.key=month_key));
 select coalesce(jsonb_agg(jsonb_build_object(
  'event_year',o.event_year,'key',o.occasion_key,
  'type',o.roll_type,'face',o.face)),'[]'::jsonb)
 into occasions_backup from public.couple_occasion_rolls o
 where o.couple_id=p_couple and o.event_year between yr and yr+1;
 select coalesce(jsonb_agg(s.id),'[]'::jsonb)
 into sessions_backup from public.couple_sessions s
 where s.couple_id=p_couple and s.finished_at is null;

 -- Preserve session / personal dice / D35 challenge rows for the historical
 -- record, but close the live session without counting an abandoned round.
 update public.couple_sessions
 set finished_at=now(),counted=false
 where couple_id=p_couple and finished_at is null;
 get diagnostics sessions_closed=row_count;

 delete from public.couple_rolls
 where couple_id=p_couple and
  ((kind='weekly' and key=week_key) or
   (kind<>'weekly' and key=month_key));
 get diagnostics rolls_removed=row_count;

 -- Holiday rolls from the current / upcoming year can be drawn again.
 -- Settings and custom event definitions remain intact.
 delete from public.couple_occasion_rolls
 where couple_id=p_couple and event_year between yr and yr+1;
 get diagnostics occasions_removed=row_count;
 delete from public.love_special_modifier_snapshots
 where couple_id=p_couple and event_year between yr and yr+1;

 affected:=sessions_closed+rolls_removed+occasions_removed;
 if affected=0 then return jsonb_build_object('changed',false,'rolls',0,'occasions',0,'sessions',0);end if;

 insert into public.love_all_dice_reset_audit(
  couple_id,actor_id,week_key,month_key,prior_rolls,prior_occasions,abandoned_session_ids)
 values(p_couple,auth.uid(),week_key,month_key,rolls_backup,occasions_backup,sessions_backup);
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'roll',auth.uid(),
  'Réinitialisation administrateur de tous les dés actifs');
 return jsonb_build_object('changed',true,'rolls',rolls_removed,
  'occasions',occasions_removed,'sessions',sessions_closed);
end;$$;
revoke all on function public.reset_love_all_dice_admin(uuid) from public,anon,authenticated;
grant execute on function public.reset_love_all_dice_admin(uuid) to authenticated;

-- Keep completed evenings in historical statistics, but count only evenings
-- created SINCE the latest explicit reset for the current week's new limit.
create or replace function public.ensure_couple_session(p_couple uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 id_now uuid;start_user uuid;
 start_week date;limit_week int;already int;
 last_reset timestamptz;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 perform 1 from public.couples where id=p_couple for update;
 select id into id_now from public.couple_sessions where couple_id=p_couple
  and finished_at is null;
 if id_now is null then
  start_week:=((now() at time zone 'America/Toronto')::date-
   (extract(isodow from (now() at time zone 'America/Toronto')::date)::int-1));
  select face into limit_week from public.couple_rolls
   where couple_id=p_couple and kind='weekly'
    and key=to_char(start_week,'YYYY-MM-DD');
  if limit_week is null then raise exception 'Brassez d’abord le dé de la semaine';end if;
  select max(reset_at) into last_reset from public.love_all_dice_reset_audit
    where couple_id=p_couple and week_key=to_char(start_week,'YYYY-MM-DD');
  select count(*) into already from public.couple_sessions
   where couple_id=p_couple and counted=true
    and (started_at at time zone 'America/Toronto')::date>=start_week
    and (last_reset is null or started_at>=last_reset);
  if already>=limit_week then raise exception 'Rituel de la semaine déjà complété';end if;
  select m.user_id into start_user from public.couple_members m
   where m.couple_id=p_couple order by random() limit 1;
  if start_user is null or
   (select count(*) from public.couple_members where couple_id=p_couple)<>2
    then raise exception 'Les deux partenaires doivent être connectés';end if;
  insert into public.couple_sessions(couple_id,opened_by,paired_turns,starting_user_id,self_draws)
  values(p_couple,auth.uid(),true,start_user,true) returning id into id_now;
  insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(p_couple,'session',auth.uid(),'Soirée commencée');
 end if;
 return id_now;
end;$$;
