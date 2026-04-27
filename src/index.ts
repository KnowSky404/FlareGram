import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import type { Env } from "./types/env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const expectedPath = "/telegram/webhook/" + env.WEBHOOK_SECRET;
    const { pathname } = new URL(request.url);

    if (request.method !== "POST" || pathname !== expectedPath) {
      return new Response("Not Found", { status: 404 });
    }

    const bot = createBot(env);

    return webhookCallback(bot, "cloudflare-mod")(request);
  },
};
