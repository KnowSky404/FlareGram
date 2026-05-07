import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_BLOCKED_USER_MESSAGE,
  ADMIN_ROUTE_NOT_FOUND_MESSAGE,
  ADMIN_UNBLOCKED_USER_MESSAGE,
} from "../../src/lib/constants";
import { handleAdminReply } from "../../src/handlers/admin-reply";

describe("handleAdminReply", () => {
  it("routes admin reply back to linked user", async () => {
    const telegram = {
      copyReplyToUser: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const links = {
      findByAdminMessage: vi.fn().mockResolvedValue({
        user_telegram_id: 456,
        user_chat_id: 777,
      }),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };

    await handleAdminReply({
      adminChatId: 12345,
      message: {
        message_id: 10,
        chat: { id: 12345, type: "private" },
        reply_to_message: { message_id: 99 },
        text: "reply",
      } as never,
      telegram,
      links,
      blockedUsers,
      now: "2026-04-27T00:00:00.000Z",
    });

    expect(links.findByAdminMessage).toHaveBeenCalledWith(12345, 99);
    expect(telegram.copyReplyToUser).toHaveBeenCalledWith(
      777,
      expect.objectContaining({ message_id: 10 })
    );
    expect(blockedUsers.block).not.toHaveBeenCalled();
  });

  it("notifies admin when mapping is missing", async () => {
    const telegram = {
      copyReplyToUser: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const links = {
      findByAdminMessage: vi.fn().mockResolvedValue(null),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };

    await handleAdminReply({
      adminChatId: 12345,
      message: {
        message_id: 10,
        chat: { id: 12345, type: "private" },
        reply_to_message: { message_id: 99 },
        text: "reply",
      } as never,
      telegram,
      links,
      blockedUsers,
      now: "2026-04-27T00:00:00.000Z",
    });

    expect(telegram.sendText).toHaveBeenCalledWith(
      12345,
      ADMIN_ROUTE_NOT_FOUND_MESSAGE
    );
    expect(telegram.copyReplyToUser).not.toHaveBeenCalled();
  });

  it("blocks the linked user when admin replies with /block", async () => {
    const telegram = {
      copyReplyToUser: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const links = {
      findByAdminMessage: vi.fn().mockResolvedValue({
        user_telegram_id: 456,
        user_chat_id: 777,
      }),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };

    await handleAdminReply({
      adminChatId: 12345,
      message: {
        message_id: 11,
        chat: { id: 12345, type: "private" },
        reply_to_message: { message_id: 99 },
        text: "/block",
      } as never,
      telegram,
      links,
      blockedUsers,
      now: "2026-04-27T00:00:01.000Z",
    });

    expect(blockedUsers.block).toHaveBeenCalledWith({
      telegramUserId: 456,
      telegramChatId: 777,
      blockedByChatId: 12345,
      now: "2026-04-27T00:00:01.000Z",
    });
    expect(telegram.sendText).toHaveBeenCalledWith(
      12345,
      ADMIN_BLOCKED_USER_MESSAGE
    );
    expect(telegram.copyReplyToUser).not.toHaveBeenCalled();
  });

  it("unblocks the linked user when admin replies with /unblock", async () => {
    const telegram = {
      copyReplyToUser: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const links = {
      findByAdminMessage: vi.fn().mockResolvedValue({
        user_telegram_id: 456,
        user_chat_id: 777,
      }),
    };
    const blockedUsers = {
      block: vi.fn().mockResolvedValue(undefined),
      unblock: vi.fn().mockResolvedValue(undefined),
    };

    await handleAdminReply({
      adminChatId: 12345,
      message: {
        message_id: 12,
        chat: { id: 12345, type: "private" },
        reply_to_message: { message_id: 99 },
        text: "/unblock",
      } as never,
      telegram,
      links,
      blockedUsers,
      now: "2026-04-27T00:00:02.000Z",
    });

    expect(blockedUsers.unblock).toHaveBeenCalledWith(456);
    expect(telegram.sendText).toHaveBeenCalledWith(
      12345,
      ADMIN_UNBLOCKED_USER_MESSAGE
    );
    expect(telegram.copyReplyToUser).not.toHaveBeenCalled();
  });
});
