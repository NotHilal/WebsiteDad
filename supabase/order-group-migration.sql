-- Add order_group_id to group multiple line-items from the same checkout into one logical order.
-- Nullable so existing rows are unaffected; new checkouts will always populate it.
ALTER TABLE preorders
ADD COLUMN IF NOT EXISTS order_group_id uuid;
