-- Add unique constraint on payment_id for idempotency
-- This prevents duplicate orders for the same payment
ALTER TABLE orders ADD CONSTRAINT orders_payment_id_unique UNIQUE (payment_id);
