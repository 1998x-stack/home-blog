# Home Blog · V1.0

> **Markdown-first · Next.js App Router · Static export · Git-powered · Ubuntu self-hosting**

A minimal, bilingual-friendly engineering blog built for ownership and longevity. Pages are compiled into plain files: production only needs Nginx, not Node.js or a database.

**Repository:** https://github.com/1998x-stack/home-blog · **Release branch:** [`v1.0`](https://github.com/1998x-stack/home-blog/tree/v1.0)

## Features

- Responsive editorial homepage, archives, article detail, topics, projects, about, search, and 404.
- Markdown + YAML frontmatter, GFM tables/tasks, sanitized HTML rendering, draft exclusion, and build-time schema validation.
- Build-time RSS (`/feed.xml`), sitemap (`/sitemap.xml`), robots, canonical URLs, Open Graph, JSON-LD article metadata.
- Instant client-side search over published article titles, summaries, tags, and bodies; no external search service.
- Light/dark mode, focus styles, reduced-motion support, semantic HTML, accessibility-conscious controls.
- Pure static export (`out/`), multi-stage Docker build, unprivileged Nginx, localhost port binding, CI checks.
- MIT licensed. Chinese-first example content; edit everything in the repository.

## Architecture

```text
content/posts/*.md  ─┐
                     ├─> Content loader + Zod validation ─> Next.js build
src/data/projects.ts ┘                                │
                       ┌──────────────────────────────┘
                       ▼
            out/ HTML/CSS/JS/XML/SVG
                       │
               Nginx (port 8080)
                       │
             127.0.0.1:3000 host
                       │
      optional SSH reverse tunnel / Caddy
                       │
             domain + HTTPS (compliant)
```

**Design decision:** This branch deliberately does not contain an auth API, comments, server database, ISR, runtime image optimization, or a Node.js production server. These require a separate architecture and threat model.

## Requirements

- Node.js 22+ recommended (Next.js requires Node >= 20.9), npm, or Docker + Compose.
- For container builds, enough free memory for the build. The runtime static server uses much less RAM.
- An authorized hosting setup for your chosen audience. For mainland China public service, verify ICP filing/access and the residential ISP terms *before* offering public access.

## Local development

```bash
git clone -b v1.0 https://github.com/1998x-stack/home-blog.git
cd home-blog
cp .env.example .env.local
# set NEXT_PUBLIC_SITE_URL=http://localhost:3000 in .env.local
npm install
npm run dev
```

Open http://localhost:3000. Then run:

```bash
npm test
npm run lint
npm run build
# build artifacts are in out/
```

**Dependency note:** Network access was unavailable during the initial code authoring, so this branch does not contain a generated npm lockfile. After the first successful `npm install`, commit `package-lock.json` and change CI/Docker from `npm install` to `npm ci` for reproducible installations. Do not claim a verified reproducible build before doing that.

## Publish a new article

Create `content/posts/my-first-experiment.md`:

```md
---
title: "一次工程实验"
date: "2026-10-23"
summary: "实验的问题定义、基本方法与结果汇总。"
tags: [engineering, architecture]
draft: false
featured: false
---

## 问题

从背景开始写。
```

Slug is the lowercase kebab-case filename, immutable if you care about inbound links. Dates are ISO `YYYY-MM-DD`. Available tag IDs are defined in `src/config/tags.ts`. Set `draft: true` to omit a post from the **entire public build**, including search, RSS, sitemap and archive. For a new tag, update `src/config/tags.ts` and `tests/content.test.mjs`.

Publication = commit Markdown + build + deploy. No online administration credentials or writable database are needed.

## Configure identity and SEO

1. Edit `src/config/site.ts` (author, title, description, GitHub links).
2. Edit `src/data/projects.ts` for your actual projects.
3. Replace example posts with your own writing and adjust the date.
4. Replace `public/favicon.svg` and `public/og.svg` for personal branding.
5. Set **`NEXT_PUBLIC_SITE_URL=https://blog.your-domain.com` before production build**. Site URLs are fixed at build time, not container runtime.

```bash
NEXT_PUBLIC_SITE_URL=https://blog.example.com npm run build
```

`http://localhost:3000` is only a safe local placeholder; never publish that as your canonical site URL. Check the generated `out/sitemap.xml`, `out/robots.txt`, `out/feed.xml`, and article metadata before launch. Some social websites do not preview SVG OG images; replace `og.svg` with a PNG before relying on broad social-card compatibility.

## Docker on Ubuntu

```bash
cp .env.example .env
nano .env  # Set the real domain when deployment is authorized
sudo docker compose build
sudo docker compose up -d
sudo docker compose ps
curl -I http://127.0.0.1:3000/
```

Docker Compose binds **only** `127.0.0.1:3000` to the host. There is no need to expose this internal application port. The built image contains Nginx and `/usr/share/nginx/html`, not the Next.js runtime.

For the public endpoint, a **compliant** reverse proxy can use `http://127.0.0.1:3000` as upstream. If using the two-server option in the deployment plan, a restricted reverse SSH tunnel from home Ubuntu to a cloud host can bind `127.0.0.1:13000` on the VPS and Caddy can proxy to that local endpoint. Do not use a tunnel to bypass residential-hosting rules, ICP requirements, or an ISP restriction.

## CI

On push to `v1.0`, GitHub Actions runs tests, ESLint, a full static export, artifact presence checks, and uploads the generated `out/` directory as an Actions artifact. **CI does not automatically expose the website** or configure cloud secrets.

## Design and security notes

- Only repository-authored Markdown is rendered. `remark-rehype` does not allow raw HTML and `rehype-sanitize` provides a second protection layer.
- Relative URLs are used for internal navigation, while canonical/RSS/sitemap use the configured absolute production URL.
- The client-side search index contains **all published article bodies**. It never includes drafts, but the full published text is visible in browser code; do not put secrets in published posts.
- The `public/` directory is publicly served; never commit tokens, private documents, or backup files.
- Nginx is non-root and read-only with a limited writable tmpfs. The exposed port is localhost-only.
- Static HTML is straightforward to replicate to a CDN or a cloud host without changing the content model.
- For production launch, add a real PNG social card, pin/fix dependency lockfile, run security audit, and independently verify the public compliance and network path.

## Planned next steps

V1.1: automated deployment with signed build artifact, syntax highlighting, article TOC, image processing, multi-language metadata, pagination and additional tests. V2: optionally add a CMS and user accounts as a **separate** backend; don't turn a static build into a writable app without first designing auth, backups, abuse protection, and content sanitization.

## License

MIT. See [LICENSE](LICENSE).
