# FlareGram Admin Action Buttons Design

## Overview

FlareGram will reduce repeated admin-side context messages by adding inline action buttons to the copied user message. The existing reply-by-message flow remains available as a fallback.

## Confirmed Behavior

- Copied user messages in the admin chat include `Reply`, `Block`, and `Unblock` buttons.
- Button callback data carries the target Telegram user ID and chat ID.
- `Block` immediately writes the target user to the shared blocklist.
- `Unblock` immediately removes the target user from the shared blocklist.
- `Reply` sends one prompt message to the admin. The admin replies to that prompt to deliver a response to the user.
- Callback queries are always answered so Telegram clients do not stay in a loading state.

## Notes

Telegram Bot API cannot force the client to open a native reply composer for an arbitrary message. The `Reply` button therefore creates a bot-owned prompt message that is mapped to the user and can be replied to safely.
