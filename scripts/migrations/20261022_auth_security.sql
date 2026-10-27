-- Run against a LOCAL/TEST database first. Take a backup before production rollout.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_hash varchar(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS auth_challenges (
 id bigserial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose varchar(32) NOT NULL, code_hash varchar(128) NOT NULL,
 expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0,
 consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user_purpose ON auth_challenges(user_id,purpose);
CREATE TABLE IF NOT EXISTS auth_security_events (
 id bigserial PRIMARY KEY, user_id integer REFERENCES users(id) ON DELETE SET NULL,
 event_type varchar(64) NOT NULL, ip_address varchar(64), user_agent varchar(512),
 details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_security_events_time ON auth_security_events(created_at DESC);
CREATE TABLE IF NOT EXISTS merchant_approval_events (
 id bigserial PRIMARY KEY, merchant_id integer NOT NULL REFERENCES merchants(id),
 admin_user_id integer NOT NULL REFERENCES users(id), decision varchar(24) NOT NULL,
 reason text, created_at timestamptz NOT NULL DEFAULT now()
);
