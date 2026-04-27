import { Bot } from "grammy";
import { createRouter } from "./services/router";
import type { Env } from "./types/env";

export function createBot(env: Env) {
  const bot = new Bot(env.BOT_TOKEN, {
    botInfo: JSON.parse(env.BOT_INFO),
  });
  const router = createRouter(env, bot);

  bot.on("message", async (ctx) => {
    await router.route(ctx);
  });

  return bot;
}
