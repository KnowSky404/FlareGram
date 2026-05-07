import type { Message } from "grammy/types";
import {
  ADMIN_BLOCKED_USER_MESSAGE,
  ADMIN_DELIVERY_FAILED_MESSAGE,
  ADMIN_ROUTE_NOT_FOUND_MESSAGE,
  ADMIN_UNBLOCKED_USER_MESSAGE,
} from "../lib/constants";

interface Dependencies {
  adminChatId: number;
  message: Message;
  telegram: {
    copyReplyToUser(userChatId: number, message: Message): Promise<unknown>;
    sendText(chatId: number, text: string): Promise<unknown>;
  };
  links: {
    findByAdminMessage(
      adminChatId: number,
      adminMessageId: number
    ): Promise<{ user_telegram_id?: number; user_chat_id: number } | null>;
  };
  replyTargets: {
    consume(
      adminChatId: number
    ): Promise<{ telegramUserId: number; userChatId: number } | null>;
  };
  blockedUsers: {
    block(input: {
      telegramUserId: number;
      telegramChatId: number;
      blockedByChatId: number;
      now: string;
    }): Promise<void>;
    unblock(telegramUserId: number): Promise<void>;
  };
  now: string;
}

export async function handleAdminReply(deps: Dependencies): Promise<void> {
  const { adminChatId, message, telegram, links, replyTargets, blockedUsers, now } = deps;

  if (message.chat.id !== adminChatId) {
    return;
  }

  const route = message.reply_to_message
    ? await links.findByAdminMessage(adminChatId, message.reply_to_message.message_id)
    : await replyTargets.consume(adminChatId).then((target) =>
        target
          ? {
              user_telegram_id: target.telegramUserId,
              user_chat_id: target.userChatId,
            }
          : null
      );

  if (!route) {
    if (message.reply_to_message) {
      await telegram.sendText(adminChatId, ADMIN_ROUTE_NOT_FOUND_MESSAGE);
    }
    return;
  }

  const command = message.text?.trim().split(/\s+/, 1)[0]?.toLowerCase();
  if (command === "/block") {
    if (route.user_telegram_id === undefined) {
      await telegram.sendText(adminChatId, ADMIN_ROUTE_NOT_FOUND_MESSAGE);
      return;
    }

    await blockedUsers.block({
      telegramUserId: route.user_telegram_id,
      telegramChatId: route.user_chat_id,
      blockedByChatId: adminChatId,
      now,
    });
    await telegram.sendText(adminChatId, ADMIN_BLOCKED_USER_MESSAGE);
    return;
  }

  if (command === "/unblock") {
    if (route.user_telegram_id === undefined) {
      await telegram.sendText(adminChatId, ADMIN_ROUTE_NOT_FOUND_MESSAGE);
      return;
    }

    await blockedUsers.unblock(route.user_telegram_id);
    await telegram.sendText(adminChatId, ADMIN_UNBLOCKED_USER_MESSAGE);
    return;
  }

  try {
    await telegram.copyReplyToUser(route.user_chat_id, message);
  } catch {
    await telegram.sendText(adminChatId, ADMIN_DELIVERY_FAILED_MESSAGE);
  }
}
