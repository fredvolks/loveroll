-- Synthetic playable deck; no real cards, people or Supabase accounts.
CREATE OR REPLACE FUNCTION public.future_archive_test_cards(p_level text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $demo$
 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id','card-'||i,
  'title','Défi original numéro '||i||' en '||p_level,
  'description','Une carte originale complète pour les deux partenaires numéro '||i,
  'levels',pg_catalog.jsonb_build_array(p_level),
  'target',CASE WHEN i%3=0 THEN 'woman' WHEN i%3=1 THEN 'man' ELSE 'both' END,
  'minutes',2+(i%5)
 ) ORDER BY i)
 FROM pg_catalog.generate_series(1,100) AS i;
$demo$;

INSERT INTO auth.users VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-cccc-cccc-cccccccccccc');
INSERT INTO public.couples VALUES
 ('11111111-1111-1111-1111-111111111111'),
 ('22222222-2222-2222-2222-222222222222');
INSERT INTO public.couple_members VALUES
 ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
 ('11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
 ('22222222-2222-2222-2222-222222222222','cccccccc-cccc-cccc-cccc-cccccccccccc');

INSERT INTO public.love_future_card_archive_versions
 (couple_id,member_id,level,version_no,cards,source)
SELECT '11111111-1111-1111-1111-111111111111',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',1,
 public.future_archive_test_cards('soft'),'initial';
INSERT INTO public.love_future_card_archive_versions
 (couple_id,member_id,level,version_no,cards,source)
SELECT '11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','medium',1,
 public.future_archive_test_cards('medium'),'initial';
INSERT INTO public.love_future_card_archive_versions
 (couple_id,member_id,level,version_no,cards,source)
SELECT '22222222-2222-2222-2222-222222222222',
 'cccccccc-cccc-cccc-cccc-cccccccccccc','intense',1,
 public.future_archive_test_cards('intense'),'initial';
