-- =========================================
-- HairGo Supabase Database Schema
-- Run this in the Supabase SQL editor
-- =========================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stylists
CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  photo_url TEXT,
  specialties TEXT[],
  instagram TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  duration INTEGER DEFAULT 60,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  category TEXT CHECK (category IN ('cut', 'color', 'treatment', 'style')),
  stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preorders
CREATE TABLE IF NOT EXISTS preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retrieved', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_points_required INTEGER DEFAULT 0,
  expiry_date DATE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Coupons
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT FALSE,
  granted_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)
);

-- Messages (real-time chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  is_admin_broadcast BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked Dates (admin sets these, prevents bookings)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Stylists, Services, Gallery (public read)
CREATE POLICY "Public read stylists" ON stylists FOR SELECT USING (true);
CREATE POLICY "Admin manage stylists" ON stylists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Admin manage services" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public read gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Admin manage gallery" ON gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Products
CREATE POLICY "Public read available products" ON products FOR SELECT USING (available = true);
CREATE POLICY "Admin manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Appointments
CREATE POLICY "Users can read own appointments" ON appointments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create appointments" ON appointments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage appointments" ON appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Preorders
CREATE POLICY "Users can read own preorders" ON preorders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create preorders" ON preorders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own preorders" ON preorders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins manage preorders" ON preorders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Coupons
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins manage coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User Coupons
CREATE POLICY "Users read own coupons" ON user_coupons FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage user coupons" ON user_coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Messages
CREATE POLICY "Users can read own messages" ON messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_admin_broadcast = true);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admins read all messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins send messages" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update messages" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Blocked dates (public read)
CREATE POLICY "Public read blocked dates" ON blocked_dates FOR SELECT USING (true);
CREATE POLICY "Admins manage blocked dates" ON blocked_dates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =========================================
-- TRIGGERS
-- =========================================

-- Auto-create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- ENABLE REALTIME
-- =========================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE preorders;

-- =========================================
-- SAMPLE DATA
-- =========================================

INSERT INTO stylists (name, title, bio, specialties, display_order) VALUES
('Sophie Laurens', 'Creative Director', 'With 15 years of expertise, Sophie leads the salon with a passion for precision cuts and avant-garde color work. Her philosophy: every cut tells a story.', ARRAY['Precision Cut', 'Color Art', 'Balayage'], 1),
('Marc Duval', 'Color Specialist', 'Marc is our in-house color wizard, specializing in balayage, ombré and vivid transformations. His work has been featured in leading fashion publications.', ARRAY['Balayage', 'Highlights', 'Color Correction'], 2),
('Léa Moreau', 'Hair Artist', 'Léa brings technical mastery and a delicate touch to every client, whether sculpting a sharp bob or creating effortless beach waves.', ARRAY['Cuts', 'Styling', 'Treatments'], 3),
('Théo Bernard', 'Texture Expert', 'Specializing in textured hair, Théo understands the unique needs of curly and coily clients, creating shapes that celebrate natural beauty.', ARRAY['Textured Hair', 'Natural Curls', 'Treatments'], 4)
ON CONFLICT DO NOTHING;

INSERT INTO services (name, description, price, duration, category) VALUES
('Precision Cut', 'A tailored cut sculpted to your face shape and lifestyle. Includes consultation, wash and blow-dry.', 55.00, 60, 'Cut'),
('Color & Highlights', 'Full color, highlights or balayage service. Includes wash, treatment and style.', 95.00, 120, 'Color'),
('Keratin Treatment', 'Smoothing treatment that reduces frizz and adds brilliant shine for up to 4 months.', 85.00, 90, 'Treatment'),
('Blow-Out & Style', 'A flawless blow-dry and style for any occasion. Perfect for events or weekly maintenance.', 38.00, 45, 'Style'),
('Balayage', 'Hand-painted highlights that create a natural, sun-kissed effect with beautiful dimension.', 115.00, 150, 'Color'),
('Hair Consultation', 'In-depth consultation with one of our expert stylists to plan your perfect look.', 0.00, 30, 'Other')
ON CONFLICT DO NOTHING;
