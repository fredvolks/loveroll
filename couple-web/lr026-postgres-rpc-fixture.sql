-- Synthetic RPC definitions used only by the isolated PostgreSQL CI service.
-- They deliberately contain the exact *original* candidate ordering anchors.
-- Real LoveRoll server RPC definitions are NEVER executed or replaced here.
CREATE OR REPLACE FUNCTION public.draw_for_partner(
 p_session uuid,p_preference text,p_random boolean DEFAULT false
) RETURNS public.couple_challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $lr026_fixture$
declare cid integer; s record; v_cat text:=p_preference; card integer;
begin
 select card into cid from generate_series(1,100) card
 where card>0
 order by random() limit 1;
 if cid is null then raise exception 'Aucune carte disponible';end if;
 return null;
end;
$lr026_fixture$;

CREATE OR REPLACE FUNCTION public.love_respond_and_redraw(
 p_challenge uuid,p_action text,p_exclude boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $lr026_fixture$
DECLARE v_card integer; v_old record; v_couple uuid; candidate record;
BEGIN
 SELECT candidate.card INTO v_card
 FROM generate_series(1,100) AS candidate(card)
 WHERE candidate.card>0
 ORDER BY random() LIMIT 1;

 -- An exhausted lot cannot consume a pass
 IF v_card IS NULL THEN
  RAISE EXCEPTION 'No eligible card';
 END IF;
 RETURN '{}'::jsonb;
END;
$lr026_fixture$;

-- Check that CREATE OR REPLACE does not broaden permissions on existing RPCs.
REVOKE ALL ON FUNCTION public.draw_for_partner(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.draw_for_partner(uuid,text,boolean)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 TO authenticated;
