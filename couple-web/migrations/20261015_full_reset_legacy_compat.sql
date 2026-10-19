-- Compatibility: cached LoveRoll v64/v65 clients still have the old weekly button.
-- Its admin-only RPC now delegates to the new atomic full dice reset. The
-- replacement intentionally does not require a current weekly roll: orphaned
-- Soirée D6s can be cleared after an older partial reset.
create or replace function public.reset_love_weekly_roll_admin(p_couple uuid)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_result jsonb;
begin
 perform public.love_require_verified_identity();
 select public.reset_love_all_dice_admin(p_couple) into v_result;
 return coalesce((v_result->>'changed')::boolean,false);
end;
$$;
revoke all on function public.reset_love_weekly_roll_admin(uuid) from public,anon,authenticated;
grant execute on function public.reset_love_weekly_roll_admin(uuid) to authenticated;

-- An earlier weekly-only reset could leave an open evening whose two
-- personal D6 rolls are still stored. Once a new weekly face exists, only
-- sessions STARTED after that face may be resumed. Preserve their historic
-- rows; do not cascade-delete challenge, feedback or intimate journal data.
create or replace function public.ensure_couple_session(p_couple uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 id_now uuid;start_user uuid;
 start_week date;limit_week int;already int;
 last_reset timestamptz;weekly_created timestamptz;
 stale_id uuid;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 perform 1 from public.couples where id=p_couple for update;
 start_week:=((now() at time zone 'America/Toronto')::date-
   (extract(isodow from (now() at time zone 'America/Toronto')::date)::int-1));
 select r.face,r.created_at into limit_week,weekly_created
 from public.couple_rolls r
 where r.couple_id=p_couple and r.kind='weekly'
   and r.key=to_char(start_week,'YYYY-MM-DD');
 if limit_week is null then
   raise exception 'Brassez d’abord le dé de la semaine';
 end if;
 -- A stale still-open session may come from the OLD weekly-only reset.
 -- Mark it abandoned rather than resurrecting old personal D6s under
 -- the newly drawn weekly die.
 select s.id into stale_id from public.couple_sessions s
 where s.couple_id=p_couple and s.finished_at is null
   and s.started_at<weekly_created for update;
 if stale_id is not null then
  update public.couple_sessions set finished_at=now(),counted=false
   where id=stale_id and finished_at is null;
 end if;
 select s.id into id_now from public.couple_sessions s
 where s.couple_id=p_couple and s.finished_at is null;
 if id_now is not null then return id_now;end if;
 select max(reset_at) into last_reset from public.love_all_dice_reset_audit
 where couple_id=p_couple and week_key=to_char(start_week,'YYYY-MM-DD');
 select count(*) into already from public.couple_sessions s
 where s.couple_id=p_couple and s.counted=true
   and (s.started_at at time zone 'America/Toronto')::date>=start_week
   and (last_reset is null or s.started_at>=last_reset);
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
 return id_now;
end;$$;
