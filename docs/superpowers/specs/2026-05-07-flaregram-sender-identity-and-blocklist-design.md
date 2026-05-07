# FlareGram Sender Identity and Blocklist Design

## Overview

FlareGram will show the administrator who sent each relayed private message and will support a shared blocklist. The operator workflow stays inside Telegram: reply to a user's relayed context with `/block` or `/unblock`.

## Confirmed Behavior

- Each user message that reaches the administrator is preceded by a sender identity message.
- The identity message includes display name, username when available, Telegram user ID, and chat ID.
- Both the identity message and copied user message are linked to the same user so admin replies can target either message.
- Admin `/block` and `/unblock` commands only work when replying to a linked identity or copied user message.
- Blocked users are silently ignored when they send more private messages.
- `/unblock` removes the user from the shared blocklist and allows future relays again.

## Data Model

Add `blocked_users`:

- `telegram_user_id` INTEGER PRIMARY KEY
- `telegram_chat_id` INTEGER NOT NULL
- `blocked_by_chat_id` INTEGER NOT NULL
- `created_at` TEXT NOT NULL

The existing `users` table remains the latest identity store. The existing `message_links` table remains the admin-message-to-user routing table.

## Components

- `handleUserMessage`: check the blocklist first, upsert user identity, send identity context, copy the message, and store both admin-side message IDs.
- `handleAdminReply`: detect `/block` and `/unblock` commands before normal reply routing.
- `blocked-users` repository: encapsulate D1 operations for block, unblock, and lookup.
- Telegram service: continue wrapping `sendMessage` and `copyMessage`.

## Testing

Add handler tests for identity context, silent ignored blocked users, block command, unblock command, and normal reply behavior. Add repository tests for blocklist persistence.
