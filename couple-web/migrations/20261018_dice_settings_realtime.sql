-- The couples table is protected by RLS: only current duo members may read it.
-- Publish its UPDATE events so both Home screens refresh the admin's visible odds.
-- Do not publish personal journals, dice outcomes or other account data.
DO $publish$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname='supabase_realtime'
    AND schemaname='public'
    AND tablename='couples'
 ) THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
 END IF;
END;
$publish$;
