# FlareGram

FlareGram 是一个基于 `Cloudflare Workers + grammY + D1` 的 Telegram 双向私信中转机器人。

当前版本支持：

- 用户私聊机器人
- 机器人将消息转发给单个管理员
- 管理员收到文本消息时，会在同一条消息里看到发送方身份信息和正文
- 管理员在 Telegram 中直接回复该转发消息
- 机器人将管理员回复回传给原用户
- 管理员可通过消息按钮执行 `Reply` / `Block` / `Unblock`
- 管理员也可回复用户消息或身份提示发送 `/block` / `/unblock` 管理通用黑名单

## 技术栈

- Cloudflare Workers
- Cloudflare D1
- Wrangler
- grammY
- TypeScript
- Vitest

## 本地要求

- Node.js `20+`
- `pnpm`
- Cloudflare 账号
- 一个已通过 `@BotFather` 创建的 Telegram Bot

## 配置文件约定

仓库只提交 example 文件，不提交真实部署值：

- `worker-secrets.env.example`：所有需要手动填写的变量模板
- `wrangler.jsonc.example`：生成后的 Wrangler 配置示例

本地真实文件不会提交到 Git：

- `worker-secrets.env`：唯一需要你手动填写的本地配置文件
- `wrangler.jsonc`：由 `pnpm run configure` 生成，供 Wrangler 使用
- `.dev.vars`：由 `pnpm run configure` 生成，供 Wrangler 本地开发读取 secrets

## 一次性初始化

### 1. 安装依赖

```bash
pnpm install
```

### 2. 登录 Cloudflare

```bash
pnpm wrangler login
```

### 3. 创建统一配置文件

项目里所有需要手动填写的部署配置、运行时变量和本地 secrets 都集中在一个本地文件里：

```bash
cp worker-secrets.env.example worker-secrets.env
```

然后编辑 `worker-secrets.env`。这个文件不会提交到 Git。

最少需要填写：

- `CUSTOM_DOMAIN`：可选。使用自定义域名时填完整域名，例如 `flaregram.example.com`；不用时留空
- `D1_DATABASE_ID`：创建 D1 后得到的 database id
- `ADMIN_CHAT_ID`：接收用户私信转发的管理员 Telegram chat id
- `BOT_TOKEN`：BotFather 给你的 Telegram bot token
- `WEBHOOK_SECRET`：高强度随机字符串，会作为 webhook URL 路径的一部分

### 4. 创建 D1 数据库

```bash
pnpm wrangler d1 create flaregram
```

执行后会返回一段类似下面的信息：

```text
[[d1_databases]]
binding = "DB"
database_name = "flaregram"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

把返回的 `database_id` 填到 `worker-secrets.env` 的 `D1_DATABASE_ID`。

如果你修改了 `D1_DATABASE_NAME`，创建 D1 时也要使用同一个名字。

### 5. 获取管理员 Chat ID

你需要知道“接收所有私信转发的管理员账号”的 `chat_id`。

最简单的方式：

1. 先在 Telegram 里给机器人发一条消息
2. 临时调用 Telegram API 查看 update

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/getUpdates"
```

在返回 JSON 里找到管理员账号对应的：

- `message.from.id`
- 或 `message.chat.id`

然后把它填到 `worker-secrets.env` 的 `ADMIN_CHAT_ID`。

### 6. 填写 Bot Token 和 Webhook Secret

在 `worker-secrets.env` 里填写：

- `BOT_TOKEN`：直接填 BotFather 给你的 token
- `WEBHOOK_SECRET`：填一个高强度随机字符串，例如 `<生成的随机字符串>`
- `CUSTOM_DOMAIN`：可选。使用自定义域名时填写完整域名；不用时留空

说明：

- `BOT_INFO` 不再需要手工配置，通常留空即可
- Worker 会在首次请求时基于 `BOT_TOKEN` 自动调用 Telegram `getMe` 获取 bot 信息
- 如果你之前已经配置过 `BOT_INFO`，当前版本仍会兼容读取，但新部署可以不再设置

### 7. 生成本地配置

```bash
pnpm run configure
```

这个命令会基于 `worker-secrets.env` 生成两个不会提交到 Git 的本地文件：

- `wrangler.jsonc`：Wrangler 部署配置，包含真实域名、D1 ID 和 `ADMIN_CHAT_ID`
- `.dev.vars`：Wrangler 本地开发 secrets，包含 `BOT_TOKEN`、`WEBHOOK_SECRET` 和可选 `BOT_INFO`

如果你修改了 `worker-secrets.env`，重新运行一次 `pnpm run configure`。

### 8. 上传生产 Secrets

部署到 Cloudflare 前，把生产 secrets 写入 Cloudflare。这里需要手动粘贴 `worker-secrets.env` 里的对应值：

```bash
pnpm wrangler secret put BOT_TOKEN
pnpm wrangler secret put WEBHOOK_SECRET
```

`.dev.vars` 只用于本地开发，不会自动上传到 Cloudflare。

## 数据库初始化

先把表结构应用到远端 D1：

```bash
pnpm run db:migrate:remote
```

如果你只想先本地验证 D1 SQL，也可以用：

```bash
pnpm run db:migrate:local
```

## 部署

部署前确认已经完成：

