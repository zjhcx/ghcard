# GitHub Cards

基于 Next.js App Router + TypeScript，将 `index.html` 的设计实现为真实 GitHub 数据卡片。首页粘贴完整 GitHub HTTPS 链接，按 Enter 或点击箭头生成卡片；支持浅色 / 深色主题及移动端布局。

## 运行

```sh
npm install
npm run dev
```

访问 http://localhost:3000。生产环境使用 `npm run build` 和 `npm start`。

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

`GET /api/resolve?url=<encoded GitHub URL>&size=m` 返回识别后的 `{ path, type }`。

## 数据

GitHub REST API 由服务器调用，缓存 5 分钟。可复制 `.env.example` 为 `.env.local` 并设置 `GITHUB_TOKEN` 提高 API 配额。Token 不会传给浏览器。不存在、私有内容、超时及 API 限流均有提示。

用户大卡展示最近更新的公开仓库。热力图默认关闭，不显示占位区域，也不请求贡献接口；添加 `?heatmap=1` 显式启用：`/l/user/octocat?heatmap=1` 或 `/h/l/user/octocat?heatmap=1`。自动识别、HTML 尺寸切换和查看 SVG 链接保留该参数。启用后显示过去一年的真实贡献热力图，HTML 中独立加载。热力图按周排列，支持月份、星期、每日日期/数量提示、贡献总数及颜色图例；HTML 窄屏可横向滚动。仅用户大卡加载贡献数据，组织和中小卡不请求贡献接口。

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
