import { Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { createRouter } from "./services/router";
import type { Env } from "./types/env";

const botInfoCache = new Map<string, UserFromGetMe>();

interface BotInfoResolver {
  botInfo?: UserFromGetMe;
  init(): Promise<void>;
}

function parseConfiguredBotInfo(env: Env): UserFromGetMe | undefined {
  if (!env.BOT_INFO) {
    return undefined;
  }

  return JSON.parse(env.BOT_INFO) as UserFromGetMe;
}

export async function resolveBotInfo(
  bot: BotInfoResolver,
  configuredBotInfo?: UserFromGetMe
): Promise<UserFromGetMe> {
  if (configuredBotInfo) {
    return configuredBotInfo;
  }

  if (bot.botInfo) {
    return bot.botInfo;
  }

  await bot.init();

  if (!bot.botInfo) {
    throw new Error("Failed to initialize Telegram bot info.");
  }

  return bot.botInfo;
}

export async function createBot(env: Env) {
  const configuredBotInfo = botInfoCache.get(env.BOT_TOKEN) ?? parseConfiguredBotInfo(env);
  const bot = new Bot(env.BOT_TOKEN, {
    botInfo: configuredBotInfo,
  });
  const botInfo = await resolveBotInfo(bot, configuredBotInfo);
  botInfoCache.set(env.BOT_TOKEN, botInfo);
  const router = createRouter(env, bot);

  bot.on("message", async (ctx) => {
    await router.route(ctx);
  });

  return bot;
}
