# GitHub Cards

基于 Next.js App Router + TypeScript，将 `index.html` 的设计实现为真实 GitHub 数据卡片。首页粘贴完整 GitHub HTTPS 链接，按 Enter 或点击箭头生成卡片；支持浅色 / 深色主题及移动端布局。

## 运行

```sh
npm install
npm run dev
```

访问 http://localhost:3000。生产环境使用 `npm run build` 和 `npm start`。

## Cloudflare Workers

按 [Cloudflare 官方 Next.js 指南](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) 使用 vinext 接入 Workers，保留原来的 Next.js 开发 / 构建命令。vinext 目前为 Beta，部署前建议执行兼容性检查与预览验证。需要 Node.js 22.12+（或 24 LTS）及 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm exec vinext check
pnpm run build:vinext
pnpm run start:vinext
```

`start:vinext` 使用 Workers 本地运行时预览；`dev:vinext` 启动独立的 Vite 开发环境，默认端口 3001。原来的 `npm run dev` 仍启动 Next.js（3000）。

### Cloudflare Workers Builds 设置

仓库通过 `packageManager` 固定 pnpm 12.11.2，workspace 显式包含根项目。若 Cloudflare 仍检测到 pnpm 9.10.0，请在构建环境变量中设置 `PNPM_VERSION=12.11.2` 并清理依赖缓存后重新构建，不要关闭 frozen lockfile。

- 构建命令：`pnpm run build:vinext`
- 部署命令：`pnpm exec vinext-cloudflare deploy --skip-build`
- 根目录：仓库根目录

默认的 `npx wrangler deploy` 不适用于本项目生成的 CF Build Output；请使用上面的 vinext 部署命令。

### 部署

```sh
pnpm exec cf auth login
# 设置 Cloudflare 控制台中的 Account ID；CI 同时设置 CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID=你的账号ID
pnpm run deploy:vinext
```

配置位于 `cloudflare.config.ts` 和 `vite.config.ts`，Worker 名为 `ghcard`。启用 KV 数据缓存，在部署时自动创建 / 绑定 KV 命名空间，供 GitHub REST（5 分钟）与贡献数据（1 小时）的 fetch 缓存使用；需要账号具备 Workers KV 权限。未开启 Cloudflare Images，头像保持原图，无需额外图片服务。没有使用 OpenNext、R2 或 Pages 静态导出。

`GITHUB_TOKEN` 是可选的**运行时 Secret**，请在 Cloudflare 控制台为 `ghcard` 设置，不要写入配置或设置 `NEXT_PUBLIC_GITHUB_TOKEN`。不配置时热力图继续使用公开贡献 API。Cloudflare API Token 与 GitHub Token 是两个不同的凭据：前者仅用于部署，后者仅用于运行时调用 GitHub。Workers 预览所需的本地 Secret 可放在 `.dev.vars`（已忽略），Node / Next.js 开发继续使用 `.env.local`。

本次接入保留应用路由和数据源，并为两套构建链补齐类型兼容；不会自动登录、创建远程资源或发布；上述部署命令由你在确认账号后执行。Workers / KV 的套餐与配额以 Cloudflare 账号为准。

## 路由

卡片默认输出原生 SVG，响应类型为 `image/svg+xml`，可直接用于 Markdown、`<img>` 或下载。默认尺寸 `m`。`s` / `m` / `l` 对应 340 / 420 / 640px，窄屏自动适配。

| 类型 | 示例 |
| --- | --- |
| 用户 | `/m/user/octocat` |
| 组织 | `/m/org/vercel` |
| 仓库 | `/l/repo/vercel/next.js` |
| Release | `/l/release/vercel/next.js/latest` 或 `/m/release/owner/repo/v1.0.0` |
| Commit | `/m/commit/owner/repo/完整或至少7位SHA` |
| PR | `/m/pr/owner/repo/123` |
| Issue | `/m/issue/owner/repo/123` |
| 自动识别 | `/a/octocat`、`/a/vercel/next.js`、`/a/owner/repo/pull/123` |

添加 `/h` 前缀强制使用 HTML 页面：

- `/l/user/octocat`：SVG 用户大卡，默认关闭热力图。
- `/h/l/user/octocat`：HTML 用户大卡，默认关闭热力图。
- `/a/octocat`：识别后跳转至中号 SVG。
- `/h/a/octocat`：识别后跳转至中号 HTML。
- `/h/`：HTML 首页，生成的卡片继续使用 HTML 路径。

SVG 默认为浅色，添加 `?theme=dark` 使用深色；`/a/` 跳转会保留深色参数。SVG 头像嵌入图像数据，无法下载头像时显示用户名首字母。无效路由或取数失败也返回 SVG，并保留相应 HTTP 错误状态码。

```md
![GitHub profile](/l/user/octocat)
```

`/a/…` 自动识别后跳转至中号规范路由，也支持将完整 GitHub 链接整体进行 `encodeURIComponent` 后放在 `/a/` 后。用户与组织依靠 GitHub API 自动区分，Issue 地址指向 PR 时自动转为 PR。Release 标签可含 `/` 和 URL 编码字符。提交 SHA、PR 和 Issue 编号必须包含 owner/repo，避免不同仓库间冲突；不能仅凭一个 SHA 或数字判断仓库和类型。

`GET /api/resolve?url=<encoded GitHub URL>&size=m` 返回识别后的 `{ path, type }`。传入 `heatmap=1` 时，仅为识别为用户的大卡路径附加热力图参数。

## 数据

GitHub REST API 由服务器调用，缓存 5 分钟。可复制 `.env.example` 为 `.env.local` 并设置 `GITHUB_TOKEN` 提高 API 配额。Token 不会传给浏览器。不存在、私有内容、超时及 API 限流均有提示。

用户大卡展示最近更新的公开仓库。首页输入用户链接并选择 L 后，可勾选「显示提交热力图」生成带热力图的卡片；HTML 用户预览页也提供开启 / 隐藏按钮，从中小卡开启时自动切换为大卡。热力图默认关闭，不显示占位区域，也不请求贡献接口；添加 `?heatmap=1` 显式启用：`/l/user/octocat?heatmap=1` 或 `/h/l/user/octocat?heatmap=1`。自动识别、HTML 尺寸切换和查看 SVG 链接保留该参数。启用后显示过去一年的真实贡献热力图，HTML 中独立加载。热力图按周排列，支持月份、星期、每日日期/数量提示、贡献总数及颜色图例；HTML 窄屏可横向滚动。仅用户大卡加载贡献数据，组织和中小卡不请求贡献接口。

有 `GITHUB_TOKEN` 时使用 [GitHub GraphQL contributionCalendar](https://docs.github.com/en/graphql/reference/users)，没有 Token 时使用 [公开贡献 API](https://github.com/grubersjoe/github-contributions-api) 的 `?y=last`。后者是第三方服务，只传公开用户名，不传 Token。贡献数据缓存一小时；取数失败保留其余卡片并显示提示，不用全零或随机数据替代。缺失日期和格式异常同样视为取数失败。

没有伪造 Pinned、Stars 总数、组织成员数或验证标记。Release 正文按纯文本展示，避免不可信 HTML；完整内容可通过卡片跳转 GitHub 查看。

## 检查

```sh
npm test
npm run typecheck
npm run build
```

## 参考

使用 [Next.js 官方安装说明](https://nextjs.org/docs/app/getting-started/installation) 的 App Router 项目结构。
