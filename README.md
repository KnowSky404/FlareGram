# FlareGram

FlareGram is a minimal Telegram bi-directional private-message relay bot built on Cloudflare Workers.

## Stack

- Cloudflare Workers
- grammY
- Cloudflare D1
- Wrangler

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a D1 database and update `wrangler.jsonc` with the real `database_id`.

3. Set secrets:

```bash
wrangler secret put BOT_TOKEN
wrangler secret put BOT_INFO
wrangler secret put WEBHOOK_SECRET
```

4. Set `ADMIN_CHAT_ID` in `wrangler.jsonc`.

5. Apply the database schema:

```bash
pnpm run db:migrate:remote
```

6. Deploy:

```bash
pnpm run deploy
```

7. Register the Telegram webhook to:

```text
https://<your-worker-domain>/telegram/webhook/<WEBHOOK_SECRET>
```

## Test

```bash
pnpm test
```
