# 站长文章编辑

代码已在本地实现与验证，用户随后授权将本轮更新推送到 GitHub。未执行手动部署或修改线上 Supabase。

## 使用方式

页脚「站长入口」或 `/zh/write` 打开管理页。登录后可管理魔法笔记和日常手账；公开文章页的工具条可进入对应编辑器。

先保存草稿，再发布。编辑已发布文章时，保存只修改工作副本；发布才替换公开版本。撤回、移入回收站都会停止公开展示，恢复后保持草稿状态。短链接在首次保存后固定。现有相册、成熟度、精选和 TOC 等元数据会随编辑保留；首版不提供图片上传或分类管理。

支持 Markdown 预览、当前输入导出、文章筛选和版本冲突提示。未保存输入会暂存在本标签页的 sessionStorage，意外刷新或返回后可选择恢复；主动退出登录会清除它。登录会话最长一小时；过期后在编辑页「重新登录」，当前输入仍保留。凭证不存入 localStorage。没有无提示自动发布。

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
