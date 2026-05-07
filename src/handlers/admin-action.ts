import type { CallbackQuery, ForceReply } from "grammy/types";
import {
  ADMIN_BLOCKED_USER_MESSAGE,
  ADMIN_REPLY_PROMPT_MESSAGE,
  ADMIN_ROUTE_NOT_FOUND_MESSAGE,
  ADMIN_UNBLOCKED_USER_MESSAGE,
} from "../lib/constants";

interface Dependencies {
  adminChatId: number;
  callbackQuery: CallbackQuery;
  telegram: {
    sendTextToAdmin(
      adminChatId: number,
      text: string,
      replyMarkup?: ForceReply
    ): Promise<{ message_id: number }>;
    answerCallback(callbackQueryId: string, text?: string): Promise<unknown>;
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

function parseAction(data: string | undefined) {
  const match = data?.match(/^fg:([rbu]):(-?\d+):(-?\d+)$/);
  if (!match) {
    return null;
  }

  return {
    action: match[1],
    telegramUserId: Number(match[2]),
    telegramChatId: Number(match[3]),
  };
}

export async function handleAdminAction(deps: Dependencies): Promise<void> {
  const { adminChatId, callbackQuery, telegram, links, blockedUsers, now } = deps;

  if (callbackQuery.from.id !== adminChatId) {
    await telegram.answerCallback(callbackQuery.id);
    return;
  }

  const parsed = parseAction(callbackQuery.data);
  if (!parsed) {
    await telegram.answerCallback(callbackQuery.id, ADMIN_ROUTE_NOT_FOUND_MESSAGE);
    return;
  }

  if (parsed.action === "r") {
    const prompt = await telegram.sendTextToAdmin(adminChatId, ADMIN_REPLY_PROMPT_MESSAGE, {
      force_reply: true,
    });
    await links.insert({
      adminChatId,
      adminMessageId: prompt.message_id,
      userChatId: parsed.telegramChatId,
      userMessageId: 0,
      createdAt: now,
    });
    await telegram.answerCallback(callbackQuery.id, "Reply prompt created.");
    return;
  }

  if (parsed.action === "b") {
    await blockedUsers.block({
      telegramUserId: parsed.telegramUserId,
      telegramChatId: parsed.telegramChatId,
      blockedByChatId: adminChatId,
      now,
    });
    await telegram.answerCallback(callbackQuery.id, ADMIN_BLOCKED_USER_MESSAGE);
    return;
  }

  await blockedUsers.unblock(parsed.telegramUserId);
  await telegram.answerCallback(callbackQuery.id, ADMIN_UNBLOCKED_USER_MESSAGE);
}
