# Home Blog V4.0 — private Ubuntu CMS + public static cloud mirror

Repo: <https://github.com/1998x-stack/home-blog> · release branch `v4.0` · production branch `main` (same source tree).

> **Deploy only if allowed by your ISP and after all applicable mainland China hosting, ICP, public security and access rules are satisfied.** A cloud proxy or sync job does not waive these requirements. V4 keeps a public site online during home-network outages, but a single VPS is **not multi-node high availability**.

## Architecture and threat boundary

```text
       HOME Ubuntu (private administration)               CLOUD VPS (public / read-only)
  +-------------------------------------+            +----------------------------------+
  | Next.js 16 CMS + SQLite /data/blog.db|            | TLS/CDN/Caddy -> Nginx 8081     |
  | /admin, /api, revisions, media       |            | /srv/home-blog-public/current   |
  |  ... publish-public.sh [opt-in] ...  |--- SSH --->| index.html /articles /tags      |
  | DB snapshot -> published content only|--- SCP --->| /assets /media /search-index    |
  +-------------------------------------+            | no Node, SQLite, login or API   |
                                                     +----------------------------------+
```

The public release is a **separate HTML rendition of your published content**, not the Next.js CMS UI. It has the same article URLs, tags and major public routes, but may not exactly match V3's typography/components. No public Next.js server, Redis, cloud DB, shared CMS cookie, or inbound access to the home network is required.

**Boundary conditions:** publishes only `Post.status=PUBLISHED` with `publishedAt<=now`, supported slugs, known tags, and public media referenced from those published posts. Excludes private media, drafts, unpublished scheduled articles, users, sessions, raw SQLite files, and admin routes. Sanitizes Markdown HTML with `rehype-sanitize`; search index is public and can include **published** Markdown text (limit 10,000 characters). Don't put secrets in published articles. Unpublishing content removes it on the *next successful release*; published content may persist in previous VPS releases or CDN/browser caches and must be purged separately for sensitive takedowns.

## V3 improvements carried forward

- Fixed SQLite short-query `LIKE ESCAPE` to one-character `!`, escaping literal `%`, `_`, `!`; added regression test.
- V3 still provides FTS5 trigram search, aggregated local PV, CSRF-protected sessions, revision history, consistent SQLite + media backups, and GHCR build pipeline. **PV displayed by the private V3 dashboard does not count visits served only by the V4 static mirror**. Configure separate privacy-preserving cloud analytics if required; do not label PV as unique visitors.

## Local development / tests

Prerequisites: Ubuntu 24.04, Node.js 24, npm, `sqlite3`, Python 3, Docker Engine with Compose v2. The parent V3 README/history describes initializing the CMS and first admin.

```bash
cp .env.example .env
# Set CSRF_SECRET, APP_ORIGIN, NEXT_PUBLIC_SITE_URL, DATABASE_URL
npm install --no-audit --no-fund
npm run db:generate
npm run db:deploy
npm test
npm run public:test
npm run lint && npm run typecheck && npm run build
```

To export a public snapshot on a host with an initialized SQLite database:

```bash
export DATABASE_URL=file:/absolute/path/blog.db
export MEDIA_DIR=/absolute/path/uploads
export PUBLIC_SITE_URL=https://blog.example.com
export PUBLIC_EXPORT_DIR=./dist-public
npm run public:export
python3 -m http.server 8090 --directory dist-public
# Test the generated HTML at http://localhost:8090 locally; canonical URLs point to PUBLIC_SITE_URL.
```

The exporter refuses to replace arbitrary output folders. Only folders it previously marked as `.home-blog-static-export` may be replaced; it produces `release-manifest.json` with SHA256 for every exported file.

## Production: Home Ubuntu

1. Keep the **private CMS** running using existing `compose.yaml` and its persistent `/data` volume. It should listen only on `127.0.0.1:3000`; restrict access to `/admin` to your private/Tailscale network, **do not publish it via the cloud mirror**.
2. Ensure backup/export tasks run with a Docker-capable account. Cloud credentials are SSH keys with remote host key verification. The image includes `sqlite3`, Markdown dependencies and export scripts.
3. `PUBLIC_SITE_URL` must equal the intended public HTTPS domain. The public export runs **inside the CMS container** so the database isn't exposed to the host shell or cloud.

```bash
# Repo at /opt/home-blog (replace as needed); running container already initialized.
cd /opt/home-blog
sudo install -d -m 700 /etc/home-blog
sudo nano /etc/home-blog/public.env
# PUBLIC_SITE_URL=https://blog.example.com
# PUBLIC_SSH_TARGET=blogpublisher@your-vps.example.com
sudo cp scripts/systemd/home-blog-public.{service,timer} /etc/systemd/system/
# Edit User=ubuntu and paths in the .service if your account/path differs.
sudo systemctl daemon-reload
sudo systemctl enable --now home-blog-public.timer
# For a manual first publish, after VPS preparation:
sudo systemctl start home-blog-public.service
journalctl -u home-blog-public.service --no-pager -n 100
```

