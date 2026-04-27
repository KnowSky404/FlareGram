# FlareGram Minimal Telegram Relay Design

## Overview

FlareGram is a minimal Telegram customer-service relay bot built on Cloudflare. The bot accepts private messages from end users, forwards them to a single administrator account, and routes the administrator's replies back to the original user.

The design goal is to keep the system as small as possible while still following production-oriented best practices:

- Use Telegram webhooks instead of polling.
- Use Cloudflare-native services only.
- Keep the runtime stateless and push critical routing state into a durable store.
- Avoid optional infrastructure until the product needs it.

This document defines the MVP architecture for:

- One Telegram bot
- One administrator account
- Two-way private message relay
- No separate admin dashboard
- No multi-agent routing

## Goals

- Relay user private messages to a single administrator in Telegram.
- Let the administrator reply in Telegram by replying to the forwarded bot message.
- Route replies back to the correct end user reliably.
- Stay within a simple Cloudflare-native deployment model.
- Keep the implementation small enough for a first production release.

## Non-Goals

- Multi-administrator support
- Session assignment or locking
- Queue-based async processing
- Separate web admin panel
- AI-generated replies
- Analytics, reporting, or CRM workflows
- Long-term media archival outside Telegram

## Recommended Stack

- Runtime: Cloudflare Workers
- Language: TypeScript
- Telegram framework: grammY
- Database: Cloudflare D1
- Secrets/configuration: Workers Secrets and environment bindings
- Deployment: Wrangler

## Why This Stack

### Cloudflare Workers

Workers fit the Telegram webhook model directly. The request path is short, execution is stateless, and deployment is operationally simple.

### grammY

grammY provides a clean Telegram bot abstraction and supports Cloudflare Workers webhook handling. It reduces Telegram-specific boilerplate without introducing unnecessary platform complexity.

### D1

The core business requirement is reply routing accuracy. When the administrator replies to a forwarded message, the system must resolve that reply back to the original user immediately and reliably. D1 is the smallest Cloudflare-native storage option that gives a durable relational lookup model for this mapping.

### Why Not KV

Workers KV is a poor fit for the routing table because the application depends on immediate read-after-write behavior for message mapping. KV is better reserved for cache-like or configuration-like data.

### Why Not Durable Objects

Durable Objects would be justified if the product needed strongly coordinated live session ownership, multi-admin concurrency, or richer real-time state. The MVP does not need those features.

### Why Not Queues

The core webhook path is short and synchronous. Introducing queues would increase operational complexity without solving a real MVP problem.

## System Architecture

### High-Level Flow

1. A Telegram user sends a private message to the bot.
2. Telegram delivers the update to the Cloudflare Worker webhook endpoint.
3. The Worker forwards the message to the administrator chat.
4. The Worker writes a message-link record into D1.
5. The administrator replies to the forwarded message in Telegram.
6. Telegram sends that reply update to the Worker.
7. The Worker resolves the referenced forwarded message in D1.
8. The Worker sends the administrator's reply back to the original user.

### Components

#### Webhook Entry

Responsibilities:

- Accept Telegram webhook requests
- Reject invalid routes
- Enforce a secret-bearing webhook path
- Hand the request into the bot handler

#### Bot Handler

Responsibilities:

- Parse Telegram updates through grammY
- Distinguish end-user traffic from administrator traffic
- Route supported message types to the correct service path

#### Routing Service

Responsibilities:

- Forward user messages to the administrator
- Resolve admin reply targets
- Enforce single-admin authorization

#### Telegram Gateway

Responsibilities:

- Wrap outbound Telegram API operations
- Normalize send/forward/copy behavior
- Centralize Telegram API error handling

#### Repositories

Responsibilities:

- Encapsulate D1 queries
- Keep SQL out of message-handling logic
- Provide stable data access interfaces for users and message links

## Message Routing Model

### User to Admin

When an end user sends a private message to the bot:

1. The Worker confirms the message is not from the administrator.
2. The bot forwards or copies the message into the administrator chat.
3. The Worker stores a message link in D1:
   - original user chat ID
   - original user message ID
   - administrator chat ID
   - forwarded administrator-side message ID
   - timestamp

The stored administrator-side message ID is the critical routing key for the return path.

### Admin to User

When the administrator replies:

1. The Worker verifies the update came from the configured administrator chat.
2. The Worker verifies the admin message is a reply to a prior forwarded bot message.
3. The Worker reads `reply_to_message.message_id`.
4. The Worker looks up that message ID in D1.
5. If found, the Worker sends the administrator's reply content to the mapped user chat.
6. If not found, the Worker returns a safe error response in the admin chat explaining that the target user could not be resolved.

This reply-by-reference pattern avoids ambiguous routing and keeps the operator workflow native to Telegram.

## Data Model

The MVP uses two tables.

### `users`

Purpose:

- Store the latest known identity metadata for end users
- Support future moderation, search, and operator context

