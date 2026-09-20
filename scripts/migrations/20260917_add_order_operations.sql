BEGIN;

CREATE TABLE IF NOT EXISTS refunds (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refunds_transaction_id_idx
    ON refunds (transaction_id);

CREATE INDEX IF NOT EXISTS refunds_status_idx
    ON refunds (status);

CREATE TABLE IF NOT EXISTS disputes (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    reason_code VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disputes_transaction_id_idx
    ON disputes (transaction_id);

CREATE INDEX IF NOT EXISTS disputes_status_idx
    ON disputes (status);

CREATE UNIQUE INDEX IF NOT EXISTS disputes_one_open_per_tx
    ON disputes (transaction_id)
    WHERE status = 'open';

COMMIT;
