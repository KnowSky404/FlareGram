import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import type { Env } from "./types/env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const expectedPath = `/telegram/webhook/${env.WEBHOOK_SECRET}`;

    if (request.method !== "POST" || url.pathname !== expectedPath) {
      return new Response("Not Found", { status: 404 });
    }

    const bot = await createBot(env);

    return webhookCallback(bot, "cloudflare-mod")(request);
  },
};
