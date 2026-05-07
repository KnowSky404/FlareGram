export interface UserUpsertRecord {
  telegramUserId: number;
  telegramChatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  now: string;
}

export interface UserRecord {
  telegramUserId: number;
  telegramChatId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface UserRow {
  telegram_user_id: number;
  telegram_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    telegramUserId: row.telegram_user_id,
    telegramChatId: row.telegram_chat_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
  };
}

export function createUserRepository(db: D1Database) {
  return {
    async upsert(record: UserUpsertRecord): Promise<void> {
      await db
        .prepare(
          `INSERT INTO users
            (telegram_user_id, telegram_chat_id, username, first_name, last_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(telegram_user_id) DO UPDATE SET
             telegram_chat_id = excluded.telegram_chat_id,
             username = excluded.username,
             first_name = excluded.first_name,
             last_name = excluded.last_name,
             updated_at = excluded.updated_at`
        )
        .bind(
          record.telegramUserId,
          record.telegramChatId,
          record.username ?? null,
          record.firstName ?? null,
          record.lastName ?? null,
          record.now,
          record.now
        )
        .run();
    },
    async findByTelegramUserId(telegramUserId: number): Promise<UserRecord | null> {
      const row = await db
        .prepare(
          `SELECT telegram_user_id, telegram_chat_id, username, first_name, last_name
           FROM users
           WHERE telegram_user_id = ?`
        )
        .bind(telegramUserId)
        .first<UserRow>();

      return row ? mapUserRow(row) : null;
    },
  };
}
