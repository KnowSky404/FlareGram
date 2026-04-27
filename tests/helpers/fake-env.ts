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
          return (messageLinks.get(`${adminChatId}:${adminMessageId}`) as T | null) ?? null;
        }

        throw new Error(`Unsupported first query: ${query}`);
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
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
    rawState: { messageLinks },
    db,
  };
}
