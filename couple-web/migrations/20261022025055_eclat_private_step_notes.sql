create table public.love_eclat_private_notes (
 session_id uuid not null references public.love_eclat_sessions(id) on delete cascade,
 chapter_index smallint not null check (chapter_index between 1 and 8),
 user_id uuid not null references auth.users(id) on delete cascade,
 note text not null default '' check (char_length(note)<=2000),
 clue text not null default '' check (char_length(clue)<=300),
 moment_done boolean not null default false,
 primary key (session_id,chapter_index,user_id)
);
create index love_eclat_private_notes_user_idx on public.love_eclat_private_notes(user_id);
alter table public.love_eclat_private_notes enable row level security;
revoke all on public.love_eclat_private_notes from public,anon,authenticated;
grant select,insert,update,delete on public.love_eclat_private_notes to authenticated;
create policy "Only authors read their Eclat notes" on public.love_eclat_private_notes
 for select to authenticated using (
 user_id=(select auth.uid()) and public.love_verified_identity()
 and exists(select 1 from public.love_eclat_sessions s
  where s.id=session_id and couple_private.is_member(s.couple_id))
);
create policy "Authors prepare their current Eclat step" on public.love_eclat_private_notes
 for insert to authenticated with check (
 user_id=(select auth.uid()) and public.love_verified_identity()
 and exists(select 1 from public.love_eclat_sessions s
  where s.id=session_id and s.ended_at is null and s.chapter_index=love_eclat_private_notes.chapter_index
  and couple_private.is_member(s.couple_id) and public.love_eclat_has_access(s.couple_id))
);
create policy "Authors edit their current Eclat step" on public.love_eclat_private_notes
 for update to authenticated using (user_id=(select auth.uid()))
 with check (
 user_id=(select auth.uid()) and public.love_verified_identity()
 and exists(select 1 from public.love_eclat_sessions s
  where s.id=session_id and s.ended_at is null and s.chapter_index=love_eclat_private_notes.chapter_index
  and couple_private.is_member(s.couple_id) and public.love_eclat_has_access(s.couple_id))
);
create policy "Authors may remove their Eclat notes" on public.love_eclat_private_notes
 for delete to authenticated using (user_id=(select auth.uid()));
