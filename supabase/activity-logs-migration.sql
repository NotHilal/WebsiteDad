-- Run this once in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name  text        NOT NULL DEFAULT 'Unknown',
  actor_role  text        NOT NULL DEFAULT 'user',
  action      text        NOT NULL,
  entity_type text,
  entity_id   text,
  details     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_actor_id_idx   ON activity_logs (actor_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins read logs"
  ON activity_logs FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Any authenticated user can write (artists log their own clock-ins etc.)
CREATE POLICY "Authenticated insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
