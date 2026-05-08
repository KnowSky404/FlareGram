function createD1Result<T>(results: T[] = []): D1Result<T> {
  return {
    success: true,
    results,
    meta: {
      duration: 0,
      size_after: 0,
      rows_read: 0,
      rows_written: 0,
      last_row_id: 0,
      changed_db: false,
      changes: 0,
    },
  };
}

function createExecResult(): D1ExecResult {
  return {
    count: 0,
    duration: 0,
  };
}

export function createStubD1Database() {
  const messageLinks = new Map<string, Record<string, number | string>>();
  const adminReplyTargets = new Map<number, Record<string, number | string>>();
  const usersByChatId = new Map<number, Record<string, number | string | null>>();
  const blockedUsers = new Map<number, Record<string, number | string>>();
  const processedUpdates = new Map<number, Record<string, number | string>>();

  function createRaw(query: string): D1PreparedStatement["raw"] {
    return (async <T = unknown[]>(options?: {
      columnNames?: boolean;
    }): Promise<T[] | [string[], ...T[]]> => {
      if (options?.columnNames) {
        throw new Error(`Unsupported raw query with column names: ${query}`);
      }

      throw new Error(`Unsupported raw query: ${query}`);
    }) as D1PreparedStatement["raw"];
  }

  function createStatement(query: string, values: unknown[] = []): D1PreparedStatement {
    return {
      bind(...nextValues: unknown[]) {
        return createStatement(query, nextValues);
      },
      async first<T = Record<string, unknown>>(_colName?: string): Promise<T | null> {
        if (query.includes("FROM message_links")) {
          const [adminChatId, adminMessageId] = values as [number, number];
          const link = messageLinks.get(`${adminChatId}:${adminMessageId}`);
          if (!link) return null;

          const user = usersByChatId.get(link.user_chat_id as number);
          return {
            ...link,
            user_telegram_id: user?.telegram_user_id,
          } as T;
        }

        if (query.includes("FROM blocked_users")) {
          const [telegramUserId] = values as [number];
          return (blockedUsers.get(telegramUserId) as T | null) ?? null;
        }

        if (query.includes("FROM admin_reply_targets")) {
          const [adminChatId] = values as [number];
          return (adminReplyTargets.get(adminChatId) as T | null) ?? null;
        }

        if (query.includes("FROM users")) {
          const [telegramUserId] = values as [number];
          for (const user of usersByChatId.values()) {
            if (user.telegram_user_id === telegramUserId) {
              return user as T;
            }
          }
          return null;
        }

        throw new Error(`Unsupported first query: ${query}`);
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        if (query.includes("INSERT INTO users")) {
          const [
            telegramUserId,
            telegramChatId,
            username,
            firstName,
            lastName,
            createdAt,
            updatedAt,
          ] = values as [
            number,
            number,
            string | null,
            string | null,
            string | null,
            string,
            string,
          ];
          const existing = usersByChatId.get(telegramChatId);
          usersByChatId.set(telegramChatId, {
            telegram_user_id: telegramUserId,
            telegram_chat_id: telegramChatId,
            username,
            first_name: firstName,
            last_name: lastName,
            created_at: existing?.created_at ?? createdAt,
            updated_at: updatedAt,
          });
          return createD1Result<T>();
        }

        if (query.includes("INSERT OR IGNORE INTO processed_updates")) {
          const [updateId, createdAt] = values as [number, string];
          if (processedUpdates.has(updateId)) {
            return createD1Result<T>();
          }

          processedUpdates.set(updateId, {
            update_id: updateId,
            created_at: createdAt,
          });
          const result = createD1Result<T>();
          return {
            ...result,
            meta: {
              ...result.meta,
              changes: 1,
            },
          };
        }

        if (query.includes("INSERT INTO message_links")) {
          const [adminChatId, adminMessageId, userChatId, userMessageId, createdAt] = values as [
            number,
            number,
            number,
            number,
            string,
          ];
          messageLinks.set(`${adminChatId}:${adminMessageId}`, {
            admin_chat_id: adminChatId,
            admin_message_id: adminMessageId,
            user_chat_id: userChatId,
            user_message_id: userMessageId,
            direction: "user_to_admin",
            created_at: createdAt,
          });
          return createD1Result<T>();
        }

        if (query.includes("INSERT INTO blocked_users")) {
          const [telegramUserId, telegramChatId, blockedByChatId, createdAt] = values as [
            number,
            number,
            number,
            string,
          ];
          blockedUsers.set(telegramUserId, {
            telegram_user_id: telegramUserId,
            telegram_chat_id: telegramChatId,
            blocked_by_chat_id: blockedByChatId,
            created_at: createdAt,
          });
          return createD1Result<T>();
        }

        if (query.includes("INSERT INTO admin_reply_targets")) {
          const [adminChatId, telegramUserId, userChatId, userMessageId, updatedAt] = values as [
            number,
            number,
            number,
            number,
            string,
          ];
          adminReplyTargets.set(adminChatId, {
            admin_chat_id: adminChatId,
            telegram_user_id: telegramUserId,
            user_chat_id: userChatId,
            user_message_id: userMessageId,
            updated_at: updatedAt,
          });
          return createD1Result<T>();
        }

        if (query.includes("DELETE FROM blocked_users")) {
          const [telegramUserId] = values as [number];
          blockedUsers.delete(telegramUserId);
          return createD1Result<T>();
        }

        if (query.includes("DELETE FROM admin_reply_targets")) {
          const [adminChatId] = values as [number];
          adminReplyTargets.delete(adminChatId);
          return createD1Result<T>();
        }

        throw new Error(`Unsupported run query: ${query}`);
      },
      async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        throw new Error(`Unsupported all query: ${query}`);
      },
      raw: createRaw(query),
    };
  }

  const db: D1Database = {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch<T = unknown>(_statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      throw new Error("Unsupported batch");
    },
    async exec(_query: string): Promise<D1ExecResult> {
      return createExecResult();
    },
    withSession(_constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint): D1DatabaseSession {
      return {
        prepare(query: string) {
          return createStatement(query);
        },
        async batch<T = unknown>(_statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
          throw new Error("Unsupported session batch");
        },
        getBookmark() {
          return null;
        },
      };
    },
    async dump(): Promise<ArrayBuffer> {
      throw new Error("Unsupported dump");
    },
  };

  return {
    rawState: {
      messageLinks,
      adminReplyTargets,
      usersByChatId,
      blockedUsers,
      processedUpdates,
    },
    db,
  };
}
