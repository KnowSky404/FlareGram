import { describe, expect, it } from "vitest";
import { createBlockedUserRepository } from "../../src/repositories/blocked-users";
import { createStubD1Database } from "../helpers/fake-env";

describe("blocked user repository", () => {
  it("blocks, detects, and unblocks a user", async () => {
    const { db } = createStubD1Database();
    const repo = createBlockedUserRepository(db);

    expect(await repo.isBlocked(456)).toBe(false);

    await repo.block({
      telegramUserId: 456,
      telegramChatId: 777,
      blockedByChatId: 12345,
      now: "2026-05-07T00:00:00.000Z",
    });

    expect(await repo.isBlocked(456)).toBe(true);

    await repo.unblock(456);

    expect(await repo.isBlocked(456)).toBe(false);
  });
});
