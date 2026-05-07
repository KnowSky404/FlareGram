import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_KEYS = [
  "WORKER_NAME",
  "MAIN",
  "COMPATIBILITY_DATE",
  "D1_DATABASE_NAME",
  "D1_DATABASE_ID",
  "ADMIN_CHAT_ID",
  "BOT_TOKEN",
  "WEBHOOK_SECRET",
];

function parseEnv(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function getRequired(values, key) {
  const value = values[key];
  if (!value) {
    throw new Error(`Missing required value: ${key}`);
  }
  return value;
}

function assertRequiredValues(values) {
  const missing = REQUIRED_KEYS.filter((key) => !values[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required values: ${missing.join(", ")}`);
  }
}

function renderDevVars(values) {
  const lines = [
    `BOT_TOKEN=${getRequired(values, "BOT_TOKEN")}`,
    `WEBHOOK_SECRET=${getRequired(values, "WEBHOOK_SECRET")}`,
  ];

  if (values.BOT_INFO) {
    lines.push(`BOT_INFO=${values.BOT_INFO}`);
  }

  return `${lines.join("\n")}\n`;
}

function createWranglerConfig(values) {
  const config = {
    name: getRequired(values, "WORKER_NAME"),
    main: getRequired(values, "MAIN"),
    compatibility_date: getRequired(values, "COMPATIBILITY_DATE"),
  };

  if (values.CUSTOM_DOMAIN) {
    config.routes = [
      {
        pattern: values.CUSTOM_DOMAIN,
        custom_domain: true,
      },
    ];
  }

  config.d1_databases = [
    {
      binding: "DB",
      database_name: getRequired(values, "D1_DATABASE_NAME"),
      database_id: getRequired(values, "D1_DATABASE_ID"),
    },
  ];
  config.vars = {
    ADMIN_CHAT_ID: getRequired(values, "ADMIN_CHAT_ID"),
  };

  return config;
}

export async function configureProject(options = {}) {
  const root = options.root ?? process.cwd();
  const envFile = options.envFile ?? resolve(root, "worker-secrets.env");
  const values = parseEnv(await readFile(envFile, "utf8"));
  assertRequiredValues(values);

  const wranglerConfig = `${JSON.stringify(createWranglerConfig(values), null, 2)}\n`;
  await writeFile(resolve(root, "wrangler.jsonc"), wranglerConfig);
  await writeFile(resolve(root, ".dev.vars"), renderDevVars(values));
}

function parseCliOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env-file") {
      options.envFile = argv[index + 1];
      index += 1;
    } else if (arg === "--root") {
      options.root = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFilePath) {
  configureProject(parseCliOptions(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
