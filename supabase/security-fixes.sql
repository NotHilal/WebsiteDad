-- security-fixes.sql
-- Run this in Supabase → SQL Editor before deploying the updated frontend.


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Activity logs: users can only insert logs as themselves
--    Prevents authenticated users from forging admin audit entries.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated insert logs" ON activity_logs;

CREATE POLICY "Authenticated insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND actor_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Profiles: restrict SELECT so users can only read their own profile.
--    Staff (admin/artist) can read all profiles (needed for Studio pages).
--    Prevents public enumeration of phone numbers, emails, and roles.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;

-- Helper: returns the current user's role without triggering recursive RLS
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Users read their own profile
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Staff read all profiles (admin panel needs this)
CREATE POLICY "Staff read all profiles"
  ON profiles FOR SELECT
  USING (auth_user_role() IN ('admin', 'artist'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Atomic stock decrement RPC
--    Replaces the client-side read-modify-write that could oversell on
--    concurrent checkouts. Uses a database-level lock via UPDATE ... WHERE
--    so only one transaction can decrement for a given product at a time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_product_stock TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. user_coupons: allow users to self-claim public promo codes
--    Users can INSERT a row for themselves with used=false only.
--    The edge function (service role) handles marking used=true.
--    UPDATE policy was added separately ("Users mark own coupons used").
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can claim promo coupons" ON user_coupons;

CREATE POLICY "Users can claim promo coupons"
  ON user_coupons FOR INSERT
  WITH CHECK (user_id = auth.uid() AND used = false);
