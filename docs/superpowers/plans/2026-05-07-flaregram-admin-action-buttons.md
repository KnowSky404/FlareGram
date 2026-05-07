# FlareGram Admin Action Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-side inline buttons for reply, block, and unblock actions on relayed user messages.

**Architecture:** Attach Telegram inline keyboard markup when copying a user message to the admin chat. Handle `callback_query:data` updates through a dedicated admin action handler, using callback payload IDs to target the user directly.

**Tech Stack:** Cloudflare Workers, grammY, TypeScript, Vitest.

---

### Task 1: Button Markup on Copied Messages

**Files:**
- Modify: `tests/handlers/user-message.test.ts`
- Modify: `src/handlers/user-message.ts`
- Modify: `src/services/telegram.ts`

- [ ] Add tests expecting `Reply`, `Block`, and `Unblock` inline buttons.
- [ ] Run handler tests and verify failures.
- [ ] Pass `reply_markup` to `copyMessage`.
- [ ] Run handler tests and verify they pass.

### Task 2: Callback Action Handler

**Files:**
- Create: `tests/handlers/admin-action.test.ts`
- Create: `src/handlers/admin-action.ts`
- Modify: `src/services/router.ts`
- Modify: `src/bot.ts`

- [ ] Add tests for reply prompt, block, unblock, and invalid callback data.
- [ ] Run tests and verify failures.
- [ ] Implement `handleAdminAction` and route `callback_query:data`.
- [ ] Run handler tests and verify they pass.

### Task 3: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] Document the button workflow.
- [ ] Run `pnpm exec tsc --noEmit`.
- [ ] Run `pnpm test`.
- [ ] Scan changed files for sensitive values.
