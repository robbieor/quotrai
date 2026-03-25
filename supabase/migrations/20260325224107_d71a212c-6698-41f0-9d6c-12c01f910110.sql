
-- FIX 3: Analytics events - enforce user_id matches auth.uid()
CREATE POLICY "Authenticated users can insert own analytics events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
