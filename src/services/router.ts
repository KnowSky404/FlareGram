import type { Context } from "grammy";
import { handleAdminAction } from "../handlers/admin-action";
import { handleAdminReply } from "../handlers/admin-reply";
import { handleUserMessage } from "../handlers/user-message";
import { createMessageLinkRepository } from "../repositories/message-links";
import { createAdminReplyTargetRepository } from "../repositories/admin-reply-targets";
import { createBlockedUserRepository } from "../repositories/blocked-users";
import { createProcessedUpdateRepository } from "../repositories/processed-updates";
import { createUserRepository } from "../repositories/users";
import { createTelegramService } from "./telegram";
import type { Env } from "../types/env";

export function createRouter(env: Env, bot: { api: unknown }) {
  const adminChatId = Number(env.ADMIN_CHAT_ID);
  const telegram = createTelegramService(bot as never);
  const users = createUserRepository(env.DB);
  const links = createMessageLinkRepository(env.DB);
  const replyTargets = createAdminReplyTargetRepository(env.DB);
  const blockedUsers = createBlockedUserRepository(env.DB);
  const processedUpdates = createProcessedUpdateRepository(env.DB);

  return {
    async route(ctx: Context) {
      const now = new Date().toISOString();
      const isNewUpdate = await processedUpdates.claim(ctx.update.update_id, now);
      if (!isNewUpdate) {
        return;
      }

      const callbackQuery = ctx.callbackQuery;
      if (callbackQuery) {
        await handleAdminAction({
          adminChatId,
          callbackQuery,
          telegram,
          replyTargets,
          blockedUsers,
          users,
          now,
        });
        return;
      }

      const message = ctx.message;
      if (!message) return;

      if (message.chat.id === adminChatId) {
        await handleAdminReply({
          adminChatId,
          message,
          telegram,
          links,
          replyTargets,
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
