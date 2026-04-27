type RunResult = { success: true };

export function createStubD1Database() {
  const messageLinks = new Map<string, Record<string, number | string>>();

  return {
    rawState: { messageLinks },
    db: {
      prepare(query: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async run(): Promise<RunResult> {
                if (query.includes("INSERT INTO message_links")) {
                  const [adminChatId, adminMessageId, userChatId, userMessageId, createdAt] =
                    values as [number, number, number, number, string];
                  messageLinks.set(`${adminChatId}:${adminMessageId}`, {
                    admin_chat_id: adminChatId,
                    admin_message_id: adminMessageId,
                    user_chat_id: userChatId,
                    user_message_id: userMessageId,
                    direction: "user_to_admin",
                    created_at: createdAt,
                  });
                  return { success: true };
                }

                throw new Error(`Unsupported run query: ${query}`);
              },
              async first<T>() {
                if (query.includes("FROM message_links")) {
                  const [adminChatId, adminMessageId] = values as [number, number];
                  return (messageLinks.get(`${adminChatId}:${adminMessageId}`) as T | null) ?? null;
                }

                throw new Error(`Unsupported first query: ${query}`);
              },
            };
          },
        };
      },
    } satisfies D1Database,
  };
}
