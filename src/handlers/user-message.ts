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
    sendTextToAdmin(
      adminChatId: number,
      text: string
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

function formatSenderIdentity(message: Message): string {
  const from = message.from;
  const displayName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || "-";
  const username = from?.username ? `@${from.username}` : "-";

  return [
    `From: ${displayName}`,
    `Username: ${username}`,
    `User ID: ${from?.id ?? "-"}`,
    `Chat ID: ${message.chat.id}`,
    "",
    "Reply here with /block or /unblock.",
  ].join("\n");
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

  const identity = await telegram.sendTextToAdmin(
    adminChatId,
    formatSenderIdentity(message)
  );

  await links.insert({
    adminChatId,
    adminMessageId: identity.message_id,
    userChatId: message.chat.id,
    userMessageId: message.message_id,
    createdAt: now,
  });

  let copied: { message_id: number };
  try {
    copied = await telegram.copyMessageToAdmin(adminChatId, message);
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
