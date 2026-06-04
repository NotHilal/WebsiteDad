-- Run this in your Supabase SQL editor

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_intent_id  text,
  ADD COLUMN IF NOT EXISTS payment_status     text DEFAULT 'unpaid';

ALTER TABLE preorders
  ADD COLUMN IF NOT EXISTS payment_intent_id  text,
  ADD COLUMN IF NOT EXISTS payment_status     text DEFAULT 'unpaid';

-- Optional: index for the webhook lookups
CREATE INDEX IF NOT EXISTS idx_appointments_payment_intent ON appointments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_preorders_payment_intent    ON preorders(payment_intent_id);
