-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cart_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id  uuid REFERENCES products(id)   ON DELETE CASCADE NOT NULL,
  quantity    int  NOT NULL DEFAULT 1,
  added_at    timestamptz DEFAULT now()       NOT NULL,
  expires_at  timestamptz DEFAULT (now() + interval '10 minutes') NOT NULL,
  UNIQUE(user_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);
