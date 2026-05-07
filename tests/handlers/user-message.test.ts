import { describe, expect, it, vi } from "vitest";
import { UNSUPPORTED_MESSAGE_NOTICE } from "../../src/lib/constants";
import { handleUserMessage } from "../../src/handlers/user-message";

describe("handleUserMessage", () => {
  it("copies a user message to admin and stores the route mapping", async () => {
    const telegram = {
      copyMessageToAdmin: vi.fn().mockResolvedValue({ message_id: 999 }),
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 998 }),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };
    const blockedUsers = { isBlocked: vi.fn().mockResolvedValue(false) };

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
      blockedUsers,
      now: "2026-04-27T00:00:00.000Z",
    });

    expect(blockedUsers.isBlocked).toHaveBeenCalledWith(456);
    expect(telegram.copyMessageToAdmin).not.toHaveBeenCalled();
    expect(telegram.sendTextToAdmin).toHaveBeenCalledWith(
      12345,
      "hello",
      expect.objectContaining({
        inline_keyboard: [[
          { text: "Reply", callback_data: "fg:r:456:777" },
          { text: "Info", callback_data: "fg:i:456:777" },
          { text: "Block", callback_data: "fg:b:456:777" },
          { text: "Unblock", callback_data: "fg:u:456:777" },
        ]],
      })
    );
    expect(users.upsert).toHaveBeenCalledWith({
      telegramUserId: 456,
      telegramChatId: 777,
      username: undefined,
      firstName: "Alice",
      lastName: undefined,
      now: "2026-04-27T00:00:00.000Z",
    });
    expect(links.insert).toHaveBeenCalledOnce();
    expect(links.insert).toHaveBeenCalledWith({
      adminChatId: 12345,
      adminMessageId: 998,
      userChatId: 777,
      userMessageId: 8,
      createdAt: "2026-04-27T00:00:00.000Z",
    });
  });

  it("copies sticker messages to admin and stores the route mapping", async () => {
    const telegram = {
      copyMessageToAdmin: vi.fn().mockResolvedValue({ message_id: 1001 }),
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 1000 }),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };
    const blockedUsers = { isBlocked: vi.fn().mockResolvedValue(false) };

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
      blockedUsers,
      now: "2026-04-27T00:00:01.000Z",
    });

    expect(telegram.copyMessageToAdmin).toHaveBeenCalledWith(
      12345,
      expect.objectContaining({ message_id: 9 }),
      expect.objectContaining({
        inline_keyboard: [[
          { text: "Reply", callback_data: "fg:r:457:778" },
          { text: "Info", callback_data: "fg:i:457:778" },
          { text: "Block", callback_data: "fg:b:457:778" },
          { text: "Unblock", callback_data: "fg:u:457:778" },
        ]],
      })
    );
    expect(telegram.sendText).not.toHaveBeenCalled();
    expect(links.insert).toHaveBeenCalledOnce();
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
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 1002 }),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };
    const blockedUsers = { isBlocked: vi.fn().mockResolvedValue(false) };

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
      blockedUsers,
      now: "2026-04-27T00:00:02.000Z",
    });

    expect(telegram.sendText).toHaveBeenCalledWith(779, UNSUPPORTED_MESSAGE_NOTICE);
    expect(users.upsert).toHaveBeenCalled();
    expect(links.insert).not.toHaveBeenCalled();
  });

  it("silently ignores blocked users", async () => {
    const telegram = {
      copyMessageToAdmin: vi.fn().mockResolvedValue({ message_id: 1003 }),
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 1002 }),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const users = { upsert: vi.fn().mockResolvedValue(undefined) };
    const links = { insert: vi.fn().mockResolvedValue(undefined) };
    const blockedUsers = { isBlocked: vi.fn().mockResolvedValue(true) };

    await handleUserMessage({
      adminChatId: 12345,
      message: {
        message_id: 11,
        chat: { id: 780, type: "private" },
        from: { id: 459, is_bot: false, first_name: "Dan" },
        text: "hello?",
      } as never,
      telegram,
      users,
      links,
      blockedUsers,
      now: "2026-04-27T00:00:03.000Z",
    });

    expect(blockedUsers.isBlocked).toHaveBeenCalledWith(459);
    expect(telegram.sendText).not.toHaveBeenCalled();
    expect(telegram.sendTextToAdmin).not.toHaveBeenCalled();
    expect(telegram.copyMessageToAdmin).not.toHaveBeenCalled();
    expect(users.upsert).not.toHaveBeenCalled();
    expect(links.insert).not.toHaveBeenCalled();
  });
});
