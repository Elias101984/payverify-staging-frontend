BEGIN;

-- Customer name is optional, but must survive refreshes, payment redirects,
-- webhook processing and receipt generation.  The purchase order is the
-- canonical capture; PaymentIntent keeps the payment-time snapshot.
ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

ALTER TABLE payment_intents
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

COMMIT;
