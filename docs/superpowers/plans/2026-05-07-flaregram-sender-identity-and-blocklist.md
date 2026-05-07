# FlareGram Sender Identity and Blocklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show sender identity for relayed private messages and add reply-based `/block` and `/unblock` moderation.

**Architecture:** Keep Telegram workflow native by storing admin-side routing links for both identity context messages and copied user messages. Add a D1-backed blocklist repository and check it before relaying user messages.

**Tech Stack:** Cloudflare Workers, D1, grammY, TypeScript, Vitest.

---

### Task 1: User Message Identity and Block Check

**Files:**
- Modify: `tests/handlers/user-message.test.ts`
- Modify: `src/handlers/user-message.ts`

- [ ] Write tests for sender identity message and silent blocked-user ignore.
- [ ] Run `pnpm test tests/handlers/user-message.test.ts` and verify the new tests fail.
- [ ] Add `blockedUsers.isBlocked`, send identity text, and store links for identity and copied messages.
- [ ] Run `pnpm test tests/handlers/user-message.test.ts` and verify it passes.

### Task 2: Admin Block and Unblock Commands

**Files:**
- Modify: `tests/handlers/admin-reply.test.ts`
- Modify: `src/handlers/admin-reply.ts`
- Modify: `src/lib/constants.ts`

- [ ] Write tests for `/block`, `/unblock`, and missing mapping command handling.
- [ ] Run `pnpm test tests/handlers/admin-reply.test.ts` and verify the new tests fail.
- [ ] Detect command text before normal reply routing and call the blocklist repository.
- [ ] Run `pnpm test tests/handlers/admin-reply.test.ts` and verify it passes.

### Task 3: D1 Repository and Wiring

**Files:**
- Create: `src/repositories/blocked-users.ts`
- Modify: `tests/repositories/message-links.test.ts`
- Modify: `tests/helpers/fake-env.ts`
- Modify: `src/services/router.ts`
- Modify: `src/db/schema.sql`
- Modify: `src/db/migrations/0001_initial.sql`

- [ ] Add repository tests for block, unblock, and lookup.
- [ ] Run repository tests and verify failures.
- [ ] Implement the repository, stub D1 support, schema table, and router wiring.
- [ ] Run repository and handler tests.

### Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] Document sender identity and `/block`/`/unblock`.
- [ ] Run `pnpm test`.
- [ ] Run a sensitive-value scan over changed files before finalizing.
