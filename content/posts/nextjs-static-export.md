---
title: "Next.js 静态导出：让家庭服务器只负责提供文件"
date: "2026-10-22"
summary: "使用 App Router 的静态导出能力，把 Markdown 文章转换为 HTML，并通过 Nginx 发布到家用 Ubuntu。"
tags: [nextjs, devops, architecture]
---

## 为什么选择静态导出

如果博客的主要工作是展示文章，没有登录、评论和运行时写入，那么生产环境持续运行一个 Node.js 服务通常不是必须的。

静态导出将内容转换为 HTML、CSS 和 JavaScript，由 Nginx 直接提供服务：

```text
Markdown → 内容解析 → Next.js build → out/ → Nginx
```

这让服务器更容易备份，也减少了公开服务的攻击面。

## 关键配置

在 `next.config.ts` 中启用：

```typescript
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
```

所有参数化路由，例如 `/articles/[slug]/`，都必须通过 `generateStaticParams()` 在构建时列举已发布的 slug。

## 关于 SEO

静态页面仍然可以获得完整的 SEO 能力：

- 每页独立的标题、摘要和 Canonical；
- 自动生成 `sitemap.xml` 和 `robots.txt`；
- RSS 订阅；
- Open Graph 元数据和文章结构化数据。

记得在构建前设置真实的 `NEXT_PUBLIC_SITE_URL`，否则站点地图和 RSS 将使用本地开发地址。

## 局限性

静态导出不支持运行时 Server Actions、ISR、依赖 Cookie 的服务器逻辑，也不会为新增 Markdown 文件自动生成网页。每次添加文章都需要重新构建。
