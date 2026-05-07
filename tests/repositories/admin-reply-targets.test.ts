import { describe, expect, it } from "vitest";
import { createAdminReplyTargetRepository } from "../../src/repositories/admin-reply-targets";
import { createStubD1Database } from "../helpers/fake-env";

describe("admin reply target repository", () => {
  it("stores and consumes the selected reply target", async () => {
    const { db } = createStubD1Database();
    const repo = createAdminReplyTargetRepository(db);

    await repo.set({
      adminChatId: 1,
      telegramUserId: 900,
      userChatId: 300,
      updatedAt: "2026-05-07T00:00:00.000Z",
    });

    const target = await repo.consume(1);
    const consumedAgain = await repo.consume(1);

    expect(target).toEqual({
      adminChatId: 1,
      telegramUserId: 900,
      userChatId: 300,
      updatedAt: "2026-05-07T00:00:00.000Z",
    });
    expect(consumedAgain).toBeNull();
  });

  it("replaces an existing selected reply target for the same admin", async () => {
    const { db } = createStubD1Database();
    const repo = createAdminReplyTargetRepository(db);

    await repo.set({
      adminChatId: 1,
      telegramUserId: 900,
      userChatId: 300,
      updatedAt: "2026-05-07T00:00:00.000Z",
    });
    await repo.set({
      adminChatId: 1,
      telegramUserId: 901,
      userChatId: 301,
      updatedAt: "2026-05-07T00:00:01.000Z",
    });

    const target = await repo.consume(1);

    expect(target).toEqual({
      adminChatId: 1,
      telegramUserId: 901,
      userChatId: 301,
      updatedAt: "2026-05-07T00:00:01.000Z",
    });
  });
});
