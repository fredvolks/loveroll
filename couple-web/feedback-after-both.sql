-- Private after-party responses become visible to both partners only when BOTH have answered.
-- The author may always read their own response.
create or replace function couple_private.can_read_feedback(p_session uuid, p_author uuid, p_couple uuid)
returns boolean
language sql stable security definer set search_path to ''
as $$
  select (p_author=auth.uid() and couple_private.is_member(p_couple))
    or (couple_private.is_member(p_couple)
       and (select count(distinct author_id)
            from public.couple_feedback
            where session_id=p_session and couple_id=p_couple)>=2);
$$;
revoke all on function couple_private.can_read_feedback(uuid,uuid,uuid) from public,anon;
grant execute on function couple_private.can_read_feedback(uuid,uuid,uuid) to authenticated;
drop policy if exists feedback_read on public.couple_feedback;
create policy feedback_read on public.couple_feedback
 for select to authenticated
 using (couple_private.can_read_feedback(session_id,author_id,couple_id));
