-- LR-SURPRISE-001: optional shared maximum budget for two, independent of radius.
-- Money is stored with its own explicit currency. NULL means "Tous les budgets".
-- Technical numeric precision is a storage limit, never an upscale preference.
-- Deploy only after SQL/RLS review; no live couple data are modified by this file.
ALTER TABLE public.couples
 ADD COLUMN IF NOT EXISTS surprise_budget_max numeric(12,2) NULL,
 ADD COLUMN IF NOT EXISTS surprise_budget_currency text NOT NULL DEFAULT 'CAD';

ALTER TABLE public.couples
 ADD CONSTRAINT love_surprise_budget_nonnegative
 CHECK (surprise_budget_max IS NULL OR surprise_budget_max >= 0);

ALTER TABLE public.couples
 ADD CONSTRAINT love_surprise_budget_currency_supported
 CHECK (surprise_budget_currency IN ('CAD','USD','EUR','GBP','CHF','JPY','CNY','AUD','NZD','MXN','BRL','MAD','AED','INR'));

CREATE OR REPLACE FUNCTION public.save_love_surprise_budget(
 p_couple uuid, p_budget numeric, p_currency text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.love_verified_identity() THEN
  RAISE EXCEPTION 'Compte connecté et courriel vérifié requis.' USING errcode='42501';
 END IF;
 IF p_couple IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.couple_members m
  WHERE m.couple_id=p_couple AND m.user_id=auth.uid()
 ) THEN
  RAISE EXCEPTION 'Seuls les membres du duo peuvent modifier le budget.' USING errcode='42501';
 END IF;
 IF p_budget IS NOT NULL AND
    (p_budget < 0 OR p_budget > 9999999999.99 OR
     p_budget::text = 'NaN' OR p_budget <> round(p_budget,2)) THEN
  RAISE EXCEPTION 'Budget invalide : montant positif avec deux décimales maximum.' USING errcode='22023';
 END IF;
 IF p_currency IS NULL OR upper(trim(p_currency)) NOT IN
    ('CAD','USD','EUR','GBP','CHF','JPY','CNY','AUD','NZD','MXN','BRL','MAD','AED','INR') THEN
  RAISE EXCEPTION 'Devise du budget invalide.' USING errcode='22023';
 END IF;
 UPDATE public.couples
  SET surprise_budget_max=p_budget,
      surprise_budget_currency=upper(trim(p_currency))
  WHERE id=p_couple;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable.'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_love_surprise_budget(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_love_surprise_budget(uuid,numeric,text) TO authenticated;

-- Coupless RLS stays enabled; only a verified member can update this field.
-- No matching Geoapify venue price is implied by storing a preference.