Fields:

- `telegram_user_id` INTEGER PRIMARY KEY
- `telegram_chat_id` INTEGER NOT NULL UNIQUE
- `username` TEXT NULL
- `first_name` TEXT NULL
- `last_name` TEXT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `message_links`

Purpose:

- Map each administrator-visible forwarded message back to the original user message
- Support reply routing

Fields:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `admin_chat_id` INTEGER NOT NULL
- `admin_message_id` INTEGER NOT NULL
- `user_chat_id` INTEGER NOT NULL
- `user_message_id` INTEGER NOT NULL
- `direction` TEXT NOT NULL DEFAULT 'user_to_admin'
- `created_at` TEXT NOT NULL

Constraints and indexes:

- Unique index on `(admin_chat_id, admin_message_id)`
- Index on `(user_chat_id, created_at)`

## Supported Message Types For MVP

The first release should support:

- text
- photo
- document
- voice
- video

The preferred handling model is to use Telegram-native forwarding or copying where possible so media transport remains simple and reliable.

The first release should not attempt to normalize every Telegram message subtype. Unsupported message types should produce a short operator-facing or user-facing notice instead of partial silent failure.

## Configuration

Required bindings and secrets:

- `BOT_TOKEN`: Telegram bot token
- `BOT_INFO`: Serialized Telegram bot metadata used by grammY in Workers
- `ADMIN_CHAT_ID`: The single authorized administrator chat ID
- `WEBHOOK_SECRET`: Random secret used in the webhook path
- `DB`: D1 binding

Recommended webhook shape:

- `POST /telegram/webhook/<WEBHOOK_SECRET>`

This avoids exposing a predictable public endpoint and keeps request filtering simple.

## Security Model

### Inbound Security

- Use a secret-bearing webhook path
- Accept only the configured webhook route
- Treat all non-admin reply attempts as unauthorized for return-path routing

### Secret Handling

- Store the bot token and webhook secret in Workers Secrets
- Never hardcode tokens in source files or Wrangler config

### Data Minimization

- Store only the data required for reply routing and minimal operator context
- Do not persist full message payloads in D1 unless future requirements justify it

## Error Handling

### User-to-Admin Forward Failure

If Telegram forwarding fails:

- Return a non-200 application result only if the request cannot be processed safely
- Log the failure with enough context to debug
- Do not write a message-link row if the admin-side message was not created

### Admin Reply Routing Failure

If the administrator replies to a message with no route mapping:

- Notify the administrator that the reply target could not be resolved
- Do not send anything to the user

If sending the reply back to the user fails:

- Notify the administrator that delivery failed
- Preserve the original mapping row for later inspection

### Unsupported Update Types

- Ignore irrelevant updates safely
- Return a successful HTTP response to Telegram once the update has been handled or intentionally ignored

## Operational Model

### Deployment

- One Worker service
- One D1 database
- One Telegram webhook registration

### Logging

The MVP should log:

- inbound update classification
- outbound Telegram API failures
- D1 lookup failures
- unauthorized admin-path attempts

Logs should avoid leaking secrets and should not dump full message bodies by default.

### Retention

The MVP may retain message-link records for a fixed time window such as 30 to 90 days. Cleanup can be added later by cron if storage growth becomes relevant. Retention automation is intentionally out of MVP scope.

## Suggested Project Structure

```text
src/
  index.ts
  bot.ts
  handlers/
    user-message.ts
    admin-reply.ts
  services/
    router.ts
    telegram.ts
  repositories/
    users.ts
    message-links.ts
  db/
    schema.sql
  types/
    env.ts
wrangler.jsonc
```

## Testing Strategy

The first implementation should cover:

- repository tests for message-link insert and lookup
- handler tests for user-message forwarding flow
- handler tests for admin-reply routing flow
- unauthorized admin message rejection
- missing mapping behavior

End-to-end Telegram verification can stay manual in the MVP:

1. user sends a private message
2. admin receives forwarded message
3. admin replies
4. user receives the reply

## Implementation Sequence

1. Create the Worker project scaffold
2. Configure Wrangler and D1 binding
3. Add D1 schema and migration
4. Build Telegram webhook entry
5. Add grammY bot initialization
6. Implement user-to-admin forwarding
7. Implement admin-reply lookup and return routing
8. Add error handling and logging
9. Register Telegram webhook and verify manually

## Future Expansion Path

This design intentionally leaves room for later growth without forcing early complexity:

- multi-admin routing can extend the schema with session ownership
- rule-based auto replies can be added inside the Worker
- a small admin UI can be added later with Pages or another frontend
- higher coordination needs can migrate specific workflows to Durable Objects

## Final Recommendation

For FlareGram's first release, the correct architecture is:

`Cloudflare Workers + grammY + D1 + Telegram Webhook`

It is the smallest design that remains operationally sound, keeps the reply-routing logic durable, and stays fully inside the Cloudflare platform.
