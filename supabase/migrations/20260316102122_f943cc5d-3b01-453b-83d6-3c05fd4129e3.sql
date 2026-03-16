-- Fix leads RLS: require owner/manager OR grow seat type
DROP POLICY IF EXISTS "Users can view leads for their team" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads for their team" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads for their team" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads for their team" ON public.leads;

CREATE POLICY "Team leads select by role or grow seat"
  ON public.leads FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      public.is_owner_or_manager_of_team(team_id)
      OR (SELECT public.get_user_seat_type()) = 'grow'
    )
  );

CREATE POLICY "Team leads insert by role or grow seat"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      public.is_owner_or_manager_of_team(team_id)
      OR (SELECT public.get_user_seat_type()) = 'grow'
    )
  );

CREATE POLICY "Team leads update by role or grow seat"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    team_id IN (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      public.is_owner_or_manager_of_team(team_id)
      OR (SELECT public.get_user_seat_type()) = 'grow'
    )
  );

CREATE POLICY "Team leads delete by role or grow seat"
  ON public.leads FOR DELETE TO authenticated
  USING (
    team_id IN (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      public.is_owner_or_manager_of_team(team_id)
      OR (SELECT public.get_user_seat_type()) = 'grow'
    )
  );