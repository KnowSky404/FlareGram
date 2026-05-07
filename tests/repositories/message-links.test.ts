import { describe, expect, it } from "vitest";
import { createMessageLinkRepository } from "../../src/repositories/message-links";
import { createUserRepository } from "../../src/repositories/users";
import { createStubD1Database } from "../helpers/fake-env";

describe("message link repository", () => {
  it("stores and resolves an admin message mapping", async () => {
    const { db } = createStubD1Database();
    const users = createUserRepository(db);
    const repo = createMessageLinkRepository(db);

    await users.upsert({
      telegramUserId: 900,
      telegramChatId: 300,
      firstName: "Alice",
      now: "2026-04-27T00:00:00.000Z",
    });

    await repo.insert({
      adminChatId: 1,
      adminMessageId: 200,
      userChatId: 300,
      userMessageId: 400,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    const result = await repo.findByAdminMessage(1, 200);

    expect(result?.user_chat_id).toBe(300);
    expect(result?.user_message_id).toBe(400);
    expect(result?.user_telegram_id).toBe(900);
  });
});
