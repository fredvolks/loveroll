-- LoveRoll LR-014 — each account controls its own D100 category confirmation.
-- Additive only; preserves existing profiles, couples, dice, session history.
ALTER TABLE public.couple_profiles
 ADD COLUMN IF NOT EXISTS confirm_evening_category boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.couple_profiles.confirm_evening_category IS
 'Per-user preference: request explicit confirmation before official evening D100 draw.';
-- The existing profiles_own_update RLS policy permits only id = auth.uid().
-- Never expose a SECURITY DEFINER setter or a couple-level override.
