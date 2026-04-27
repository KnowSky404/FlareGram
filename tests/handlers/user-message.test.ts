import { describe, expect, it, vi } from "vitest";
import { handleUserMessage } from "../../src/handlers/user-message";

describe("handleUserMessage", () => {
  it("copies a user message to admin and stores the route mapping", async () => {
    const telegram = {
      copyMessageToAdmin: vi.fn().mockResolvedValue({ message_id: 999 }),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };

    await handleUserMessage({
      adminChatId: 12345,
      message: {
        message_id: 8,
        chat: { id: 777, type: "private" },
        from: { id: 456, is_bot: false, first_name: "Alice" },
        text: "hello",
      } as never,
      telegram,
      users,
      links,
      now: "2026-04-27T00:00:00.000Z",
    });

    expect(telegram.copyMessageToAdmin).toHaveBeenCalledWith(
      12345,
      expect.objectContaining({ message_id: 8 })
    );
    expect(users.upsert).toHaveBeenCalledWith({
      telegramUserId: 456,
      telegramChatId: 777,
      username: undefined,
      firstName: "Alice",
      lastName: undefined,
      now: "2026-04-27T00:00:00.000Z",
    });
    expect(links.insert).toHaveBeenCalledWith({
      adminChatId: 12345,
      adminMessageId: 999,
      userChatId: 777,
      userMessageId: 8,
      createdAt: "2026-04-27T00:00:00.000Z",
    });
  });
});
