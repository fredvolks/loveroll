-- LoveRoll: reveal each evening's feedback to both partners only when both have submitted.
-- A participant may always read their own answer; pending partner answers are hidden at the database level.
create or replace function couple_private.feedback_both_submitted(p_session uuid)
returns boolean language sql stable security definer set search_path to ''
as $function$
 select exists(
   select 1
   from public.couple_sessions s
   join public.couple_feedback f on f.session_id=s.id and f.couple_id=s.couple_id
   join public.couple_members m on m.couple_id=s.couple_id and m.user_id=f.author_id
   where s.id=p_session and s.finished_at is not null and s.counted=true
   group by s.id
   having count(distinct f.author_id) >= 2
 );
$function$;

drop policy if exists feedback_read on public.couple_feedback;
create policy feedback_read on public.couple_feedback
 for select to authenticated
 using (
   couple_private.is_member(couple_id)
   and (
     author_id = (select auth.uid())
     or couple_private.feedback_both_submitted(session_id)
   )
 );

-- The helper exists only for RLS evaluation and is callable by signed-in users.
revoke all on function couple_private.feedback_both_submitted(uuid) from public, anon;
grant execute on function couple_private.feedback_both_submitted(uuid) to authenticated;
