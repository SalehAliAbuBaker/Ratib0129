-- Sandbox-only data: never import production licenses or device records.
CREATE TABLE IF NOT EXISTS sandbox_activations (
  license_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (license_key, device_id)
);
