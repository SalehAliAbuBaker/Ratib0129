-- Additive migration: never drops, rewrites, or resets licenses/license_devices.
-- The two existing tables are prerequisites; confirm their schema before production deployment.
CREATE TABLE IF NOT EXISTS ratib_license_meta (
 license_id TEXT PRIMARY KEY REFERENCES licenses(id),
 revision INTEGER NOT NULL DEFAULT 1,
 email_verified INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ratib_signed_devices (
 license_id TEXT NOT NULL REFERENCES licenses(id),
 device_id TEXT NOT NULL,
 public_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','revoked')),
 first_activated_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(license_id,device_id)
);
CREATE INDEX IF NOT EXISTS ratib_signed_devices_status ON ratib_signed_devices(license_id,status);
CREATE TABLE IF NOT EXISTS ratib_trial_starts (
 device_id TEXT PRIMARY KEY,
 license_id TEXT NOT NULL UNIQUE REFERENCES licenses(id),
 started_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ratib_signing_keys (
 kid TEXT PRIMARY KEY,
 public_jwk TEXT NOT NULL,
 wrapped_private_jwk TEXT NOT NULL,
 iv TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','retired'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ratib_one_active_key ON ratib_signing_keys(status) WHERE status='active';
CREATE TABLE IF NOT EXISTS ratib_license_audit (
 id TEXT PRIMARY KEY,
 created_at INTEGER NOT NULL,
 action TEXT NOT NULL,
 license_id TEXT,
 device_id TEXT,
 details TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ratib_license_audit_date ON ratib_license_audit(created_at);
CREATE TABLE IF NOT EXISTS ratib_license_rate_limits (
 rate_key TEXT PRIMARY KEY,
 bucket INTEGER NOT NULL,
 hits INTEGER NOT NULL
);
