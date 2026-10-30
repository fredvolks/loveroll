-- Synthetic RPC definitions used only by the isolated PostgreSQL CI service.
-- They deliberately contain the exact *original* candidate ordering anchors.
-- Real LoveRoll server RPC definitions are NEVER executed or replaced here.
CREATE OR REPLACE FUNCTION public.draw_for_partner(
 p_session uuid,p_preference text,p_random boolean DEFAULT false
) RETURNS public.couple_challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $lr026_fixture$
declare cid integer; s record; v_cat text:=p_preference;
begin
 -- Assign the same synthetic couple that owns the evening history.
 SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid AS couple_id INTO s;
 select card into cid from generate_series(1,3) AS eligible(card)
 where card>0
 order by random() limit 1;
 if cid is null then raise exception 'Aucune carte disponible';end if;
 return ROW(s.couple_id,p_session,v_cat,cid,null,null)::public.couple_challenges;
end;
$lr026_fixture$;

CREATE OR REPLACE FUNCTION public.love_respond_and_redraw(
 p_challenge uuid,p_action text,p_exclude boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $lr026_fixture$
DECLARE v_card integer; v_old record; v_couple uuid;
BEGIN
 v_couple := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
 SELECT '11111111-1111-4111-8111-111111111111'::uuid AS session_id,
        'SENSUEL'::text AS category INTO v_old;
 SELECT candidate.card INTO v_card
 FROM generate_series(1,3) AS candidate(card)
 WHERE candidate.card>0
 ORDER BY random() LIMIT 1;

 -- An exhausted lot cannot consume a pass
 IF v_card IS NULL THEN
  RAISE EXCEPTION 'No eligible card';
 END IF;
 RETURN pg_catalog.jsonb_build_object('card_id',v_card);
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
