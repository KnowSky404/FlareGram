import { Bot } from "grammy";
import type { Message } from "grammy/types";

export function createTelegramService(bot: Bot) {
  return {
    copyMessageToAdmin(adminChatId: number, message: Message) {
      return bot.api.copyMessage(adminChatId, message.chat.id, message.message_id);
    },
    sendText(chatId: number, text: string) {
      return bot.api.sendMessage(chatId, text);
    },
    copyReplyToUser(userChatId: number, message: Message) {
      return bot.api.copyMessage(userChatId, message.chat.id, message.message_id);
    },
  };
}
