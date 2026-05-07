import { Bot } from "grammy";
import type { Message } from "grammy/types";
import type { ForceReply, InlineKeyboardMarkup } from "grammy/types";

type TextReplyMarkup = InlineKeyboardMarkup | ForceReply;

export function createTelegramService(bot: Bot) {
  return {
    copyMessageToAdmin(
      adminChatId: number,
      message: Message,
      replyMarkup?: InlineKeyboardMarkup
    ) {
      return bot.api.copyMessage(adminChatId, message.chat.id, message.message_id, {
        reply_markup: replyMarkup,
      });
    },
    sendTextToAdmin(
      adminChatId: number,
      text: string,
      replyMarkup?: TextReplyMarkup
    ) {
      return bot.api.sendMessage(adminChatId, text, {
        reply_markup: replyMarkup,
      });
    },
    sendText(chatId: number, text: string) {
      return bot.api.sendMessage(chatId, text);
    },
    copyReplyToUser(userChatId: number, message: Message) {
      return bot.api.copyMessage(userChatId, message.chat.id, message.message_id);
    },
    answerCallback(callbackQueryId: string, text?: string) {
      return bot.api.answerCallbackQuery(callbackQueryId, text ? { text } : undefined);
    },
  };
}
