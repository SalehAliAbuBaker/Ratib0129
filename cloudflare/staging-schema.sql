-- For an EMPTY, SEPARATE staging D1 only. Not a production migration.
-- Models the columns used by the previous Worker, not a verified production schema dump.
CREATE TABLE licenses (
 id TEXT PRIMARY KEY,
 license_type TEXT NOT NULL,
 email TEXT,
 binding_type TEXT NOT NULL DEFAULT 'device',
 max_devices INTEGER NOT NULL DEFAULT 1,
 start_date TEXT NOT NULL,
 expiry_date TEXT,
 status TEXT NOT NULL DEFAULT 'active',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE license_devices (
 id TEXT PRIMARY KEY,
 license_id TEXT NOT NULL REFERENCES licenses(id),
 device_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active'
);
