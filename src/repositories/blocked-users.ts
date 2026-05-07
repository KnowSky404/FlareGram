export interface BlockedUserRecord {
  telegramUserId: number;
  telegramChatId: number;
  blockedByChatId: number;
  now: string;
}

export function createBlockedUserRepository(db: D1Database) {
  return {
    async isBlocked(telegramUserId: number): Promise<boolean> {
      const result = await db
        .prepare(
          `SELECT telegram_user_id
           FROM blocked_users
           WHERE telegram_user_id = ?`
        )
        .bind(telegramUserId)
        .first<{ telegram_user_id: number }>();

      return result !== null;
    },

    async block(record: BlockedUserRecord): Promise<void> {
      await db
        .prepare(
          `INSERT INTO blocked_users
            (telegram_user_id, telegram_chat_id, blocked_by_chat_id, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(telegram_user_id) DO UPDATE SET
             telegram_chat_id = excluded.telegram_chat_id,
             blocked_by_chat_id = excluded.blocked_by_chat_id,
             created_at = excluded.created_at`
        )
        .bind(
          record.telegramUserId,
          record.telegramChatId,
          record.blockedByChatId,
          record.now
        )
        .run();
    },

    async unblock(telegramUserId: number): Promise<void> {
      await db
        .prepare(
          `DELETE FROM blocked_users
           WHERE telegram_user_id = ?`
        )
        .bind(telegramUserId)
        .run();
    },
  };
}
