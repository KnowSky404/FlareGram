export interface AdminReplyTargetRecord {
  adminChatId: number;
  telegramUserId: number;
  userChatId: number;
  userMessageId: number;
  updatedAt: string;
}

export function createAdminReplyTargetRepository(db: D1Database) {
  return {
    async set(record: AdminReplyTargetRecord): Promise<void> {
      await db
        .prepare(
          `INSERT INTO admin_reply_targets
            (admin_chat_id, telegram_user_id, user_chat_id, user_message_id, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(admin_chat_id) DO UPDATE SET
             telegram_user_id = excluded.telegram_user_id,
             user_chat_id = excluded.user_chat_id,
             user_message_id = excluded.user_message_id,
             updated_at = excluded.updated_at`
        )
        .bind(
          record.adminChatId,
          record.telegramUserId,
          record.userChatId,
          record.userMessageId,
          record.updatedAt
        )
        .run();
    },

    async consume(adminChatId: number): Promise<AdminReplyTargetRecord | null> {
      const target = await db
        .prepare(
          `SELECT admin_chat_id, telegram_user_id, user_chat_id, user_message_id, updated_at
           FROM admin_reply_targets
           WHERE admin_chat_id = ?`
        )
        .bind(adminChatId)
        .first<{
          admin_chat_id: number;
          telegram_user_id: number;
          user_chat_id: number;
          user_message_id: number;
          updated_at: string;
        }>();

      if (!target) {
        return null;
      }

      await db
        .prepare(
          `DELETE FROM admin_reply_targets
           WHERE admin_chat_id = ?`
        )
        .bind(adminChatId)
        .run();

      return {
        adminChatId: target.admin_chat_id,
        telegramUserId: target.telegram_user_id,
        userChatId: target.user_chat_id,
        userMessageId: target.user_message_id,
        updatedAt: target.updated_at,
      };
    },
  };
}
