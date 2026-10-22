-- Keep premium-entitlement internals private. The policy helper discloses only
-- whether the authenticated member may edit the specified active step.
create function couple_private.can_write_eclat_note(p_session uuid,p_chapter smallint)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.love_verified_identity() and exists(
  select 1 from public.love_eclat_sessions s
  where s.id=p_session and s.ended_at is null and s.chapter_index=p_chapter
  and couple_private.is_member(s.couple_id) and public.love_eclat_has_access(s.couple_id)
 );
$$;
revoke all on function couple_private.can_write_eclat_note(uuid,smallint) from public,anon;
grant execute on function couple_private.can_write_eclat_note(uuid,smallint) to authenticated;
alter policy "Authors prepare their current Eclat step" on public.love_eclat_private_notes
 with check (user_id=(select auth.uid()) and couple_private.can_write_eclat_note(session_id,chapter_index));
alter policy "Authors edit their current Eclat step" on public.love_eclat_private_notes
 with check (user_id=(select auth.uid()) and couple_private.can_write_eclat_note(session_id,chapter_index));
