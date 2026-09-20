-- Platform credentials are scoped by capability: one LLM key and one voice key.
CREATE TABLE IF NOT EXISTS platform_credentials_v2 (
  scope TEXT PRIMARY KEY CHECK (scope IN ('llm', 'voice')),
  provider TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'TOLK hosted provider',
  default_model TEXT,
  stt_model TEXT,
  tts_model TEXT,
  base_url TEXT,
  encrypted_api_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_validated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_credentials_v2_provider
  ON platform_credentials_v2 (provider, enabled);
