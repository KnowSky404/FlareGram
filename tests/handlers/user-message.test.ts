import { describe, expect, it, vi } from "vitest";
import { UNSUPPORTED_MESSAGE_NOTICE } from "../../src/lib/constants";
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

  it("copies sticker messages to admin and stores the route mapping", async () => {
    const telegram = {
      copyMessageToAdmin: vi.fn().mockResolvedValue({ message_id: 1001 }),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };

    await handleUserMessage({
      adminChatId: 12345,
      message: {
        message_id: 9,
        chat: { id: 778, type: "private" },
        from: { id: 457, is_bot: false, first_name: "Bob" },
        sticker: { file_id: "sticker-file-id", width: 512, height: 512, is_animated: false, is_video: false, type: "regular" },
      } as never,
      telegram,
      users,
      links,
      now: "2026-04-27T00:00:01.000Z",
    });

    expect(telegram.copyMessageToAdmin).toHaveBeenCalledWith(
      12345,
      expect.objectContaining({ message_id: 9 })
    );
    expect(telegram.sendText).not.toHaveBeenCalled();
    expect(links.insert).toHaveBeenCalledWith({
      adminChatId: 12345,
      adminMessageId: 1001,
      userChatId: 778,
      userMessageId: 9,
      createdAt: "2026-04-27T00:00:01.000Z",
    });
  });

  it("notifies the user when Telegram cannot copy the message", async () => {
    const telegram = {
      copyMessageToAdmin: vi.fn().mockRejectedValue(new Error("unsupported")),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };

    await handleUserMessage({
      adminChatId: 12345,
      message: {
        message_id: 10,
        chat: { id: 779, type: "private" },
        from: { id: 458, is_bot: false, first_name: "Carol" },
        invoice: { title: "Plan", description: "desc", start_parameter: "start", currency: "USD", total_amount: 100 },
      } as never,
      telegram,
      users,
      links,
      now: "2026-04-27T00:00:02.000Z",
    });

    expect(telegram.sendText).toHaveBeenCalledWith(779, UNSUPPORTED_MESSAGE_NOTICE);
    expect(users.upsert).not.toHaveBeenCalled();
    expect(links.insert).not.toHaveBeenCalled();
  });
});
