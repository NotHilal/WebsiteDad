-- Run this in the Supabase SQL editor
-- Adds recipient_id to tickets: NULL = sent to store, UUID = sent to a specific employee

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Allow artists to see: store tickets (recipient_id IS NULL) + tickets directed at them
CREATE POLICY "Artists see store and direct tickets" ON tickets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artist')
    AND (recipient_id IS NULL OR recipient_id = auth.uid())
  );

-- Allow artists to read messages inside those tickets
CREATE POLICY "Artists read ticket messages" ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artist')
        AND (t.recipient_id IS NULL OR t.recipient_id = auth.uid())
    )
  );

-- Allow artists to reply in tickets they can see
CREATE POLICY "Artists insert ticket messages" ON ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artist')
        AND (t.recipient_id IS NULL OR t.recipient_id = auth.uid())
    )
  );
