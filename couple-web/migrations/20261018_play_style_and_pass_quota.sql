-- LoveRoll: future per-user play style (no influence on current card selection)
-- and auditable timestamps for 3 free passes/month/person in the shared calendar.
ALTER TABLE public.couple_profiles
  ADD COLUMN IF NOT EXISTS play_style text NOT NULL DEFAULT 'medium';
ALTER TABLE public.couple_profiles
  ADD CONSTRAINT love_profile_play_style_valid CHECK (play_style IN ('soft','medium','intense'));

CREATE OR REPLACE FUNCTION public.save_my_play_style(p_style text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $save$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_style IS NULL OR p_style NOT IN ('soft','medium','intense') THEN
  RAISE EXCEPTION 'Choisissez Soft, Medium ou Intense';
 END IF;
 UPDATE public.couple_profiles SET play_style=p_style WHERE id=(select auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Créez votre profil avant de choisir votre style'; END IF;
 RETURN p_style;
END;$save$;
REVOKE ALL ON FUNCTION public.save_my_play_style(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_play_style(text) TO authenticated;

ALTER TABLE public.couple_challenges ADD COLUMN IF NOT EXISTS passed_at timestamptz;
-- Historical pass timestamps were not recorded: fall back to when the old card was drawn.
UPDATE public.couple_challenges SET passed_at=created_at
WHERE status='passed' AND passed_at IS NULL;

CREATE OR REPLACE FUNCTION couple_private.love_stamp_challenge_pass()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $stamp$
BEGIN
 IF NEW.status='passed' AND OLD.status IS DISTINCT FROM 'passed' THEN
  NEW.passed_at:=now();
 END IF;
 RETURN NEW;
END;$stamp$;
DROP TRIGGER IF EXISTS love_stamp_passed_at ON public.couple_challenges;
CREATE TRIGGER love_stamp_passed_at BEFORE UPDATE OF status
 ON public.couple_challenges FOR EACH ROW
 EXECUTE FUNCTION couple_private.love_stamp_challenge_pass();

-- Partner-visible read-only quota, full chronological order for current month,
-- including passes made in an evening that has not been closed yet.
CREATE OR REPLACE FUNCTION public.love_calendar_pass_quota(p_couple uuid,p_month text)
RETURNS TABLE(challenge_id uuid,recipient uuid,passed_at timestamptz,
              pass_number bigint,free_pass boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $quota$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF p_couple IS NULL OR NOT couple_private.is_member(p_couple)
 THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF p_month IS NULL OR p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
 THEN RAISE EXCEPTION 'Mois invalide'; END IF;
 RETURN QUERY WITH chronicle AS (
  SELECT q.id, q.recipient,q.passed_at,
   row_number() OVER(PARTITION BY q.recipient ORDER BY q.passed_at,q.id) AS sequence
  FROM public.couple_challenges q
  JOIN public.couple_sessions s ON s.id=q.session_id
  WHERE s.couple_id=p_couple AND q.couple_id=p_couple
    AND q.status='passed' AND q.passed_at IS NOT NULL
    AND to_char(q.passed_at AT TIME ZONE 'America/Toronto','YYYY-MM')=p_month
 )
 SELECT chronicle.id,chronicle.recipient,chronicle.passed_at,
   chronicle.sequence,(chronicle.sequence<=3)
 FROM chronicle ORDER BY chronicle.recipient,chronicle.sequence;
END;$quota$;
REVOKE ALL ON FUNCTION public.love_calendar_pass_quota(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_calendar_pass_quota(uuid,text) TO authenticated;
