# Repository Instructions

Before committing any change, every modified, deleted, renamed, or newly added file must be checked for private or sensitive information. This includes code, documentation, tests, examples, generated config, and lockfiles.

Sensitive information includes, but is not limited to:

- API tokens, bot tokens, access tokens, refresh tokens, session cookies, and bearer tokens
- Webhook secrets, signing secrets, passwords, private keys, and credential files
- Real production domains, account IDs, database IDs, chat IDs, user IDs, or other deployment identifiers when they are not intended to be public
- Local environment files such as `.env`, `.dev.vars`, `worker-secrets.env`, and generated `wrangler.jsonc`
- Any API token-like value or secret-bearing key name such as `API_TOKEN`, `APITOKEN`, `BOT_TOKEN`, `WEBHOOK_SECRET`, `SECRET`, `PASSWORD`, `PRIVATE_KEY`, `ACCESS_TOKEN`, or `REFRESH_TOKEN`

Required workflow:

1. Inspect all unstaged and staged changes before committing.
2. Inspect the staged diff immediately before committing.
3. Run a sensitive-value scan against every file included in the commit.
4. Confirm generated or local-only files are ignored by Git.
5. If any real private value is found, remove it from the commit before continuing.
6. Only commit after the privacy check passes.
7. Make atomic commits: one coherent purpose per commit, with unrelated changes left unstaged.
