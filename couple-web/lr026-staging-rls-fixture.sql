-- CI ONLY! Synthetic reconstruction of reviewed live SELECT/RLS policies
-- in disposable PostgreSQL. Never apply to Supabase production.
-- Policy names, permissive/restrictive type and predicates were inspected
-- read-only in pg_policies on 2026-10-30.
GRANT USAGE ON SCHEMA public, auth, couple_private TO authenticated;
GRANT SELECT ON public.couple_sessions,public.couple_members,
  public.couple_personal_rolls,public.couple_challenges TO authenticated;
REVOKE SELECT ON public.couple_sessions,public.couple_members,
  public.couple_personal_rolls,public.couple_challenges FROM anon;

ALTER TABLE public.couple_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_personal_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_read ON public.couple_sessions
 FOR SELECT TO authenticated
 USING (couple_private.is_member(couple_id));
CREATE POLICY members_read ON public.couple_members
 FOR SELECT TO authenticated
 USING (couple_private.is_member(couple_id));
CREATE POLICY personal_rolls_read ON public.couple_personal_rolls
 FOR SELECT TO authenticated
 USING (EXISTS(
  SELECT 1 FROM public.couple_sessions s
   WHERE s.id=couple_personal_rolls.session_id
     AND couple_private.is_member(s.couple_id)));
CREATE POLICY challenges_read ON public.couple_challenges
 FOR SELECT TO authenticated
 USING ((recipient=(SELECT auth.uid())) AND couple_private.is_member(couple_id));

-- Confirmed-email gate is RESTRICTIVE in the real DB, i.e. AND,
-- NOT an additional permissive path that would bypass membership.
CREATE POLICY loveroll_confirmed_email_required ON public.couple_sessions
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT public.love_verified_identity()))
 WITH CHECK ((SELECT public.love_verified_identity()));
CREATE POLICY loveroll_confirmed_email_required ON public.couple_members
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT public.love_verified_identity()))
 WITH CHECK ((SELECT public.love_verified_identity()));
CREATE POLICY loveroll_confirmed_email_required ON public.couple_personal_rolls
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT public.love_verified_identity()))
 WITH CHECK ((SELECT public.love_verified_identity()));
CREATE POLICY loveroll_confirmed_email_required ON public.couple_challenges
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT public.love_verified_identity()))
 WITH CHECK ((SELECT public.love_verified_identity()));

-- Fixed synthetic fixtures; committed only to disposable CI database.
INSERT INTO public.couples(id,owner_user_id)
VALUES
 ('10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('20202020-cccc-4ccc-8ccc-cccccccccccc','33333333-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.couple_members(couple_id,user_id) VALUES
 ('10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('20202020-cccc-4ccc-8ccc-cccccccccccc','33333333-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.couple_sessions(id,couple_id,opened_by) VALUES
 ('11111111-1111-4111-8111-222222222222',
  '10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('33333333-3333-4333-8333-444444444444',
  '20202020-cccc-4ccc-8ccc-cccccccccccc','33333333-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.couple_personal_rolls(session_id,user_id,face) VALUES
 ('11111111-1111-4111-8111-222222222222','11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2),
 ('11111111-1111-4111-8111-222222222222','22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb',3),
 ('33333333-3333-4333-8333-444444444444','33333333-cccc-4ccc-8ccc-cccccccccccc',4);
INSERT INTO public.couple_challenges(
 id,session_id,couple_id,offered_by,recipient,category,face,card_id)
VALUES
 ('77777777-1111-4111-8111-777777777777',
  '11111111-1111-4111-8111-222222222222',
  '10101010-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb','SENSUEL',51,1),
 ('88888888-3333-4333-8333-888888888888',
  '33333333-3333-4333-8333-444444444444',
  '20202020-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-cccc-4ccc-8ccc-cccccccccccc','SENSUEL',63,2);
