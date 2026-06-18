-- manager-role-migration.sql
-- Run this in Supabase → SQL Editor to grant the manager role all required access.
-- Managers can read, create, and update — but NOT delete anything.
-- Safe to re-run: uses DROP IF EXISTS before each CREATE.


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: update auth_user_role() to include manager (used by existing policies)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES — staff read all
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read all profiles" ON profiles;
CREATE POLICY "Staff read all profiles"
  ON profiles FOR SELECT
  USING (auth_user_role() IN ('admin', 'artist', 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ACTIVITY LOGS — managers can read logs
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read logs" ON activity_logs;
CREATE POLICY "Admins read logs"
  ON activity_logs FOR SELECT
  USING (auth_user_role() IN ('admin', 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. GALLERY CATEGORIES — managers can read, insert, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manage gallery categories" ON gallery_categories;
CREATE POLICY "Admin manage gallery categories"
  ON gallery_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Managers read gallery categories" ON gallery_categories;
CREATE POLICY "Managers read gallery categories"
  ON gallery_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert gallery categories" ON gallery_categories;
CREATE POLICY "Managers insert gallery categories"
  ON gallery_categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update gallery categories" ON gallery_categories;
CREATE POLICY "Managers update gallery categories"
  ON gallery_categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PRODUCT CATEGORIES — managers can read, insert, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manage product categories" ON product_categories;
CREATE POLICY "Admin manage product categories"
  ON product_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Managers read product categories" ON product_categories;
CREATE POLICY "Managers read product categories"
  ON product_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert product categories" ON product_categories;
CREATE POLICY "Managers insert product categories"
  ON product_categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update product categories" ON product_categories;
CREATE POLICY "Managers update product categories"
  ON product_categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TICKETS — managers see, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers see store and direct tickets" ON tickets;
CREATE POLICY "Managers see store and direct tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
    AND (recipient_id IS NULL OR recipient_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers update tickets" ON tickets;
CREATE POLICY "Managers update tickets"
  ON tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers delete tickets" ON tickets;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TICKET MESSAGES — managers can read, insert, update read status (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers read ticket messages" ON ticket_messages;
CREATE POLICY "Managers read ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
        AND (t.recipient_id IS NULL OR t.recipient_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers insert ticket messages" ON ticket_messages;
CREATE POLICY "Managers insert ticket messages"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
        AND (t.recipient_id IS NULL OR t.recipient_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers update ticket messages" ON ticket_messages;
CREATE POLICY "Managers update ticket messages"
  ON ticket_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. BLOCKED DATES — managers can read, insert, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage blocked dates" ON blocked_dates;

DROP POLICY IF EXISTS "Managers read blocked dates" ON blocked_dates;
CREATE POLICY "Managers read blocked dates"
  ON blocked_dates FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert blocked dates" ON blocked_dates;
CREATE POLICY "Managers insert blocked dates"
  ON blocked_dates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update blocked dates" ON blocked_dates;
CREATE POLICY "Managers update blocked dates"
  ON blocked_dates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. BLOCKED HOURS — managers can read, insert, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage blocked hours" ON blocked_hours;

DROP POLICY IF EXISTS "Managers read blocked hours" ON blocked_hours;
CREATE POLICY "Managers read blocked hours"
  ON blocked_hours FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert blocked hours" ON blocked_hours;
CREATE POLICY "Managers insert blocked hours"
  ON blocked_hours FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update blocked hours" ON blocked_hours;
CREATE POLICY "Managers update blocked hours"
  ON blocked_hours FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SALON SETTINGS — managers can read and update (no insert/delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers read salon settings" ON salon_settings;
CREATE POLICY "Managers read salon settings"
  ON salon_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update salon settings" ON salon_settings;
CREATE POLICY "Managers update salon settings"
  ON salon_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. STYLISTS — managers can read and update (quota overrides, no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers read stylists" ON stylists;
CREATE POLICY "Managers read stylists"
  ON stylists FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update stylists" ON stylists;
CREATE POLICY "Managers update stylists"
  ON stylists FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. APPOINTMENTS — managers can read, insert (reschedule), update status (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage appointments" ON appointments;

DROP POLICY IF EXISTS "Managers read appointments" ON appointments;
CREATE POLICY "Managers read appointments"
  ON appointments FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert appointments" ON appointments;
CREATE POLICY "Managers insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update appointments" ON appointments;
CREATE POLICY "Managers update appointments"
  ON appointments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. PREORDERS — managers can read, update status (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage preorders" ON preorders;

DROP POLICY IF EXISTS "Managers read preorders" ON preorders;
CREATE POLICY "Managers read preorders"
  ON preorders FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update preorders" ON preorders;
CREATE POLICY "Managers update preorders"
  ON preorders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. TIMESHEETS — managers can read all, insert clock-ins, update clock-outs (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage timesheets" ON timesheets;

DROP POLICY IF EXISTS "Managers read timesheets" ON timesheets;
CREATE POLICY "Managers read timesheets"
  ON timesheets FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert timesheets" ON timesheets;
CREATE POLICY "Managers insert timesheets"
  ON timesheets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update timesheets" ON timesheets;
CREATE POLICY "Managers update timesheets"
  ON timesheets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. COUPONS — managers can read, create, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage coupons" ON coupons;

DROP POLICY IF EXISTS "Managers read coupons" ON coupons;
CREATE POLICY "Managers read coupons"
  ON coupons FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert coupons" ON coupons;
CREATE POLICY "Managers insert coupons"
  ON coupons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update coupons" ON coupons;
CREATE POLICY "Managers update coupons"
  ON coupons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 15. USER COUPONS — managers can read, assign, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage user coupons" ON user_coupons;

DROP POLICY IF EXISTS "Managers read user coupons" ON user_coupons;
CREATE POLICY "Managers read user coupons"
  ON user_coupons FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert user coupons" ON user_coupons;
CREATE POLICY "Managers insert user coupons"
  ON user_coupons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update user coupons" ON user_coupons;
CREATE POLICY "Managers update user coupons"
  ON user_coupons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 16. PRODUCTS — managers can read, create, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage products" ON products;

DROP POLICY IF EXISTS "Managers read products" ON products;
CREATE POLICY "Managers read products"
  ON products FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert products" ON products;
CREATE POLICY "Managers insert products"
  ON products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update products" ON products;
CREATE POLICY "Managers update products"
  ON products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 17. GALLERY — managers can read, upload, update (no delete)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers manage gallery" ON gallery;

DROP POLICY IF EXISTS "Managers read gallery" ON gallery;
CREATE POLICY "Managers read gallery"
  ON gallery FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers insert gallery" ON gallery;
CREATE POLICY "Managers insert gallery"
  ON gallery FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

DROP POLICY IF EXISTS "Managers update gallery" ON gallery;
CREATE POLICY "Managers update gallery"
  ON gallery FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 18. MESSAGES — managers can read (dashboard unread count)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers read messages" ON messages;
CREATE POLICY "Managers read messages"
  ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
