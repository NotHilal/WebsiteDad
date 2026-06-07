-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#C9A84C',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Admin manage product categories" ON product_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default categories
INSERT INTO product_categories (name, color) VALUES
  ('Shampoo',       '#60a5fa'),
  ('Conditioner',   '#818cf8'),
  ('Hair Mask',     '#c084fc'),
  ('Styling Cream', '#f472b6'),
  ('Hair Oil',      '#f59e0b'),
  ('Color',         '#fb923c'),
  ('Treatment',     '#34d399'),
  ('Spray',         '#22d3ee'),
  ('Serum',         '#a3e635'),
  ('Wax',           '#C9A84C'),
  ('Tools',         '#94a3b8'),
  ('Accessories',   '#2dd4bf'),
  ('Beard',         '#38bdf8'),
  ('Skincare',      '#f472b6'),
  ('Gift Set',      '#fb7185')
ON CONFLICT (name) DO NOTHING;
