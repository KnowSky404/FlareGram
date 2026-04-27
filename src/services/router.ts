import type { Context } from "grammy";
import { handleAdminReply } from "../handlers/admin-reply";
import { handleUserMessage } from "../handlers/user-message";
import { createMessageLinkRepository } from "../repositories/message-links";
import { createUserRepository } from "../repositories/users";
import { createTelegramService } from "./telegram";
import type { Env } from "../types/env";

export function createRouter(env: Env, bot: { api: unknown }) {
  const adminChatId = Number(env.ADMIN_CHAT_ID);
  const telegram = createTelegramService(
    bot as Parameters<typeof createTelegramService>[0]
  );
  const users = createUserRepository(env.DB);
  const links = createMessageLinkRepository(env.DB);

  return {
    async route(ctx: Context) {
      const message = ctx.message;
      if (!message) return;

      const now = new Date().toISOString();

      if (message.chat.id === adminChatId) {
        await handleAdminReply({
          adminChatId,
          message,
          telegram,
          links,
        });
        return;
      }

      if (message.chat.type === "private") {
        await handleUserMessage({
          adminChatId,
          message,
          telegram,
          users,
          links,
          now,
        });
      }
    },
  };
}
