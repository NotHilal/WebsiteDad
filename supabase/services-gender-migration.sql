-- Add gender targeting to services (man / woman / mixed)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'mixed'
  CHECK (gender IN ('man', 'woman', 'mixed'));
