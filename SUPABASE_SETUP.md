# 首页点赞与留言板

两项功能共用 Vercel 集成关联的 Supabase 项目。连接集成会注入环境变量，不会自动执行仓库内的 SQL。

## 数据库初始化

在同一 Supabase 项目的 SQL Editor 依次执行：

1. [home-likes.sql](./home-likes.sql)：`site_likes` 表、`home` 初始记录、读取和增加点赞数的 RPC。
2. [supabase-guestbook.sql](./supabase-guestbook.sql)：`guestbook_messages` 表、回复关联和索引。

这两份 SQL 可在已有兼容表结构上重复执行，不会清空点赞或留言。它们不是已有不兼容表结构的自动迁移工具。

## Vercel 环境变量

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 两项功能使用的项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 浏览器调用首页点赞 RPC |
| `SUPABASE_SECRET_KEY` | 服务端访问留言表，支持 `sb_secret_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 未设置新 secret key 时的旧密钥兼容入口 |
| `ALLOWED_GUESTBOOK_IP` | 可选，站长公网 IP，用于留言管理 |

Supabase 集成已提供同名变量时无需重复添加。变量必须覆盖目标部署环境；更新后重新部署，因为 `NEXT_PUBLIC_` 变量在构建时写入浏览器代码。Secret key 只能用于服务端，不能放入公开变量、源码或 Git。

## 数据路径与验证

- 首页：`HomeLikeButton` → `get_home_like_count` / `increment_home_like_count` → `site_likes`。
- 留言：`GuestbookChat` / `GuestbookThread` → `/api/guestbook` → `guestbook_messages`。
- 匿名访问者只能执行点赞 RPC；两张表保持 RLS 开启且禁止匿名直接访问。留言通过服务端代理返回，不公开 IP。
- 发布留言时使用 `Prefer: return=representation`，从返回数组取出新增记录。

部署后检查首页点赞数读取、留言列表，以及留言发布与回复。不要通过关闭 RLS 来解决连接问题。
