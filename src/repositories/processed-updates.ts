export function createProcessedUpdateRepository(db: D1Database) {
  return {
    async claim(updateId: number, now: string): Promise<boolean> {
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO processed_updates
            (update_id, created_at)
           VALUES (?, ?)`
        )
        .bind(updateId, now)
        .run();

      return result.meta.changes > 0;
    },
  };
}
