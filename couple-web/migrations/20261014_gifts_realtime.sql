-- Ensure both partners see gifts as soon as a turn is transferred.
-- Supabase Realtime RLS limits the stream to members of the couple.
do $$
begin
 if not exists(select 1 from pg_publication_tables
  where pubname='supabase_realtime' and schemaname='public'
   and tablename='couple_challenge_gifts') then
  alter publication supabase_realtime add table public.couple_challenge_gifts;
 end if;
 if not exists(select 1 from pg_publication_tables
  where pubname='supabase_realtime' and schemaname='public'
   and tablename='couple_sessions') then
  alter publication supabase_realtime add table public.couple_sessions;
 end if;
end $$;