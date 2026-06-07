-- Add visible column to gallery table
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

-- Update schema reference
-- All existing rows default to visible = true
