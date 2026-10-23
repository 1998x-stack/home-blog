export const site = {
  title: "Home Blog",
  name: "1998x Stack",
  description: "工程实践、系统设计与长期主义的技术笔记。",
  author: "1998x-stack",
  locale: "zh_CN",
  language: "zh-CN",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  github: "https://github.com/1998x-stack",
  repo: "https://github.com/1998x-stack/home-blog",
} as const;

export const canonical = (path = "/") => new URL(path.replace(/^\/+/, ""), `${site.url}/`).toString();
