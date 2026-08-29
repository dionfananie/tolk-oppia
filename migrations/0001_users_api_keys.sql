-- Tolk-Oppia — server-side API key storage (plan tolk-oppia-db-key.md)
-- users: identitas Google OAuth per pengguna
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  created_at INTEGER NOT NULL
);

-- api_keys: key terenkripsi (AES-GCM) + metadata provider/model/base_url
CREATE TABLE IF NOT EXISTS api_keys (
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  base_url TEXT,
  enc_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
