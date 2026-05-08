import { describe, expect, it } from "vitest";
import { createProcessedUpdateRepository } from "../../src/repositories/processed-updates";
import { createStubD1Database } from "../helpers/fake-env";

describe("processed update repository", () => {
  it("claims an update only once", async () => {
    const { db } = createStubD1Database();
    const repo = createProcessedUpdateRepository(db);

    const firstClaim = await repo.claim(123, "2026-05-08T00:00:00.000Z");
    const secondClaim = await repo.claim(123, "2026-05-08T00:00:01.000Z");

    expect(firstClaim).toBe(true);
    expect(secondClaim).toBe(false);
  });
});
