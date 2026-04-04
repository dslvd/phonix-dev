CREATE TABLE IF NOT EXISTS user_app_state (
  user_key TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
