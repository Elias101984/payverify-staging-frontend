BEGIN;

ALTER TABLE payment_intents
    ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(120),
    ADD COLUMN IF NOT EXISTS gateway_authorization_url TEXT,
    ADD COLUMN IF NOT EXISTS gateway_access_code VARCHAR(180),
    ADD COLUMN IF NOT EXISTS payment_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS paystack_settlement_id BIGINT,
    ADD COLUMN IF NOT EXISTS settlement_amount_kobo INTEGER,
    ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settlement_checked_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_gateway_reference_uq
    ON payment_intents (gateway_reference)
    WHERE gateway_reference IS NOT NULL;

ALTER TABLE merchants
    ADD COLUMN IF NOT EXISTS paystack_subaccount_code VARCHAR(120),
    ADD COLUMN IF NOT EXISTS paystack_subaccount_id BIGINT,
    ADD COLUMN IF NOT EXISTS platform_fee_kobo INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paystack_fee_bearer VARCHAR(20) NOT NULL DEFAULT 'subaccount';

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(40);

ALTER TABLE merchants
    DROP CONSTRAINT IF EXISTS merchants_platform_fee_kobo_nonnegative;

ALTER TABLE merchants
    ADD CONSTRAINT merchants_platform_fee_kobo_nonnegative
    CHECK (platform_fee_kobo >= 0);

ALTER TABLE merchants
    DROP CONSTRAINT IF EXISTS merchants_paystack_fee_bearer_valid;

ALTER TABLE merchants
    ADD CONSTRAINT merchants_paystack_fee_bearer_valid
    CHECK (paystack_fee_bearer IN ('account', 'subaccount'));

COMMIT;
