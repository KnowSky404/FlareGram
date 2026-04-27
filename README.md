# FlareGram

FlareGram 是一个基于 `Cloudflare Workers + grammY + D1` 的 Telegram 双向私信中转机器人。

当前版本支持：

- 用户私聊机器人
- 机器人将消息转发给单个管理员
- 管理员在 Telegram 中直接回复该转发消息
- 机器人将管理员回复回传给原用户

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

## 一次性初始化

### 1. 安装依赖

```bash
pnpm install
```

### 2. 登录 Cloudflare

```bash
pnpm wrangler login
```

### 3. 创建 D1 数据库

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

把返回的 `database_id` 填到项目根目录的 `wrangler.jsonc`：

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "flaregram",
      "database_id": "你的真实 database_id"
    }
  ]
}
```

### 4. 获取管理员 Chat ID

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

然后把它填到 `wrangler.jsonc`：

```jsonc
{
  "vars": {
    "ADMIN_CHAT_ID": "你的管理员 chat id"
  }
}
```

### 5. 获取 `BOT_INFO`

当前项目按 grammY 在 Cloudflare Workers 上的常见做法，要求你把 Telegram `getMe` 的结果保存到 `BOT_INFO`。

先取机器人信息：

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/getMe"
```

把返回 JSON 里的 `result` 整段保存下来，后面设置 secret 时直接粘贴。

示例：

```json
{
  "id": 123456789,
  "is_bot": true,
  "first_name": "FlareGramBot",
  "username": "flaregram_bot",
  "can_join_groups": true,
  "can_read_all_group_messages": false,
  "supports_inline_queries": false
}
```

### 6. 设置 Secrets

```bash
pnpm wrangler secret put BOT_TOKEN
pnpm wrangler secret put BOT_INFO
pnpm wrangler secret put WEBHOOK_SECRET
```

建议：

- `BOT_TOKEN`：直接填 BotFather 给你的 token
- `BOT_INFO`：填上一步 `getMe` 返回的 `result` JSON
- `WEBHOOK_SECRET`：填一个高强度随机字符串，例如 `flaregram-prod-2026-xxxxxx`

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

```bash
pnpm run deploy
```

部署完成后，你会拿到 Worker 地址，通常类似：

```text
https://flaregram.<your-subdomain>.workers.dev
```

## 注册 Telegram Webhook

本项目 webhook 路径固定为：

```text
/telegram/webhook/<WEBHOOK_SECRET>
```

例如你的 Worker 域名是：

```text
https://flaregram.<your-subdomain>.workers.dev
```

并且 `WEBHOOK_SECRET` 是：

```text
my-secret-path
```

那么完整 webhook 地址就是：

```text
https://flaregram.<your-subdomain>.workers.dev/telegram/webhook/my-secret-path
```

注册命令：

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/setWebhook?url=https://flaregram.<your-subdomain>.workers.dev/telegram/webhook/<你的WEBHOOK_SECRET>"
```

检查 webhook 状态：

```bash
curl "https://api.telegram.org/bot<你的BOT_TOKEN>/getWebhookInfo"
```

## 部署后联调

按下面顺序测试：

1. 普通用户私聊机器人，发送一条文本消息
2. 管理员账号应收到机器人转发的该消息
3. 管理员直接“回复这条转发消息”
4. 原用户应收到管理员回复

再补测一次图片或文件消息，确认 `copyMessage` 路径正常。

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
