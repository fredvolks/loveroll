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
 jsonb_agg(jsonb_build_object('id','card-'||i) ORDER BY i),'initial'
FROM generate_series(1,100) i;
INSERT INTO public.love_future_card_archive_versions
 (couple_id,member_id,level,version_no,cards,source)
SELECT '11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','medium',1,
 jsonb_agg(jsonb_build_object('id','card-'||i) ORDER BY i),'initial'
FROM generate_series(1,100) i;
INSERT INTO public.love_future_card_archive_versions
 (couple_id,member_id,level,version_no,cards,source)
SELECT '22222222-2222-2222-2222-222222222222',
 'cccccccc-cccc-cccc-cccc-cccccccccccc','intense',1,
 jsonb_agg(jsonb_build_object('id','card-'||i) ORDER BY i),'initial'
FROM generate_series(1,100) i;
