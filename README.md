# My9

一个基于 Next.js 14 的九宫格分享站点。用户可以从不同内容源搜索条目，选出最能代表自己的 9 个作品，生成只读分享页与分享图，并查看全站趋势排行。

线上站点围绕“构成我的九部作品”这一核心玩法展开，目前已经支持游戏、动画、电视剧、电影、漫画、轻小说、书籍、播客、舞台剧 / 现场演出、单曲、专辑、作品、人物、角色等多种分类。

## 功能特性

- 多分类九宫格填写与分享
- 只读分享页、分享链接、分享图导出
- 本地草稿缓存、评论与剧透折叠
- 趋势页排行与聚合缓存
- 多内容源搜索接入
  - Bangumi：游戏、动画、漫画、轻小说、作品、人物、角色等
  - TMDB：电视剧、电影
  - iTunes / Apple Music：单曲、专辑
  - NeoDB：书籍、播客、舞台剧 / 现场演出
- 分享存储 v2、冷热分层归档、趋势表重建脚本
- Footer 中独立展示开源贡献者鸣谢

## 技术栈

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Neon Serverless Postgres
- Cloudflare R2（冷归档）
- Playwright

## 支持的分类

当前支持的 `kind` 包括：

- `game`：游戏
- `anime`：动画
- `tv`：电视剧
- `movie`：电影
- `manga`：漫画
- `lightnovel`：轻小说
- `book`：书籍
- `podcast`：播客
- `performance`：舞台剧 / 现场演出
- `song`：单曲
- `album`：专辑
- `work`：作品
- `character`：角色
- `person`：人物

## 本地开发

### 1. 安装依赖

```bash
npm install
```

建议使用 Node.js 18 或更高版本。

### 2. 配置环境变量

在项目根目录创建 `.env.local`，按需填写：

```bash
# Bangumi
BANGUMI_ACCESS_TOKEN=
BANGUMI_USER_AGENT=

# TMDB
TMDB_API_READ_ACCESS_TOKEN=

# NeoDB
NEODB_API_KEY=

# Neon Postgres
NEON_DATABASE_PGHOST_UNPOOLED=
NEON_DATABASE_PGUSER=
NEON_DATABASE_PGPASSWORD=
NEON_DATABASE_PGDATABASE=
# 可选
NEON_DATABASE_PGPORT=
NEON_DATABASE_PGSSLMODE=require

# R2 冷存储
R2_ENDPOINT=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
# 可选
R2_REGION=auto

# 归档接口保护
CRON_SECRET=

# 可选特性开关
NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=0
NEXT_PUBLIC_ENABLE_VERCEL_SPEED_INSIGHTS=0
MY9_ALLOW_MEMORY_FALLBACK=0
MY9_ENABLE_V1_FALLBACK=1
MY9_TRENDS_24H_SOURCE=day
MY9_ARCHIVE_OLDER_THAN_DAYS=30
MY9_ARCHIVE_BATCH_SIZE=500
MY9_ARCHIVE_CLEANUP_TREND_DAYS=190
NEXT_PUBLIC_TALLY_FORM_URL=
NEXT_PUBLIC_WECHAT_PAY_QR_URL=
```

说明：

- 生产环境默认建议配置数据库，不依赖内存 fallback
- 分享图封面通过 `wsrv.nl` 拉取并绘制

### 3. 启动开发服务器

```bash
npm run dev
```

默认访问：`http://localhost:3000`

## 常用命令

```bash
npm run dev
npm run build
npm start
npm run lint
npm run test:e2e
```

分享存储 / 趋势 / 归档相关脚本：

```bash
node scripts/migrate-shares-v1-to-v2.mjs
node scripts/verify-shares-v2-migration.mjs
node scripts/rebuild-trend-hour-window.mjs
node scripts/rebuild-trends-kind-v3.mjs
node scripts/archive-shares-cold.mjs
```

## 测试约定

- 本地手动调试默认使用 `3000`
- Playwright 自动化测试统一使用 `3001`
- E2E WebServer 通过 `scripts/playwright-webserver.cjs` 启动
- 不要删除或覆盖开发者本地的 `.next`

运行 E2E：

```bash
npm run test:e2e
```

如需只跑核心交互用例：

```bash
node node_modules/@playwright/test/cli.js test tests/v3-interaction.spec.ts
```

## 项目结构

```text
app/                 App Router 页面与 API
app/components/      主业务组件
components/          复用组件（layout/share/subject/ui）
lib/                 领域逻辑、搜索适配、分享存储、趋势聚合
tests/               Playwright E2E
docs/                运维与贡献文档
scripts/             迁移、重建、归档、校验脚本
public/              静态资源
```

关键页面：

- `/`：首页分类入口
- `/[kind]`：填写页
- `/[kind]/s/[shareId]`：分享只读页
- `/trends`：趋势页

## 内容源说明

项目当前采用“按 kind 决定 source”的分发方式：

- Bangumi：默认内容源
- TMDB：`tv`、`movie`
- iTunes：`song`、`album`
- NeoDB：`book`、`podcast`、`performance`

新增内容源时，建议遵循：

- [docs/content-source-contribution.md](./docs/content-source-contribution.md)

## 存储与运维

分享存储当前以 v2 为主，支持：

- 内容哈希去重
- alias 兼容
- subject 维表
- 聚合趋势表
- R2 冷归档

运维说明见：

- [docs/share-storage-v2-ops.md](./docs/share-storage-v2-ops.md)

## 开源贡献者

Footer 中已提供独立的“开源贡献者”鸣谢入口。当前鸣谢包括：

- `@maxchang3`：卡片拖拽功能
- `@MiQieR`：电影 / 电视剧查询功能
- `@wanshuai12138`：单曲 / 专辑查询功能
- `@AlanWanco`：角色 / 人物查询功能

## 贡献建议

- 优先做最小改动，保持现有交互和文案风格
- 使用 `npm` 和 `package-lock.json`
- 新增 / 修改交互时优先更新 `tests/v3-interaction.spec.ts`
- 新增内容源或切换搜索源时，PR 说明建议覆盖：
  - kind 与 source 的关系
  - 搜索实现
  - 分享存储兼容
  - 前端外链与归因
  - 测试结果

## License

[MIT](./LICENSE)
