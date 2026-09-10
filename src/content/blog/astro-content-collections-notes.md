---
title: Astro Content Collections 学习笔记
description: 使用 Schema 管理 Markdown 元数据，并为公开内容建立统一边界。
titleEn: Astro Content Collections Study Notes
descriptionEn: Use Schema to manage Markdown metadata and establish a unified boundary for public content.
slug: astro-content-collections-notes
published: 2026-08-12
category: web
tags: [Astro, TypeScript, Markdown, Web]
draft: false
featured: false
toc: true
---

Content Collections 可以把 Markdown 从松散文件变成有明确结构的内容数据。

## 用 Schema 提前发现错误

文章标题、发布日期、分类、标签和草稿状态都由 Schema 校验。字段拼写错误或日期不合法时，构建阶段就会失败，而不是等上线后才发现页面异常。

```ts
const blog = defineCollection({
  schema: z.object({
    title: z.string().min(1),
    published: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});
```

## 统一公开内容边界

首页、列表、搜索、RSS 和 Sitemap 都应该调用同一套公开内容读取函数。生产环境在这一层排除草稿，能够避免某个入口意外泄漏未完成内容。

## 使用稳定链接

公开链接取自 frontmatter 中的 `slug`，不依赖 Markdown 文件名。以后整理目录或移动文件时，文章地址仍然保持不变。
