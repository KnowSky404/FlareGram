import type { Message } from "grammy/types";
import type { InlineKeyboardMarkup } from "grammy/types";
import { UNSUPPORTED_MESSAGE_NOTICE } from "../lib/constants";

interface Dependencies {
  adminChatId: number;
  message: Message;
  telegram: {
    copyMessageToAdmin(
      adminChatId: number,
      message: Message,
      replyMarkup?: InlineKeyboardMarkup
    ): Promise<{ message_id: number }>;
    sendTextToAdmin(
      adminChatId: number,
      text: string,
      replyMarkup?: InlineKeyboardMarkup
    ): Promise<{ message_id: number }>;
    sendText(chatId: number, text: string): Promise<unknown>;
  };
  users: {
    upsert(input: {
      telegramUserId: number;
      telegramChatId: number;
      username?: string;
      firstName?: string;
      lastName?: string;
      now: string;
    }): Promise<void>;
  };
  links: {
    insert(input: {
      adminChatId: number;
      adminMessageId: number;
      userChatId: number;
      userMessageId: number;
      createdAt: string;
    }): Promise<void>;
  };
  blockedUsers: {
    isBlocked(telegramUserId: number): Promise<boolean>;
  };
  now: string;
}

function createAdminActionKeyboard(
  telegramUserId: number,
  telegramChatId: number,
  userMessageId: number
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: "Reply", callback_data: `fg:r:${telegramUserId}:${telegramChatId}:${userMessageId}` },
      { text: "Info", callback_data: `fg:i:${telegramUserId}:${telegramChatId}` },
      { text: "Block", callback_data: `fg:b:${telegramUserId}:${telegramChatId}` },
      { text: "Unblock", callback_data: `fg:u:${telegramUserId}:${telegramChatId}` },
    ]],
  };
}

export async function handleUserMessage(deps: Dependencies): Promise<void> {
  const { adminChatId, message, telegram, users, links, blockedUsers, now } = deps;

  if (!message.from || await blockedUsers.isBlocked(message.from.id)) {
    return;
  }

  await users.upsert({
    telegramUserId: message.from.id,
    telegramChatId: message.chat.id,
    username: message.from.username,
    firstName: message.from.first_name,
    lastName: message.from.last_name,
    now,
  });

  const keyboard = createAdminActionKeyboard(
    message.from.id,
    message.chat.id,
    message.message_id
  );

  if (message.text) {
    const sent = await telegram.sendTextToAdmin(
      adminChatId,
      message.text,
      keyboard
    );

    await links.insert({
      adminChatId,
      adminMessageId: sent.message_id,
      userChatId: message.chat.id,
      userMessageId: message.message_id,
      createdAt: now,
    });
    return;
  }

  let copied: { message_id: number };
  try {
    copied = await telegram.copyMessageToAdmin(
      adminChatId,
      message,
      keyboard
    );
  } catch {
    await telegram.sendText(message.chat.id, UNSUPPORTED_MESSAGE_NOTICE);
    return;
  }

  await links.insert({
    adminChatId,
    adminMessageId: copied.message_id,
    userChatId: message.chat.id,
    userMessageId: message.message_id,
    createdAt: now,
  });
}
