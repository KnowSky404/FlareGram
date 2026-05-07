import type { CallbackQuery } from "grammy/types";
import {
  ADMIN_BLOCKED_USER_MESSAGE,
  ADMIN_REPLY_TARGET_SELECTED_MESSAGE,
  ADMIN_ROUTE_NOT_FOUND_MESSAGE,
  ADMIN_UNBLOCKED_USER_MESSAGE,
  USER_INFO_NOT_FOUND_MESSAGE,
} from "../lib/constants";
import type { UserRecord } from "../repositories/users";

interface Dependencies {
  adminChatId: number;
  callbackQuery: CallbackQuery;
  telegram: {
    sendTextToAdmin(adminChatId: number, text: string): Promise<{ message_id: number }>;
    answerCallback(
      callbackQueryId: string,
      text?: string,
      options?: { showAlert?: boolean }
    ): Promise<unknown>;
  };
  replyTargets: {
    set(input: {
      adminChatId: number;
      telegramUserId: number;
      userChatId: number;
      updatedAt: string;
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
  users: {
    findByTelegramUserId(telegramUserId: number): Promise<UserRecord | null>;
  };
  now: string;
}

function parseAction(data: string | undefined) {
  const match = data?.match(/^fg:([ribu]):(-?\d+):(-?\d+)$/);
  if (!match) {
    return null;
  }

  return {
    action: match[1],
    telegramUserId: Number(match[2]),
    telegramChatId: Number(match[3]),
  };
}

function formatUserInfo(user: UserRecord): string {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "-";
  const username = user.username ? `@${user.username}` : "-";

  return [
    `From: ${displayName}`,
    `Username: ${username}`,
    `User ID: ${user.telegramUserId}`,
    `Chat ID: ${user.telegramChatId}`,
  ].join("\n");
}

export async function handleAdminAction(deps: Dependencies): Promise<void> {
  const {
    adminChatId,
    callbackQuery,
    telegram,
    replyTargets,
    blockedUsers,
    users,
    now,
  } = deps;

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
    await replyTargets.set({
      adminChatId,
      telegramUserId: parsed.telegramUserId,
      userChatId: parsed.telegramChatId,
      updatedAt: now,
    });
    await telegram.answerCallback(callbackQuery.id, ADMIN_REPLY_TARGET_SELECTED_MESSAGE);
    return;
  }

  if (parsed.action === "i") {
    const user = await users.findByTelegramUserId(parsed.telegramUserId);
    await telegram.answerCallback(
      callbackQuery.id,
      user ? formatUserInfo(user) : USER_INFO_NOT_FOUND_MESSAGE,
      { showAlert: true }
    );
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
