-- LR-SURPRISE-001: PRIVATE photo bucket for optional monthly memories.
-- Deployment order: 20261102_lr_surprise_monthly_memories.sql FIRST.
-- Only image/jpeg re-encoded from the app; 3 MiB maximum and 1 linked photo
-- per person per roll. There are no public URLs or public grants.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 VALUES ('loveroll-memories','loveroll-memories',false,3145728,ARRAY['image/jpeg']::text[])
 ON CONFLICT (id) DO NOTHING;

CREATE POLICY love_memory_photo_owner_upload ON storage.objects
 FOR INSERT TO authenticated WITH CHECK (
  bucket_id='loveroll-memories'
  AND public.love_verified_identity()
  AND owner_id=auth.uid()::text
  AND (storage.foldername(name))[1]=auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  AND storage.filename(name) ~ '^[0-9a-f-]{36}\.jpg$'
  AND EXISTS(
   SELECT 1 FROM public.couple_rolls r
   JOIN public.couple_members m ON m.couple_id=r.couple_id AND m.user_id=auth.uid()
   JOIN public.love_monthly_completions completed ON completed.roll_id=r.id
   WHERE r.id::text=(storage.foldername(name))[2]
    AND r.kind='monthly_activity'
    AND (SELECT COUNT(*) FROM public.couple_members WHERE couple_id=r.couple_id)=2
    AND EXISTS(SELECT 1 FROM public.couple_members author
      WHERE author.couple_id=r.couple_id AND author.user_id=completed.completed_by)
    AND NOT EXISTS(SELECT 1 FROM public.couple_members newcomer
      WHERE newcomer.couple_id=r.couple_id AND newcomer.joined_at>completed.completed_at)
  )
 );

-- A URL can only be signed/read when a metadata row points to this object,
-- both people still belong to the same duo AND nobody joined after its creation.
CREATE POLICY love_memory_photo_duo_read ON storage.objects
 FOR SELECT TO authenticated USING (
  bucket_id='loveroll-memories'
  AND public.love_verified_identity()
  AND EXISTS(
   SELECT 1 FROM public.love_monthly_feedback f
   WHERE f.photo_path=storage.objects.name
    AND storage.objects.owner_id=f.author_id::text
    AND couple_private.is_member(f.couple_id)
    AND EXISTS(SELECT 1 FROM public.couple_members author
      WHERE author.couple_id=f.couple_id AND author.user_id=f.author_id)
    AND NOT EXISTS(SELECT 1 FROM public.couple_members newcomer
      WHERE newcomer.couple_id=f.couple_id AND newcomer.joined_at>f.created_at)
  )
 );

-- Allow the original owner to READ only their own objects within an active
-- official D100 duo, including the brief upload-before-RPC and unlink-before-
-- deletion windows. The partner still requires the linked feedback SELECT policy
-- above. Without this the Storage DELETE flow may fail on orphaned files.
CREATE POLICY love_memory_photo_owner_read_active ON storage.objects
 FOR SELECT TO authenticated USING (
  bucket_id='loveroll-memories'
  AND public.love_verified_identity()
  AND owner_id=auth.uid()::text
  AND (storage.foldername(name))[1]=auth.uid()::text
  AND EXISTS(
   SELECT 1 FROM public.couple_rolls r
   JOIN public.couple_members m ON m.couple_id=r.couple_id AND m.user_id=auth.uid()
   JOIN public.love_monthly_completions completed ON completed.roll_id=r.id
   WHERE r.id::text=(storage.foldername(name))[2]
    AND r.kind='monthly_activity'
    AND (SELECT COUNT(*) FROM public.couple_members WHERE couple_id=r.couple_id)=2
    AND EXISTS(SELECT 1 FROM public.couple_members original_member
     WHERE original_member.couple_id=r.couple_id
      AND original_member.user_id=completed.completed_by)
    AND NOT EXISTS(SELECT 1 FROM public.couple_members newcomer
     WHERE newcomer.couple_id=r.couple_id
      AND newcomer.joined_at>completed.completed_at)
  )
 );

-- Allow authors to remove an orphan created by an interrupted upload/metadata
-- write; never allow editing someone else's photos or public listing.
CREATE POLICY love_memory_photo_owner_delete ON storage.objects
 FOR DELETE TO authenticated USING (
  bucket_id='loveroll-memories'
  AND owner_id=auth.uid()::text
  AND (storage.foldername(name))[1]=auth.uid()::text
 );

-- No UPDATE/upsert policy. Every replacement creates a new random object.
-- Signed links expire after 5 minutes and should never be stored in Postgres.
