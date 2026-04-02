
-- 1. document-emails: drop old permissive storage policies
DROP POLICY IF EXISTS "Users can read document PDFs via signed URLs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload document PDFs" ON storage.objects;

-- 2. job_photos: drop anon read-all policy
DROP POLICY IF EXISTS "Anyone can view job photos" ON public.job_photos;
DROP POLICY IF EXISTS "Public read access for job photos" ON public.job_photos;
DROP POLICY IF EXISTS "anon_select_job_photos" ON public.job_photos;
-- catch generic names
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'job_photos' AND schemaname = 'public'
      AND roles::text LIKE '%anon%'
      AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_photos', pol.policyname);
  END LOOP;
END $$;

-- 3. profiles: restrict SELECT to same-team members only
-- First drop any overly broad select policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Add team-scoped SELECT policy for profiles
CREATE POLICY "Users can view same-team profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR id IN (
    SELECT tm.user_id FROM public.team_memberships tm
    WHERE tm.team_id = public.get_user_team_id()
  )
);

-- 4. marketing-assets: drop old broad policies, add team-scoped
DROP POLICY IF EXISTS "Marketing assets auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Marketing assets auth delete" ON storage.objects;

CREATE POLICY "Team-scoped marketing asset upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-assets'
  AND (storage.foldername(name))[1] = public.get_user_team_id()::text
);

CREATE POLICY "Team-scoped marketing asset delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-assets'
  AND (storage.foldername(name))[1] = public.get_user_team_id()::text
);

-- 5. cancellation_reasons: add SELECT policy
CREATE POLICY "Users can read own cancellation reasons"
ON public.cancellation_reasons
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
