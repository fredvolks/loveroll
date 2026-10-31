-- CI ONLY. Exact trigger-function source inspected read-only in Supabase
-- LoveRoll on 2026-10-30 (MD5 pg_get_functiondef:
-- 3241da749bd0647c6106c613c7e3615a).
-- Disposable PostgreSQL fixture: no production migrations, users or cards.
-- The function is intentionally identical to production, including spacing,
-- to detect SQL drift with lr026-live-schema-preflight.sql.
CREATE OR REPLACE FUNCTION couple_private.love_stamp_challenge_pass()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.status='passed' AND OLD.status IS DISTINCT FROM 'passed' THEN
  NEW.passed_at:=now();
 END IF;
 RETURN NEW;
END;$function$;
