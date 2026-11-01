-- Synthetic payment proofs for an isolated PostgreSQL CI database ONLY.
-- Does not integrate any payment provider or create real entitlements.
CREATE OR REPLACE FUNCTION public.future_archive_test_regen_cards(
 p_level text,p_suffix text
) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $demo$
 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id','new-'||p_suffix||'-'||i,
  'title','Proposition inédite '||p_suffix||' numéro '||i,
  'description','Une nouvelle carte originale et complète pour les deux partenaires numéro '||i,
  'levels',pg_catalog.jsonb_build_array(p_level),
  'target',CASE WHEN i%3=0 THEN 'woman' WHEN i%3=1 THEN 'man' ELSE 'both' END,
  'minutes',2+(i%5)
 ) ORDER BY i)
 FROM pg_catalog.generate_series(1,100) i;
$demo$;

INSERT INTO couple_private.love_future_verified_regen_receipts
 (id,couple_id,member_id,level,provider_ref,amount_cad_cents,verified_at)
VALUES
 ('dddddddd-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'soft','synthetic-a-first',400,transaction_timestamp()),
 ('dddddddd-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'soft','synthetic-a-second',400,transaction_timestamp()),
 ('dddddddd-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'medium','synthetic-b-first',400,transaction_timestamp()),
 ('dddddddd-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'soft','synthetic-outsider',400,transaction_timestamp()),
 ('dddddddd-0000-0000-0000-000000000005',
  '22222222-2222-2222-2222-222222222222',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'intense','synthetic-c-first',400,transaction_timestamp());
