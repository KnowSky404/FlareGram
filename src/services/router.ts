import type { Context } from "grammy";
import { handleAdminAction } from "../handlers/admin-action";
import { handleAdminReply } from "../handlers/admin-reply";
import { handleUserMessage } from "../handlers/user-message";
import { createMessageLinkRepository } from "../repositories/message-links";
import { createBlockedUserRepository } from "../repositories/blocked-users";
import { createUserRepository } from "../repositories/users";
import { createTelegramService } from "./telegram";
import type { Env } from "../types/env";

export function createRouter(env: Env, bot: { api: unknown }) {
  const adminChatId = Number(env.ADMIN_CHAT_ID);
  const telegram = createTelegramService(bot as never);
  const users = createUserRepository(env.DB);
  const links = createMessageLinkRepository(env.DB);
  const blockedUsers = createBlockedUserRepository(env.DB);

  return {
    async route(ctx: Context) {
      const callbackQuery = ctx.callbackQuery;
      if (callbackQuery) {
        await handleAdminAction({
          adminChatId,
          callbackQuery,
          telegram,
          links,
          blockedUsers,
          now: new Date().toISOString(),
        });
        return;
      }

      const message = ctx.message;
      if (!message) return;

      const now = new Date().toISOString();

      if (message.chat.id === adminChatId) {
        await handleAdminReply({
          adminChatId,
          message,
          telegram,
          links,
          blockedUsers,
          now,
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
          blockedUsers,
          now,
        });
      }
    },
  };
}
