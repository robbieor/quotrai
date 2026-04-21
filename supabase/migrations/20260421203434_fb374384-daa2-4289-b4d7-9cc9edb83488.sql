
-- 1. Tighten avatars bucket SELECT policy (was: any authenticated user could view all avatars)
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;

CREATE POLICY "Users can view own avatar"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Add missing SELECT policy for xero_connections (team owners only)
CREATE POLICY "Team owners can read xero connections"
ON public.xero_connections
FOR SELECT
TO authenticated
USING (public.is_owner_of_team(team_id));

-- 3. Add missing SELECT policy for quickbooks_connections (team owners only)
CREATE POLICY "Team owners can read quickbooks connections"
ON public.quickbooks_connections
FOR SELECT
TO authenticated
USING (public.is_owner_of_team(team_id));

-- 4. Realtime channel authorization — restrict subscriptions to team members
-- Ensure RLS is enabled on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to subscribe only to topics scoped to their team or themselves
-- Topic format convention: 'team:<team_id>', 'user:<user_id>', or table-name channels filtered server-side
CREATE POLICY "Authenticated users can read team-scoped realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow user-scoped topics (user:<their_uid>)
  (realtime.topic() = ('user:' || (auth.uid())::text))
  OR
  -- Allow team-scoped topics where the user belongs to that team
  (
    realtime.topic() LIKE 'team:%'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND ('team:' || (p.team_id)::text) = realtime.topic()
    )
  )
);

CREATE POLICY "Authenticated users can broadcast to team-scoped realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = ('user:' || (auth.uid())::text))
  OR
  (
    realtime.topic() LIKE 'team:%'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND ('team:' || (p.team_id)::text) = realtime.topic()
    )
  )
);
