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
          `SELECT admin_chat_id, admin_message_id, user_chat_id, user_message_id, direction, created_at
           FROM message_links
           WHERE admin_chat_id = ? AND admin_message_id = ?`
        )
        .bind(adminChatId, adminMessageId)
        .first<{
          admin_chat_id: number;
          admin_message_id: number;
          user_chat_id: number;
          user_message_id: number;
          direction: string;
          created_at: string;
        }>();
    },
  };
}
