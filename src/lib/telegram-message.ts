import type { Message } from "grammy/types";

export function isSupportedMessage(message: Message): boolean {
  return !!(
    message.text ||
    message.photo ||
    message.document ||
    message.voice ||
    message.video
  );
}

export function extractReplyText(message: Message): string | undefined {
  return message.text ?? message.caption;
}
