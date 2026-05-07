import { describe, expect, it, vi } from "vitest";
import type { UserFromGetMe } from "grammy/types";
import { resolveBotInfo } from "../src/bot";

describe("resolveBotInfo", () => {
  it("returns configured bot info without calling init", async () => {
    const init = vi.fn().mockResolvedValue(undefined);
    const configuredBotInfo: UserFromGetMe = {
      id: 1,
      is_bot: true,
      first_name: "Configured Bot",
      username: "configured_bot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_manage_bots: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
    };

    const botInfo = await resolveBotInfo(
      {
        botInfo: undefined,
        init,
      },
      configuredBotInfo
    );

    expect(botInfo).toEqual(configuredBotInfo);
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes the bot when configured bot info is absent", async () => {
    const runtimeBotInfo: UserFromGetMe = {
      id: 2,
      is_bot: true,
      first_name: "Runtime Bot",
      username: "runtime_bot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_manage_bots: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
    };
    const bot = {
      botInfo: undefined as typeof runtimeBotInfo | undefined,
      init: vi.fn().mockImplementation(async () => {
        bot.botInfo = runtimeBotInfo;
      }),
    };

    const botInfo = await resolveBotInfo(bot);

    expect(bot.init).toHaveBeenCalledTimes(1);
    expect(botInfo).toEqual(runtimeBotInfo);
  });
});

describe("createBot", () => {
  it("registers message and callback query handlers", async () => {
    const handlers = new Map<string, unknown>();

    vi.resetModules();
    vi.doMock("grammy", () => ({
      Bot: vi.fn().mockImplementation(() => ({
        botInfo: {
          id: 3,
          is_bot: true,
          first_name: "Mock Bot",
          username: "mock_bot",
        },
        on: vi.fn((event: string, handler: unknown) => {
          handlers.set(event, handler);
        }),
      })),
    }));

    const { createBot: createMockedBot } = await import("../src/bot");

    await createMockedBot({
      BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "12345",
      WEBHOOK_SECRET: "secret",
      DB: {} as D1Database,
    });

    expect(handlers.has("message")).toBe(true);
    expect(handlers.has("callback_query:data")).toBe(true);

    vi.doUnmock("grammy");
  });
});
