-- ============================================================
-- HAIR GO — Supabase Schema
-- Run this in your Supabase SQL editor (Project > SQL)
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  phone      TEXT DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  points     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. PRODUCTS
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  name_ar     TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  stock       INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CART ITEMS (48h reservation)
CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 1,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]',
  total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','picked_up','cancelled')),
  pay_method  TEXT NOT NULL DEFAULT 'on_site',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APPOINTMENTS
CREATE TABLE appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id   INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  staff_id     INTEGER NOT NULL,
  staff_name   TEXT NOT NULL,
  date         DATE NOT NULL,
  time         TIME NOT NULL,
  duration     INTEGER NOT NULL DEFAULT 45,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','done','cancelled')),
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGES (tickets)
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  unread_admin  BOOLEAN DEFAULT TRUE,
  unread_user   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MESSAGE REPLIES
CREATE TABLE message_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','admin')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COUPONS
CREATE TABLE coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value       NUMERIC(10,2) NOT NULL,
  expires_at  TIMESTAMPTZ,
  max_uses    INTEGER,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 9. COUPON USES
CREATE TABLE coupon_uses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses    ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Users read own profile"   ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admin reads all"          ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "System insert profile"    ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- PRODUCTS (public read, admin write)
CREATE POLICY "Anyone reads products"    ON products FOR SELECT USING (active = TRUE OR is_admin());
CREATE POLICY "Admin manages products"   ON products FOR ALL USING (is_admin());

-- CART ITEMS (own only)
CREATE POLICY "User manages own cart"    ON cart_items FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin reads all carts"    ON cart_items FOR SELECT USING (is_admin());

-- ORDERS
CREATE POLICY "User reads own orders"    ON orders FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "User creates own orders"  ON orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manages orders"     ON orders FOR ALL USING (is_admin());

-- APPOINTMENTS
CREATE POLICY "User reads own appts"     ON appointments FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "User creates appts"       ON appointments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User cancels own appt"    ON appointments FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admin manages all appts"  ON appointments FOR ALL USING (is_admin());

-- MESSAGES
CREATE POLICY "User reads own messages"  ON messages FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "User creates messages"    ON messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own msg"     ON messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admin manages messages"   ON messages FOR ALL USING (is_admin());

-- MESSAGE REPLIES
CREATE POLICY "User reads own replies"   ON message_replies FOR SELECT
  USING (is_admin() OR EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.user_id = auth.uid()));
CREATE POLICY "User adds reply to own"   ON message_replies FOR INSERT
  WITH CHECK (sender_role = 'user' AND EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.user_id = auth.uid()));
CREATE POLICY "Admin full replies"       ON message_replies FOR ALL USING (is_admin());

-- COUPONS (admin write, anyone read active)
CREATE POLICY "Anyone reads active coupons" ON coupons FOR SELECT USING (active = TRUE OR is_admin());
CREATE POLICY "Admin manages coupons"       ON coupons FOR ALL USING (is_admin());

-- COUPON USES
CREATE POLICY "User reads own uses"       ON coupon_uses FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "User inserts own use"      ON coupon_uses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin reads all uses"      ON coupon_uses FOR SELECT USING (is_admin());

-- ============================================================
-- MAKE YOURSELF ADMIN
-- After signing up, run this once with your user UUID:
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'hilal.elayoubi@gmail.com';
--
-- ============================================================
