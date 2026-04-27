import type { Message } from "grammy/types";
import { UNSUPPORTED_MESSAGE_NOTICE } from "../lib/constants";

interface Dependencies {
  adminChatId: number;
  message: Message;
  telegram: {
    copyMessageToAdmin(
      adminChatId: number,
      message: Message
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
  now: string;
}

export async function handleUserMessage(deps: Dependencies): Promise<void> {
  const { adminChatId, message, telegram, users, links, now } = deps;

  let copied: { message_id: number };
  try {
    copied = await telegram.copyMessageToAdmin(adminChatId, message);
  } catch {
    await telegram.sendText(message.chat.id, UNSUPPORTED_MESSAGE_NOTICE);
    return;
  }

  await users.upsert({
    telegramUserId: message.from!.id,
    telegramChatId: message.chat.id,
    username: message.from?.username,
    firstName: message.from?.first_name,
    lastName: message.from?.last_name,
    now,
  });

  await links.insert({
    adminChatId,
    adminMessageId: copied.message_id,
    userChatId: message.chat.id,
    userMessageId: message.message_id,
    createdAt: now,
  });
}
