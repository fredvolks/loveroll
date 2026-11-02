-- LR-SURPRISE-001 P1: dates agreed by BOTH members, never a booking with a venue.
-- Isolated from the D100 roll and external reservations. Do not deploy before review.
CREATE TABLE IF NOT EXISTS public.love_monthly_date_plans (
 roll_id uuid PRIMARY KEY REFERENCES public.couple_rolls(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 proposed_for timestamptz NOT NULL,
 proposed_by uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','agreed')),
 agreed_by uuid REFERENCES auth.users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.love_monthly_date_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.love_monthly_date_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.love_monthly_date_plans TO authenticated;
CREATE POLICY love_monthly_date_plans_couple_read ON public.love_monthly_date_plans
 FOR SELECT TO authenticated USING (couple_private.is_member(couple_id));

CREATE OR REPLACE FUNCTION public.manage_love_monthly_date(
 p_roll uuid, p_action text, p_when timestamptz DEFAULT NULL,
 p_expected_version integer DEFAULT NULL
) RETURNS public.love_monthly_date_plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_actor uuid:=auth.uid();
 v_roll public.couple_rolls%rowtype;
 v_hostroll public.couple_rolls%rowtype;
 v_host uuid;
 v_count integer;
 v_plan public.love_monthly_date_plans%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO v_roll FROM public.couple_rolls
  WHERE id=p_roll AND kind='monthly_activity';
 IF NOT FOUND OR NOT couple_private.is_member(v_roll.couple_id) THEN
  RAISE EXCEPTION 'Tirage Surprise inaccessible' USING errcode='42501';
 END IF;
 SELECT COUNT(*) INTO v_count FROM public.couple_members
  WHERE couple_id=v_roll.couple_id;
 IF v_count<>2 THEN
  RAISE EXCEPTION 'Un duo de deux membres est nécessaire' USING errcode='22023';
 END IF;
 SELECT * INTO v_hostroll FROM public.couple_rolls
  WHERE couple_id=v_roll.couple_id AND kind='monthly_host' AND key=v_roll.key;
 IF NOT FOUND THEN RAISE EXCEPTION 'Le D6 doit désigner qui invite' USING errcode='22023'; END IF;
 SELECT m.user_id INTO v_host FROM public.couple_members m
  WHERE m.couple_id=v_roll.couple_id ORDER BY m.joined_at,m.user_id
  LIMIT 1 OFFSET (CASE WHEN mod(v_hostroll.face,2)=0 THEN 0 ELSE 1 END);
 SELECT * INTO v_plan FROM public.love_monthly_date_plans
  WHERE roll_id=p_roll FOR UPDATE;

 IF p_action='propose' THEN
  IF v_actor IS DISTINCT FROM v_host THEN
   RAISE EXCEPTION 'Seule la personne qui invite propose la première date' USING errcode='42501';
  END IF;
  IF v_plan.roll_id IS NOT NULL THEN
   RAISE EXCEPTION 'Une date existe déjà; actualisez avant de proposer une variante' USING errcode='22023';
  END IF;
 ELSIF p_action IN ('counter','accept') THEN
  IF v_plan.roll_id IS NULL OR v_plan.status<>'proposed' THEN
   RAISE EXCEPTION 'Aucune proposition ouverte' USING errcode='22023';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version<>v_plan.version THEN
   RAISE EXCEPTION 'Proposition modifiée; actualisez la page' USING errcode='40001';
  END IF;
  IF v_actor IS NOT DISTINCT FROM v_plan.proposed_by THEN
   RAISE EXCEPTION 'Votre partenaire doit répondre à la date' USING errcode='42501';
  END IF;
 ELSE
  RAISE EXCEPTION 'Action de rendez-vous invalide' USING errcode='22023';
 END IF;

 IF p_action IN ('propose','counter') THEN
  IF p_when IS NULL OR p_when<=now() OR p_when>now()+interval '2 years' THEN
   RAISE EXCEPTION 'Choisissez une date future de moins de deux ans' USING errcode='22023';
  END IF;
  -- Changing an existing external booking must be handled explicitly elsewhere.
  IF EXISTS (SELECT 1 FROM public.love_monthly_reservations b
    WHERE b.roll_id=p_roll AND b.status='confirmed') THEN
   RAISE EXCEPTION 'Une réservation confirmée existe déjà; gérez-la séparément' USING errcode='22023';
  END IF;
  IF p_action='propose' THEN
   INSERT INTO public.love_monthly_date_plans
    (roll_id,couple_id,proposed_for,proposed_by)
   VALUES (p_roll,v_roll.couple_id,p_when,v_actor)
   RETURNING * INTO v_plan;
  ELSE
   UPDATE public.love_monthly_date_plans SET
    proposed_for=p_when,proposed_by=v_actor,agreed_by=NULL,
    version=version+1,updated_at=now()
   WHERE roll_id=p_roll RETURNING * INTO v_plan;
  END IF;
 ELSE
  IF v_plan.proposed_for<=now() THEN
   RAISE EXCEPTION 'La date proposée est passée; proposez une nouvelle date' USING errcode='22023';
  END IF;
  UPDATE public.love_monthly_date_plans SET
   status='agreed',agreed_by=v_actor,version=version+1,updated_at=now()
  WHERE roll_id=p_roll RETURNING * INTO v_plan;
 END IF;
 RETURN v_plan;
END;
$function$;

REVOKE ALL ON FUNCTION public.manage_love_monthly_date(uuid,text,timestamptz,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_love_monthly_date(uuid,text,timestamptz,integer) TO authenticated;
