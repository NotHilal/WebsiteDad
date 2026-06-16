-- Run this in the Supabase SQL editor
-- Adds appointment_id to tickets so contact-us messages are linked to the appointment

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS tickets_appointment_id_idx ON tickets(appointment_id);
