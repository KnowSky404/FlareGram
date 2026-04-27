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
