
-- BLOCKER 2: Fix document-emails storage policies
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read document emails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload document emails" ON storage.objects;

-- Team-scoped read: user can only read files in their team's folder
CREATE POLICY "Team-scoped read document-emails"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-emails'
  AND (storage.foldername(name))[1] = (SELECT public.get_user_team_id()::text)
);

-- Team-scoped upload: user can only upload to their team's folder
CREATE POLICY "Team-scoped upload document-emails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-emails'
  AND (storage.foldername(name))[1] = (SELECT public.get_user_team_id()::text)
);

-- BLOCKER 3: Fix job_photos anon read policy
DROP POLICY IF EXISTS "Anyone can view job photos" ON public.job_photos;
DROP POLICY IF EXISTS "Public read access" ON public.job_photos;

-- Replace with team-scoped policy for authenticated users
CREATE POLICY "Team members can view job photos"
ON public.job_photos FOR SELECT
TO authenticated
USING (
  team_id = (SELECT public.get_user_team_id())
);

-- BLOCKER 4: Secure team_member_profiles view
-- Views inherit the security of underlying tables, but we need to ensure
-- the view is created with security_invoker so RLS applies
DROP VIEW IF EXISTS public.team_member_profiles;

CREATE VIEW public.team_member_profiles
WITH (security_invoker = true)
AS
SELECT
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.created_at,
  p.full_name,
  p.email,
  p.avatar_url
FROM public.team_memberships tm
LEFT JOIN public.profiles p ON p.id = tm.user_id;

-- BLOCKER 5: Add team-scoped RLS to location_pings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'location_pings' AND policyname = 'Team members can view location pings'
  ) THEN
    CREATE POLICY "Team members can view location pings"
    ON public.location_pings FOR SELECT
    TO authenticated
    USING (
      team_id = (SELECT public.get_user_team_id())
    );
  END IF;
END $$;

-- Add team-scoped RLS to notifications (if not already scoped)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Team members can view notifications'
  ) THEN
    CREATE POLICY "Team members can view notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
      team_id = (SELECT public.get_user_team_id())
    );
  END IF;
END $$;
