import type { Message } from "grammy/types";
import {
  ADMIN_DELIVERY_FAILED_MESSAGE,
  ADMIN_ROUTE_NOT_FOUND_MESSAGE,
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
    ): Promise<{ user_chat_id: number } | null>;
  };
}

export async function handleAdminReply(deps: Dependencies): Promise<void> {
  const { adminChatId, message, telegram, links } = deps;

  if (message.chat.id !== adminChatId || !message.reply_to_message) {
    return;
  }

  const route = await links.findByAdminMessage(
    adminChatId,
    message.reply_to_message.message_id
  );

  if (!route) {
    await telegram.sendText(adminChatId, ADMIN_ROUTE_NOT_FOUND_MESSAGE);
    return;
  }

  try {
    await telegram.copyReplyToUser(route.user_chat_id, message);
  } catch {
    await telegram.sendText(adminChatId, ADMIN_DELIVERY_FAILED_MESSAGE);
  }
}
