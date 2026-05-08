import { describe, expect, it, vi } from "vitest";
import { createRouter } from "../../src/services/router";
import { createStubD1Database } from "../helpers/fake-env";

describe("router", () => {
  it("ignores a duplicate Telegram update id", async () => {
    const { db } = createStubD1Database();
    const bot = {
      api: {
        sendMessage: vi.fn().mockResolvedValue({ message_id: 998 }),
        copyMessage: vi.fn().mockResolvedValue({ message_id: 999 }),
      },
    };
    const router = createRouter(
      {
        BOT_TOKEN: "token",
        ADMIN_CHAT_ID: "12345",
        WEBHOOK_SECRET: "secret",
        DB: db,
      },
      bot
    );
    const ctx = {
      update: { update_id: 7001 },
      message: {
        message_id: 8,
        chat: { id: 777, type: "private" },
        from: { id: 456, is_bot: false, first_name: "Alice" },
        text: "hello",
      },
    };

    await router.route(ctx as never);
    await router.route(ctx as never);

    expect(bot.api.sendMessage).toHaveBeenCalledTimes(1);
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      12345,
      "hello",
      expect.any(Object)
    );
  });
});
