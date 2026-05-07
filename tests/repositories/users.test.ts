import { describe, expect, it } from "vitest";
import { createUserRepository } from "../../src/repositories/users";
import { createStubD1Database } from "../helpers/fake-env";

describe("user repository", () => {
  it("finds a stored user by Telegram user id", async () => {
    const { db } = createStubD1Database();
    const repo = createUserRepository(db);

    await repo.upsert({
      telegramUserId: 456,
      telegramChatId: 777,
      username: "alice",
      firstName: "Alice",
      lastName: "Smith",
      now: "2026-05-07T00:00:00.000Z",
    });

    const user = await repo.findByTelegramUserId(456);

    expect(user).toEqual({
      telegramUserId: 456,
      telegramChatId: 777,
      username: "alice",
      firstName: "Alice",
      lastName: "Smith",
    });
  });
});
