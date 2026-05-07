CREATE TABLE IF NOT EXISTS admin_reply_targets (
  admin_chat_id INTEGER PRIMARY KEY,
  telegram_user_id INTEGER NOT NULL,
  user_chat_id INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
