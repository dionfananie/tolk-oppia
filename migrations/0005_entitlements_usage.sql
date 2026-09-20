-- Hosted plans and prepaid voice balance.
-- Payment webhooks will update these rows once a provider is selected.
CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL DEFAULT 'byok',
  status TEXT NOT NULL DEFAULT 'active',
  voice_seconds_balance INTEGER NOT NULL DEFAULT 0,
  current_period_start INTEGER,
  current_period_end INTEGER,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  updated_at INTEGER NOT NULL
);

-- Platform credentials are separate from user BYOK credentials.
CREATE TABLE IF NOT EXISTS platform_credentials (
  provider TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT 'TOLK hosted provider',
  default_model TEXT,
  base_url TEXT,
  encrypted_api_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_validated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlements_plan_status
  ON user_entitlements (plan_id, status);

CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON usage_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_kind
  ON usage_events (user_id, kind, created_at);
