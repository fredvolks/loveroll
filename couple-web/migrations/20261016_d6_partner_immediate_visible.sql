-- LoveRoll: each partner may see the other's confirmed D6 as soon as it is rolled.
-- The reveal is restricted to the SAME active couple session and verified members.
-- Only the count (face) is shared. Challenge cards and D35 data remain private.
BEGIN;
DROP POLICY IF EXISTS personal_rolls_read ON public.couple_personal_rolls;
CREATE POLICY personal_rolls_read
ON public.couple_personal_rolls
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.couple_sessions s
    WHERE s.id = couple_personal_rolls.session_id
      AND couple_private.is_member(s.couple_id)
  )
);
-- Keep the existing restrictive verified-email policy in force.
-- The SQL and RPC which insert a personal roll are unchanged:
-- each account can only roll its own D6, once per session.
COMMIT;
