import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import { configureProject } from "../scripts/configure.js";

const execFileAsync = promisify(execFile);

async function createTempProject() {
  return mkdtemp(join(tmpdir(), "flaregram-configure-"));
}

describe("configureProject", () => {
  test("requires deployment and runtime values", async () => {
    const root = await createTempProject();
    const envFile = join(root, "worker-secrets.env");
    await writeFile(envFile, "WORKER_NAME=flaregram\n");

    await expect(configureProject({ root, envFile })).rejects.toThrow(
      "Missing required values: MAIN, COMPATIBILITY_DATE, D1_DATABASE_NAME, D1_DATABASE_ID, ADMIN_CHAT_ID, BOT_TOKEN, WEBHOOK_SECRET",
    );
  });

  test("generates local Wrangler config and runtime secret files from one env file", async () => {
    const root = await createTempProject();
    const envFile = join(root, "worker-secrets.env");
    await writeFile(
      envFile,
      [
        "WORKER_NAME=flaregram",
        "MAIN=src/index.ts",
        "COMPATIBILITY_DATE=2026-04-27",
        "CUSTOM_DOMAIN=flaregram.example.com",
        "D1_DATABASE_NAME=flaregram",
        "D1_DATABASE_ID=11111111-2222-3333-4444-555555555555",
        "ADMIN_CHAT_ID=123456789",
        "BOT_TOKEN=123456:telegram-token",
        "WEBHOOK_SECRET=local-webhook-secret",
        "BOT_INFO=",
        "",
      ].join("\n"),
    );

    await configureProject({ root, envFile });

    const wranglerConfig = JSON.parse(await readFile(join(root, "wrangler.jsonc"), "utf8"));
    expect(wranglerConfig).toEqual({
      name: "flaregram",
      main: "src/index.ts",
      compatibility_date: "2026-04-27",
      routes: [{ pattern: "flaregram.example.com", custom_domain: true }],
      d1_databases: [
        {
          binding: "DB",
          database_name: "flaregram",
          database_id: "11111111-2222-3333-4444-555555555555",
        },
      ],
      vars: {
        ADMIN_CHAT_ID: "123456789",
      },
    });

    expect(await readFile(join(root, ".dev.vars"), "utf8")).toBe(
      "BOT_TOKEN=123456:telegram-token\nWEBHOOK_SECRET=local-webhook-secret\n",
    );
  });

  test("omits custom domain route and preserves optional BOT_INFO when provided", async () => {
    const root = await createTempProject();
    const envFile = join(root, "worker-secrets.env");
    await writeFile(
      envFile,
      [
        "WORKER_NAME=flaregram",
        "MAIN=src/index.ts",
        "COMPATIBILITY_DATE=2026-04-27",
        "CUSTOM_DOMAIN=",
        "D1_DATABASE_NAME=flaregram",
        "D1_DATABASE_ID=11111111-2222-3333-4444-555555555555",
        "ADMIN_CHAT_ID=123456789",
        "BOT_TOKEN=123456:telegram-token",
        "WEBHOOK_SECRET=local-webhook-secret",
        "BOT_INFO={\"id\":1,\"is_bot\":true,\"first_name\":\"FlareGram\",\"username\":\"flaregram_bot\"}",
        "",
      ].join("\n"),
    );

    await configureProject({ root, envFile });

    const wranglerConfig = JSON.parse(await readFile(join(root, "wrangler.jsonc"), "utf8"));
    expect(wranglerConfig).not.toHaveProperty("routes");
    expect(await readFile(join(root, ".dev.vars"), "utf8")).toContain(
      'BOT_INFO={"id":1,"is_bot":true,"first_name":"FlareGram","username":"flaregram_bot"}',
    );
  });

  test("accepts CLI root and env file options", async () => {
    const root = await createTempProject();
    const envFile = join(root, "custom.env");
    await writeFile(
      envFile,
      [
        "WORKER_NAME=flaregram",
        "MAIN=src/index.ts",
        "COMPATIBILITY_DATE=2026-04-27",
        "D1_DATABASE_NAME=flaregram",
        "D1_DATABASE_ID=11111111-2222-3333-4444-555555555555",
        "ADMIN_CHAT_ID=123456789",
        "BOT_TOKEN=123456:telegram-token",
        "WEBHOOK_SECRET=local-webhook-secret",
        "",
      ].join("\n"),
    );

    await execFileAsync("node", ["scripts/configure.js", "--root", root, "--env-file", envFile]);

    const wranglerConfig = JSON.parse(await readFile(join(root, "wrangler.jsonc"), "utf8"));
    expect(wranglerConfig.name).toBe("flaregram");
    expect(await readFile(join(root, ".dev.vars"), "utf8")).toContain("WEBHOOK_SECRET=");
  });
});
