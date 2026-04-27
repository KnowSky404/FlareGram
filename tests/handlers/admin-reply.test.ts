import { describe, expect, it, vi } from "vitest";
import { ADMIN_ROUTE_NOT_FOUND_MESSAGE } from "../../src/lib/constants";
import { handleAdminReply } from "../../src/handlers/admin-reply";

describe("handleAdminReply", () => {
  it("routes admin reply back to linked user", async () => {
    const telegram = {
      copyReplyToUser: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const links = {
      findByAdminMessage: vi.fn().mockResolvedValue({
        user_chat_id: 777,
      }),
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
    });

    expect(links.findByAdminMessage).toHaveBeenCalledWith(12345, 99);
    expect(telegram.copyReplyToUser).toHaveBeenCalledWith(
      777,
      expect.objectContaining({ message_id: 10 })
    );
  });

  it("notifies admin when mapping is missing", async () => {
    const telegram = {
      copyReplyToUser: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
    };

    const links = {
      findByAdminMessage: vi.fn().mockResolvedValue(null),
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
    });

    expect(telegram.sendText).toHaveBeenCalledWith(
      12345,
      ADMIN_ROUTE_NOT_FOUND_MESSAGE
    );
    expect(telegram.copyReplyToUser).not.toHaveBeenCalled();
  });
});
