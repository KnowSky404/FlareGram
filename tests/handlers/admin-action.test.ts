import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_BLOCKED_USER_MESSAGE,
  ADMIN_REPLY_TARGET_SELECTED_MESSAGE,
  ADMIN_ROUTE_NOT_FOUND_MESSAGE,
  ADMIN_UNBLOCKED_USER_MESSAGE,
  USER_INFO_NOT_FOUND_MESSAGE,
} from "../../src/lib/constants";
import { handleAdminAction } from "../../src/handlers/admin-action";

describe("handleAdminAction", () => {
  it("selects a reply target from a reply button callback", async () => {
    const telegram = {
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 500 }),
      answerCallback: vi.fn().mockResolvedValue(undefined),
    };
    const replyTargets = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };
    const users = {
      findByTelegramUserId: vi.fn().mockResolvedValue(null),
    };

    await handleAdminAction({
      adminChatId: 12345,
      callbackQuery: {
        id: "callback-1",
        from: { id: 12345, is_bot: false, first_name: "Admin" },
        data: "fg:r:456:777:8",
        message: { message_id: 999, chat: { id: 12345, type: "private" } },
      } as never,
      telegram,
      replyTargets,
      blockedUsers,
      users,
      now: "2026-05-07T00:00:00.000Z",
    });

    expect(replyTargets.set).toHaveBeenCalledWith({
      adminChatId: 12345,
      telegramUserId: 456,
      userChatId: 777,
      userMessageId: 8,
      updatedAt: "2026-05-07T00:00:00.000Z",
    });
    expect(telegram.sendTextToAdmin).not.toHaveBeenCalled();
    expect(telegram.answerCallback).toHaveBeenCalledWith(
      "callback-1",
      ADMIN_REPLY_TARGET_SELECTED_MESSAGE
    );
  });

  it("blocks the linked user from a button callback", async () => {
    const telegram = {
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 500 }),
      answerCallback: vi.fn().mockResolvedValue(undefined),
    };
    const replyTargets = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };
    const users = {
      findByTelegramUserId: vi.fn().mockResolvedValue(null),
    };

    await handleAdminAction({
      adminChatId: 12345,
      callbackQuery: {
        id: "callback-2",
        from: { id: 12345, is_bot: false, first_name: "Admin" },
        data: "fg:b:456:777",
        message: { message_id: 999, chat: { id: 12345, type: "private" } },
      } as never,
      telegram,
      replyTargets,
      blockedUsers,
      users,
      now: "2026-05-07T00:00:01.000Z",
    });

    expect(blockedUsers.block).toHaveBeenCalledWith({
      telegramUserId: 456,
      telegramChatId: 777,
      blockedByChatId: 12345,
      now: "2026-05-07T00:00:01.000Z",
    });
    expect(telegram.answerCallback).toHaveBeenCalledWith(
      "callback-2",
      ADMIN_BLOCKED_USER_MESSAGE
    );
    expect(telegram.sendTextToAdmin).not.toHaveBeenCalled();
  });

  it("unblocks the linked user from a button callback", async () => {
    const telegram = {
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 500 }),
      answerCallback: vi.fn().mockResolvedValue(undefined),
    };
    const replyTargets = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };
    const users = {
      findByTelegramUserId: vi.fn().mockResolvedValue(null),
    };

    await handleAdminAction({
      adminChatId: 12345,
      callbackQuery: {
        id: "callback-3",
        from: { id: 12345, is_bot: false, first_name: "Admin" },
        data: "fg:u:456:777",
        message: { message_id: 999, chat: { id: 12345, type: "private" } },
      } as never,
      telegram,
      replyTargets,
      blockedUsers,
      users,
      now: "2026-05-07T00:00:02.000Z",
    });

    expect(blockedUsers.unblock).toHaveBeenCalledWith(456);
    expect(telegram.answerCallback).toHaveBeenCalledWith(
      "callback-3",
      ADMIN_UNBLOCKED_USER_MESSAGE
    );
  });

  it("answers with sender info from an info button callback", async () => {
    const telegram = {
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 500 }),
      answerCallback: vi.fn().mockResolvedValue(undefined),
    };
    const replyTargets = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };
    const users = {
      findByTelegramUserId: vi.fn().mockResolvedValue({
        telegramUserId: 456,
        telegramChatId: 777,
        username: "alice",
        firstName: "Alice",
        lastName: "Smith",
      }),
    };

    await handleAdminAction({
      adminChatId: 12345,
      callbackQuery: {
        id: "callback-info",
        from: { id: 12345, is_bot: false, first_name: "Admin" },
        data: "fg:i:456:777",
        message: { message_id: 999, chat: { id: 12345, type: "private" } },
      } as never,
      telegram,
      replyTargets,
      blockedUsers,
      users,
      now: "2026-05-07T00:00:02.500Z",
    });

    expect(users.findByTelegramUserId).toHaveBeenCalledWith(456);
    expect(telegram.answerCallback).toHaveBeenCalledWith(
      "callback-info",
      [
        "From: Alice Smith",
        "Username: @alice",
        "User ID: 456",
        "Chat ID: 777",
      ].join("\n"),
      { showAlert: true }
    );
    expect(telegram.sendTextToAdmin).not.toHaveBeenCalled();
  });

  it("answers with not-found when info user is missing", async () => {
    const telegram = {
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 500 }),
      answerCallback: vi.fn().mockResolvedValue(undefined),
    };
    const replyTargets = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };
    const users = {
      findByTelegramUserId: vi.fn().mockResolvedValue(null),
    };

    await handleAdminAction({
      adminChatId: 12345,
      callbackQuery: {
        id: "callback-info-missing",
        from: { id: 12345, is_bot: false, first_name: "Admin" },
        data: "fg:i:456:777",
        message: { message_id: 999, chat: { id: 12345, type: "private" } },
      } as never,
      telegram,
      replyTargets,
      blockedUsers,
      users,
      now: "2026-05-07T00:00:02.750Z",
    });

    expect(telegram.answerCallback).toHaveBeenCalledWith(
      "callback-info-missing",
      USER_INFO_NOT_FOUND_MESSAGE,
      { showAlert: true }
    );
  });

  it("answers with route-not-found when callback data is invalid", async () => {
    const telegram = {
      sendTextToAdmin: vi.fn().mockResolvedValue({ message_id: 500 }),
      answerCallback: vi.fn().mockResolvedValue(undefined),
    };
    const replyTargets = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };
    const users = {
      findByTelegramUserId: vi.fn().mockResolvedValue(null),
    };

    await handleAdminAction({
      adminChatId: 12345,
      callbackQuery: {
        id: "callback-4",
        from: { id: 12345, is_bot: false, first_name: "Admin" },
        data: "fg:b:bad:777",
        message: { message_id: 999, chat: { id: 12345, type: "private" } },
      } as never,
      telegram,
      replyTargets,
      blockedUsers,
      users,
      now: "2026-05-07T00:00:03.000Z",
    });

    expect(telegram.answerCallback).toHaveBeenCalledWith(
      "callback-4",
      ADMIN_ROUTE_NOT_FOUND_MESSAGE
    );
    expect(blockedUsers.block).not.toHaveBeenCalled();
  });
});
