# 站长文章编辑

## 发布与删除同步 GitHub

1. 在 Supabase SQL Editor 执行 `supabase-github-sync.sql`（先执行原有 `supabase-editor.sql`）。迁移为现有已发布文章建立待同步记录，可重复执行。
2. 在部署环境设置服务端变量 `WRITER_GITHUB_TOKEN`、`WRITER_GITHUB_REPOSITORY`（当前仓库为 `DemiZovo/portfolio`）、`WRITER_GITHUB_BRANCH=main`。令牌仅授权目标仓库的 Contents 读写权限，不要使用 NEXT_PUBLIC_ 前缀，不要提交令牌。分支规则必须允许该身份提交。API 权限说明：https://docs.github.com/en/rest/repos/contents
3. 部署后，登录 Writer 点击「同步 GitHub / 重试」，分批同步原有文章，直到显示「GitHub 已同步」。每次最多处理五条，剩余条目继续点击同步。

发布将公开快照写为 `src/content/blog/<slug>.md` 或 `src/content/life/<slug>.md`；重新发布更新同一文件。保存草稿不会上传工作副本。撤回、移入回收站、永久删除会移除对应文件；恢复仍为私有草稿，不上传。删除不会清除 Git 历史。

数据库继续作为网站内容来源。公开内容变更与待同步记录在同一数据库事务中保存；GitHub 故障不会撤销网站操作。界面会分别提示网站成功与 GitHub 失败，重试不重复发布文章，也支持已永久删除文章的待同步记录。当前没有后台定时任务；失败条目由下一次发布/删除或手动同步重试。并发同步串行处理，旧版本确认不会清除新变更，崩溃锁两分钟后可重试。

使用规范化 slug 作为文件名；历史上采用其他文件名的 Markdown 需要先对齐，系统不会猜测或删除其他路径。同步提交可能触发目标分支的现有部署流水线。

本地验证：`node scripts/test-github-sync.mjs`（模拟 GitHub HTTP，真实内存 PostgreSQL，无生产写入）。

代码已在本地实现与验证，用户随后授权将本轮更新推送到 GitHub。未执行手动部署或修改线上 Supabase。

## 使用方式

页脚「站长入口」或 `/zh/write` 打开管理页。登录后可管理魔法笔记、日常手账和工坊项目。公开页面不显示编辑、新增、删除或管理工具，即使站长已登录也只保留页脚「站长入口」。

先保存草稿，再发布。编辑已发布文章时，保存只修改工作副本；发布才替换公开版本。撤回、移入回收站都会停止公开展示，恢复后保持草稿状态。短链接在首次保存后固定。现有相册、成熟度、精选和 TOC 等元数据会随编辑保留；首版不提供图片上传或分类管理。

支持 Markdown 预览、当前输入导出、文章筛选和版本冲突提示。未保存输入会暂存在本标签页的 sessionStorage，意外刷新或返回后可选择恢复；主动退出登录会清除它。登录后的页面只保留退出登录；使用 HttpOnly 会话 Cookie 自动续期，不再展示账号或重新登录表单。访问凭证过期时会先静默续期再重试；刷新凭证失效时回到初始登录表单，当前编辑区保持挂载以保留输入。刷新 Cookie 随浏览器会话保存，退出时一起清除。凭证不存入 localStorage。没有无提示自动发布。

## 正式启用（尚未执行）

1. 在目标 Supabase SQL Editor 执行 `supabase-editor.sql`。它新增独立的 `editor_articles` 表，不覆盖旧的 `content_entries` 草案或留言板数据。
2. 在 Supabase Auth 创建站长用户，关闭不需要的公开注册；按 SQL 文件末尾示例将该用户 UUID 加入 `site_admins`。不要把真实密码或密钥提交到仓库。
3. 运行 `node scripts/export-editor-import.mjs PATH_TO_REVIEW.sql`，检查输出，再在 Supabase 执行。脚本只生成 SQL，不连接数据库；遇到现有 slug 不覆盖。先保留仓库 Markdown 作为备份，并核对总数、草稿、正文和日期。
4. 在本地 `.env.local` 或未来部署环境配置：

   ```dotenv
   CONTENT_SOURCE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET
   NEXT_TELEMETRY_DISABLED=1
   ```

   旧 service-role JWT 可放在 `SUPABASE_SERVICE_ROLE_KEY`。所有写操作使用登录用户 JWT 和数据库权限；服务端密钥仅供公开读取已发布快照。浏览器不接收服务端密钥。
5. 重新构建并启动，使用站长登录验证。切换后数据库是文章唯一来源；查询失败不会回退到 Markdown，避免已删除文章重新出现。数据库上线后，新增/发布文章无需再构建。

默认 `CONTENT_SOURCE=markdown` 保持现有站点可运行，管理页明确显示尚未启用。不要在没有导入和验证数据前开启数据库模式。

## 本地验证

- `pnpm check` / `pnpm build`：类型与生产构建。
- `node scripts/test-editor-db.mjs`：使用内存 PostgreSQL 执行真实 SQL，验证 RLS、发布快照、回收站、版本冲突；不连接 Supabase。
- `node scripts/editor-fixture.mjs --serve`：仅测试进程，监听 `127.0.0.1:54329`，如存在 `.test-output/import.sql` 会导入到内存数据库；应用代码不会加载这个文件。
- API 集成测试需将本地生产构建的 Supabase URL 设为 fixture 地址，public key 设为 `fixture-public`，服务端 key 设为 `sb_secret_fixture`，并设 `CONTENT_SOURCE=supabase`。然后运行 `node scripts/test-editor-api.mjs http://localhost:3100`。这些是假凭证，只能用于本地测试，不能用于正式环境。
- 测试页账号为 `owner@example.test` / `local-test-only`。所有测试数据仅存在于独立测试进程内存中，进程结束即消失。

缓存使用 Next.js 15 的带标签 fetch 与发布后失效，参考 [Next.js 15 缓存文档](https://nextjs.org/docs/15/app/guides/caching)。登录后通过 Auth 服务端用户查询验证凭证，参考 [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)。


## 工坊项目管理

先执行现有的 supabase-editor.sql 并配置站长账号，再在同一个 Supabase 项目执行 supabase-workshop.sql。该脚本新增独立项目表，不修改文章或留言表；重复执行不会重置项目。此项没有在本次本地修改中连接线上数据库执行。

进入 /zh/write 后选择「项目管理」（直达 /zh/write?view=projects）。选择项目可修改名称、GitHub 仓库地址、技术语言、中英文简介和封面；支持新增、上移、下移、删除与撤销删除。最后点击「保存并更新工坊」，整份列表一次性生效。删除卡片不会删除 GitHub 仓库。清空列表并保存后工坊保持为空。

第一次打开会使用 src/data/workshop.ts 的现有项目；首次保存后以数据库为准。数据库模式下读取失败不会恢复已删除的默认卡片，而会显示暂时不可用。公开工坊读取不缓存，保存后刷新可见，无需重新构建。

需要先启用现有 CONTENT_SOURCE=supabase、NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 配置。尚未启用时工坊仍显示代码中的默认卡片，Writer 会显示配置提示。项目管理不是浏览器本地存储。

离开页面和退出登录前会提醒未保存修改；保存失败保留当前输入，登录访问凭证过期会自动续期。出现版本冲突时可先「导出当前输入」保留 JSON，再「重新加载」合并，防止覆盖其他窗口的修改。


Writer 未选择文章时使用全宽列表，搜索与状态筛选并排显示；选择文章后切换到侧栏与编辑区。编辑区的「返回文章列表」恢复全宽浏览，并对未保存修改给出提示。
