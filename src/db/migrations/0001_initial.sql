CREATE TABLE users (
  telegram_user_id INTEGER PRIMARY KEY,
  telegram_chat_id INTEGER NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE message_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_chat_id INTEGER NOT NULL,
  admin_message_id INTEGER NOT NULL,
  user_chat_id INTEGER NOT NULL,
  user_message_id INTEGER NOT NULL,
  direction TEXT NOT NULL DEFAULT 'user_to_admin',
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_message_links_admin_route
  ON message_links (admin_chat_id, admin_message_id);

CREATE INDEX idx_message_links_user_created_at
  ON message_links (user_chat_id, created_at);
