
-- Prevent duplicate active clock-ins
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_entry_per_user
  ON time_entries (user_id)
  WHERE status = 'active';

-- Add photo columns to time_entries
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS clock_in_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS clock_out_photo_url TEXT;

-- Travel logs table
CREATE TABLE IF NOT EXISTS travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  origin_address TEXT,
  destination_address TEXT,
  distance_meters NUMERIC,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view travel logs"
  ON travel_logs FOR SELECT
  TO authenticated
  USING (is_member_of_team(team_id));

CREATE POLICY "Team members can create travel logs"
  ON travel_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_team(team_id));

-- Time anomalies table
CREATE TABLE IF NOT EXISTS time_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  anomaly_type TEXT NOT NULL,
  details JSONB,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE time_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can view anomalies"
  ON time_anomalies FOR SELECT
  TO authenticated
  USING (is_owner_or_manager_of_team(team_id));

CREATE POLICY "Service role can manage anomalies"
  ON time_anomalies FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Team members can create anomalies"
  ON time_anomalies FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_team(team_id));

-- Enable realtime on location_pings for live map
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_pings;
