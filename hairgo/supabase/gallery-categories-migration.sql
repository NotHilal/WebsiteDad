-- Remove the hardcoded CHECK constraint on gallery.category
ALTER TABLE gallery DROP CONSTRAINT IF EXISTS gallery_category_check;

-- Update existing lowercase keys to display names
UPDATE gallery SET category = 'Cut'       WHERE category = 'cut';
UPDATE gallery SET category = 'Color'     WHERE category = 'color';
UPDATE gallery SET category = 'Treatment' WHERE category = 'treatment';
UPDATE gallery SET category = 'Style'     WHERE category = 'style';

-- Create gallery_categories table
CREATE TABLE IF NOT EXISTS gallery_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#C9A84C',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

ALTER TABLE gallery_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gallery categories" ON gallery_categories FOR SELECT USING (true);
CREATE POLICY "Admin manage gallery categories" ON gallery_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default categories
INSERT INTO gallery_categories (name, color) VALUES
  ('Cut',       '#60a5fa'),
  ('Color',     '#c084fc'),
  ('Treatment', '#34d399'),
  ('Style',     '#C9A84C')
ON CONFLICT (name) DO NOTHING;
