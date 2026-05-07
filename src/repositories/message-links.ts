export interface MessageLinkRecord {
  adminChatId: number;
  adminMessageId: number;
  userChatId: number;
  userMessageId: number;
  createdAt: string;
}

export function createMessageLinkRepository(db: D1Database) {
  return {
    async insert(record: MessageLinkRecord): Promise<void> {
      await db
        .prepare(
          `INSERT INTO message_links
            (admin_chat_id, admin_message_id, user_chat_id, user_message_id, direction, created_at)
           VALUES (?, ?, ?, ?, 'user_to_admin', ?)`
        )
        .bind(
          record.adminChatId,
          record.adminMessageId,
          record.userChatId,
          record.userMessageId,
          record.createdAt
        )
        .run();
    },

    async findByAdminMessage(adminChatId: number, adminMessageId: number) {
      return db
        .prepare(
          `SELECT
             message_links.admin_chat_id,
             message_links.admin_message_id,
             users.telegram_user_id AS user_telegram_id,
             message_links.user_chat_id,
             message_links.user_message_id,
             message_links.direction,
             message_links.created_at
           FROM message_links
           LEFT JOIN users ON users.telegram_chat_id = message_links.user_chat_id
           WHERE message_links.admin_chat_id = ? AND message_links.admin_message_id = ?`
        )
        .bind(adminChatId, adminMessageId)
        .first<{
          admin_chat_id: number;
          admin_message_id: number;
          user_telegram_id?: number;
          user_chat_id: number;
          user_message_id: number;
          direction: string;
          created_at: string;
        }>();
    },
  };
}
