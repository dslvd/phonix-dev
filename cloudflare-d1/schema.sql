CREATE TABLE IF NOT EXISTS user_app_state (
  user_key TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_vocabulary_cache (
  pair_key TEXT PRIMARY KEY,
  payload_text TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'cache',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