Don't place tokens, DB files, admin passwords, SSH private keys or actual `.env` contents into your public repo. For media changes, generate a fresh public snapshot. Use a dedicated SSH key authorized for the `blogpublisher` account; secure that key and its host fingerprint. The publisher runs every ~30 minutes after the preceding successful run (plus up to 2 minutes jitter). Publishing changes requires a valid connection, otherwise VPS keeps the last release.

## Production: Cloud VPS provision (Ubuntu + Nginx + optional Caddy)

Provision a compliant domestic cloud VPS. Install Nginx and Python 3. Create a low-privilege publisher user (example only; confirm your exact home Ubuntu UID/account). Public release files must be readable by Nginx, not writable by it.

```bash
sudo apt-get update && sudo apt-get install -y nginx python3
sudo adduser --disabled-password --gecos '' blogpublisher
sudo install -d -o blogpublisher -g blogpublisher -m 755 /srv/home-blog-public
sudo install -d -o blogpublisher -g blogpublisher -m 755 /srv/home-blog-public/{bin,incoming,releases}
sudo install -m 755 scripts/public/activate-release.py /srv/home-blog-public/bin/activate-release.py
sudo chown blogpublisher:blogpublisher /srv/home-blog-public/bin/activate-release.py
sudo cp deploy/public/nginx.conf /etc/nginx/conf.d/home-blog-public.conf
sudo nginx -t && sudo systemctl reload nginx
```

Place the home publisher's *public* SSH key in `/home/blogpublisher/.ssh/authorized_keys`; enforce dedicated permissions and keep the user's SSH access limited to release upload and activation. The cloud example listens only at `127.0.0.1:8081`. Configure compliant Caddy/TLS proxy `reverse_proxy 127.0.0.1:8081` for `blog.example.com` or use an approved CDN pointed at your HTTPS origin. Add `X-Content-Type-Options` and related headers at the proxy too; Nginx provides CSP and short TTLs on HTML/search.

**First release** (after VPS account, key and service configured):

```bash
PUBLIC_SITE_URL=https://blog.example.com \
PUBLIC_SSH_TARGET=blogpublisher@your-vps.example.com \
  ./scripts/public/publish-public.sh
```

The publisher: runs `npm run public:export` **inside Docker**, copies only `/data/public-export`, archives only its public files, uploads archive by SSH/SCP, and activates with `activate-release.py`. It does not transmit the SQLite database or private uploads.

**Verify:**

```bash
# On VPS:
curl -fI http://127.0.0.1:8081/healthz
curl -fI http://127.0.0.1:8081/articles/
# Verify public domain only after approved HTTPS/DNS/hosting is configured.
```

## Atomic activation and rollback

`activate-release.py` reads tar members without unsafe tar extraction, rejects special files/symlinks, path traversal, oversized archives and unexpected files; validates per-file hashes and a deterministic release index. It stores content in `/srv/home-blog-public/releases/<digest>` and atomically replaces the `current` symlink. `previous` points at the former release. The last five releases are normally retained, including the current and previous.

```bash
# Roll back the public files only (does NOT roll back your private CMS database).
python3 /srv/home-blog-public/bin/activate-release.py rollback \
  --root /srv/home-blog-public
```

If you must urgently remove leaked content, rollback **can re-expose it**. Instead delete every affected old release, redeploy the corrected snapshot, purge CDN caches, and review backup access policies. Cloud availability: home power/ISP outage leaves last public pages live; VPS outage, DNS, cloud region failure or expired HTTPS can still take it down.

## Test matrix

- `npm test`: V1–V3 content, security, search integration plus public exporter with synthetic database.
- `npm run public:test`: Python integration tests for atomic activation, reactivation, rollback, tamper rejection and traversal rejection.
- CI also checks lint, TypeScript, Next production build, Prisma migrations, Nginx config syntax and Docker build.
- Browser smoke tests and actual ISP/cloud/CDN performance remain **operator tests**; GitHub Actions cannot verify your domestic home ISP, cloud server or public DNS.

## Branch policy

`v1.0`, `v2.0`, and `v3.0` remain preserved release branches; `v4.0` contains this public-mirror architecture. `main` tracks the latest passing release's source tree. When merging with a merge commit the *commit SHA* can differ; check `git rev-parse main^{tree}` and `git rev-parse v4.0^{tree}` for equality. Do not advance `main` until the required tests pass.

Next step if truly multi-node HA is needed: replicate the **static public** release across two separately provisioned compliant cloud instances plus DNS or CDN failover; never share writable SQLite between independent CMS nodes.
