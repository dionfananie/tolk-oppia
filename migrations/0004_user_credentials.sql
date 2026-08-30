-- Tolk BYOK multi-provider — multiple API keys per user (gambar dokumen user_ai_credentials).
-- Menggantikan api_keys 1-key-per-user. Struktur baru: composite (user_id, provider) + label +
-- key_hint + is_default + last_validated_at. Key tetap ter-enkripsi (enc_key, iv) — tidak pernah
-- plaintext, tidak pernah dikembalikan penuh ke frontend.

CREATE TABLE IF NOT EXISTS user_ai_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,          -- openai | deepseek | anthropic | gemini | openrouter | groq | together
  label TEXT NOT NULL DEFAULT 'Personal',
  default_model TEXT,              -- model terakhir dipilih utk provider ini
  base_url TEXT,                   -- optional custom endpoint/gateway; null = pakai default registry
  encrypted_api_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_hint TEXT NOT NULL,          -- mis. 'sk-…8F2A' utk tampil di UI
  is_default INTEGER NOT NULL DEFAULT 0,
  last_validated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_user_provider
  ON user_ai_credentials (user_id, provider);

-- Migrasi data api_keys lama (1 key per user, belum ada label/null) ke tabel baru.
INSERT OR IGNORE INTO user_ai_credentials
  (user_id, provider, default_model, base_url, encrypted_api_key, iv, key_hint, is_default, created_at, updated_at)
SELECT
  user_id, provider, model, base_url, enc_key, iv,
  CASE WHEN iv IS NOT NULL THEN 'sk-…' ELSE '' END, -- hint generik; menunggu validasi ulang
  1, -- jadikan default utk used lama
  created_at, created_at
FROM api_keys
WHERE enc_key IS NOT NULL AND enc_key <> '';

-- Drop tabel lama setelah data dipindah.
DROP TABLE IF EXISTS api_keys;