1. `worker-secrets.env` 已填好
2. 已运行 `pnpm run configure`
3. 已运行 `pnpm wrangler secret put BOT_TOKEN`
4. 已运行 `pnpm wrangler secret put WEBHOOK_SECRET`
5. 已运行 `pnpm run db:migrate:remote`

```bash
pnpm run deploy
```

默认情况下，部署完成后你会拿到 Worker 地址，通常类似：

```text
https://flaregram.<your-subdomain>.workers.dev
```

如果你要直接绑定 Cloudflare 托管的自定义域名，把域名填到 `worker-secrets.env` 的 `CUSTOM_DOMAIN`，然后重新运行 `pnpm run configure`。

说明：

- `custom_domain: true` 适用于“这个子域名的所有流量都直接交给 Worker 处理”
- 当域名所在 Zone 已托管在 Cloudflare 时，Cloudflare 会自动为 Custom Domain 管理 DNS 记录和证书
- 如果你之后仍使用 `wrangler deploy`，不要只在 Cloudflare Dashboard 里修改路由；下次部署时本地生成的 `wrangler.jsonc` 会覆盖 Dashboard 中的路由配置

## 注册 Telegram Webhook

部署完成后，用实际 Worker 域名和 `WEBHOOK_SECRET` 注册 Telegram webhook。

本项目 webhook 路径固定为：

```text
/telegram/webhook/<WEBHOOK_SECRET>
```

例如你的 Worker 域名是：

```text
https://flaregram.<your-subdomain>.workers.dev
```

如果你使用自定义域名，例如：

```text
https://flaregram.example.com
```

并且 `WEBHOOK_SECRET` 是：

```text
my-secret-path
```

那么完整 webhook 地址就是：

```text
https://flaregram.<your-subdomain>.workers.dev/telegram/webhook/my-secret-path
```

使用自定义域名时，则是：

```text
https://flaregram.example.com/telegram/webhook/my-secret-path
```

注册命令：

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/setWebhook?url=https://flaregram.<your-subdomain>.workers.dev/telegram/webhook/<你的WEBHOOK_SECRET>"
```

如果你已经切到自定义域名，请改成：

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/setWebhook?url=https://flaregram.example.com/telegram/webhook/<你的WEBHOOK_SECRET>"
```

检查 webhook 状态：

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/getWebhookInfo"
```

如果你之后重新生成了 `WEBHOOK_SECRET`，需要重新上传 Cloudflare secret，并重新注册 webhook。

## 部署后联调

按下面顺序测试：

1. 普通用户私聊机器人，发送一条文本消息
2. 管理员账号应收到一条带发送方身份信息和 `Reply` / `Block` / `Unblock` 按钮的消息
3. 管理员点击 `Reply`，机器人会生成一条可回复的提示消息
4. 管理员回复这条提示消息，原用户应收到管理员回复
5. 管理员点击 `Block`
6. 该用户再次发送消息时，管理员不应再收到转发，用户侧也不会收到提示
7. 管理员点击该用户旧消息上的 `Unblock`
8. 该用户再次发送消息时，应恢复正常转发

管理员侧发送方信息包含：

- 显示名
- Telegram username（如果有）
- Telegram user id
- Telegram chat id

按钮是推荐操作方式。`/block` 和 `/unblock` 仍可通过“回复某条已关联用户的机器人消息”执行。直接发送命令不会影响任何用户，避免误操作。

再补测一次非文本消息，例如图片、文件、表情包或动图，确认 `copyMessage` 路径正常。

## 本地测试

运行单元测试：

```bash
pnpm test
```

运行类型检查：

```bash
pnpm exec tsc --noEmit
```

## 常见问题

### 1. Telegram 设置 webhook 后没有消息进来

优先检查：

- Worker 是否已成功部署
- `WEBHOOK_SECRET` 是否和注册 URL 完全一致
- `getWebhookInfo` 是否返回最近错误

### 2. 管理员能收到转发，但回复后用户收不到

先检查你是不是“回复了那条机器人转发消息本身”。

这个项目当前靠 `reply_to_message.message_id` 去 D1 查映射，如果你不是直接回复那条消息，而是新发一条独立消息，机器人不会知道应该回给谁。

### 3. 管理员回复后提示找不到映射

通常原因：

- 不是回复那条转发消息
- D1 还没初始化成功
- 部署的是旧版本代码

### 4. 用户收不到管理员回复，但管理员侧没有报错

常见原因：

- 用户屏蔽了机器人
- 用户从未真正和机器人建立私聊
- Telegram 侧临时错误

### 5. `wrangler` 命令报权限或本地监听错误

这类问题一般出现在受限沙箱或 CI 环境里。真实本地机器上执行通常不会有问题。优先在你自己的终端环境里运行：

```bash
pnpm wrangler d1 create flaregram
pnpm run db:migrate:remote
pnpm run deploy
```

## 当前限制

当前版本故意保持最简，只支持：

- 单管理员
- 通过“回复转发消息”回私信
- 无 Web 管理后台
- 无多客服分配
- 无自动回复规则

如果你准备在验证部署后继续迭代，下一步最值得加的是：

1. 管理员身份校验与更清晰的错误提示
2. webhook 注册/检查脚本
3. 多管理员支持
