# Home Blog V3.0 — Next.js CMS, SQLite FTS5, Privacy Analytics & Operations

A self-hosted Chinese-first technical blog. **V3 builds on the V2 dynamic CMS**, preserving article editing, secure sessions, revision history and media management while adding database-backed full-text search, privacy-friendly traffic counting, consistent scheduled backups and opt-in image publication/deployment.

- Repository: https://github.com/1998x-stack/home-blog
- Latest stable branch: [`main`](https://github.com/1998x-stack/home-blog/tree/main)
- Release branch: [`v3.0`](https://github.com/1998x-stack/home-blog/tree/v3.0)
- Previous releases: [`v1.0`](https://github.com/1998x-stack/home-blog/tree/v1.0) (static), [`v2.0`](https://github.com/1998x-stack/home-blog/tree/v2.0) (CMS)

## Architecture

```
Browser -> compliant HTTPS reverse proxy -> localhost:3000 -> Next.js Node server
   public pages: /, /articles, /articles/:slug, /tags, /search, /feed.xml, /sitemap.xml
   admin pages:  /admin, /admin/login, /admin/posts/:id, /admin/media, /admin/users
                 origin check + signed CSRF + sessions (DB token hashes)
                               |-> Prisma / SQLite at /data/blog.db
                               |-> uploaded JPEG/PNG/WEBP at /data/uploads
```

Unlike V1, **do not deploy `out/` or the Nginx V1 image**: V3 needs a long-running Next.js Node service and durable volume.

V3: `Post -> SQLite FTS5 trigram index (triggers) -> /api/search`; `browser pathname -> /api/analytics/view -> PageViewDaily`; `SQLite online snapshot + uploads -> checked tar.gz`; `GitHub CI -> GHCR image -> Ubuntu pull timer (opt-in)`.

## V2 features retained

- No registration page. Bootstrap the first `ADMIN` from a one-shot CLI; admins can then create admin/editor accounts.
- Passwords stored with random-salt scrypt; database stores SHA-256 session token hashes rather than raw cookie tokens; HttpOnly, SameSite=Strict, Secure-in-production cookie; 7-day expiry; server-side logout revocation.
- Mutating endpoints require fixed `APP_ORIGIN` equality **and** signed double-submit CSRF token; JSON/form-data content-type. The CSRF endpoint provides a fresh token to the same-origin client.
- Rate limit failed login per normalized email (8/15 minutes, database persisted). Configure independent edge/IP-wide rate limits and intrusion detection on the proxy.
- Markdown editing and draft/publish state; `PostRevision` keeps a full snapshot on save/restore, update uses optimistic version check.
- Private-by-default JPEG/PNG/WEBP media, maximum 5 MiB, signature checked. Media linked in published Markdown becomes public. Previously published media is **not automatically privatized** on unpublish; delete sensitive media separately before ever publishing.
- `/articles`, tag archives, homepage, search, RSS and sitemap query **published** database posts only. No draft content enters public search or feeds.
- Uploads are served through `/media/:id` with authorization checks, not directly from `public/`.

## Setup (local dev)

Requirements: Node.js 22.12+ (24 recommended), npm, SQLite local disk. You need `DATABASE_URL`, `CSRF_SECRET`, and `APP_ORIGIN`.

```bash
cp .env.example .env
# edit CSRF_SECRET and URLs; generate secret with: openssl rand -hex 32
npm install
npx prisma generate
npx prisma migrate deploy
# export ADMIN_EMAIL and ADMIN_PASSWORD transiently (never commit these)
npm run db:bootstrap
npm run db:import:v1  # optional, idempotent for existing slugs
npm run dev
```

For local development, change `.env` to `DATABASE_URL=file:./dev.db` (SQLite resolves relative URLs against the Prisma schema directory). `APP_ORIGIN=http://localhost:3000`; use the same hostname in your browser. Generate `CSRF_SECRET` once and keep it consistent through app restarts. V1 article Markdown files are left untouched and only imported on explicit command; subsequent edits are made via the database-backed admin.

## Ubuntu Docker deployment

```bash
git clone -b v3.0 https://github.com/1998x-stack/home-blog.git
cd home-blog
cp .env.example .env
# Set APP_ORIGIN and NEXT_PUBLIC_SITE_URL to exactly https://blog.example.com
# Set CSRF_SECRET to a randomly generated secret; preserve it permanently.
nano .env
sudo docker compose build
# Apply migrations *before* opening traffic:
sudo docker compose run --rm home-blog npm run db:deploy
# Bootstrap first admin interactively in your shell without recording credentials in .env:
read -rp 'Admin email: ' ADMIN_EMAIL
read -rsp 'Strong admin password: ' ADMIN_PASSWORD; echo
sudo --preserve-env=ADMIN_EMAIL,ADMIN_PASSWORD docker compose run --rm \
  -e ADMIN_EMAIL -e ADMIN_PASSWORD home-blog npm run db:bootstrap
unset ADMIN_EMAIL ADMIN_PASSWORD
sudo docker compose run --rm home-blog npm run db:import:v1
sudo docker compose up -d
curl -I http://127.0.0.1:3000/
```

In some distributions `sudo --preserve-env` is restricted by policy. If so, use a locally approved secret injection method and never store the admin password in `compose.yaml`, `.env` or a Git repository. To log in, visit `https://blog.example.com/admin/login/` **after configuring authorized HTTPS access**. Production cookies require HTTPS; local `curl` only checks the public homepage.

The runtime container uses a named `/data` Docker volume; deleting/recreating the app container does not erase the SQLite database or uploads. The volume must be backed up independently. The application binds exclusively to `127.0.0.1:3000`; use a compliant reverse proxy for public HTTPS. Follow domestic ISP and ICP requirements; tunnels do not exempt them.

> V3 maintenance patch: short-keyword FTS fallback uses SQLite `ESCAPE '!'` for literal `%`, `_`, and `!` matching; regression test included.

## V3 search: SQLite FTS5

- Migration `20261023030000_fts_analytics` creates the `PostFTS` virtual table, backfills **published** posts and sets insert/update/delete triggers. No cron-based reindex is needed for normal article changes.
- `GET /api/search/?q=...` uses **parameterized** `MATCH` with a trigram tokenizer for 3+ Unicode characters, supporting Chinese substrings. For 1-2 chars, a bounded `LIKE` fallback scans published rows only.
- ORM separately checks `status=PUBLISHED` and `publishedAt<=now` before responding, so drafts/scheduled posts never enter the public response. Query max 100 bytes/chars in URL, at most 20 hits, payload contains only title, slug, summary, tags, date — not complete Markdown.
- Natural limitation: trigram search is substring phrase matching, **not semantic retrieval or language-aware Chinese segmentation**; matching multiword input requires contiguous occurrences. FTS5 availability depends on the SQLite library packaged with the runtime.

## V3 analytics: aggregated PV, not UV

- `PageViewTracker` on client route changes sends only **normalized pathname** for public pages; it never transmits query parameters, referrers, cookies, IPs or user agents.
- Server validates exact `APP_ORIGIN`, JSON type and a strict allowlist of public paths; for article URLs it additionally checks published state.
- SQLite `PageViewDaily(day, pageKey)` increments atomically. Admin-only `/admin/analytics/` shows 30-day PV histogram and top pages.
- **No unique visitor metric.** Reloads, browser automation and uncaught robots can inflate pageviews; add proxy rate limiting on `/api/analytics/view/` (for example 30 requests/min/IP), proxy-level request body limits and bot filters. Proxy logs may still record IP addresses under separate policies.
- Keep privacy disclosure up to date, and review local legal requirements before enabling tracking for public visitors.

## V3 consistent backup and restore

The app Docker image includes SQLite CLI. Backup writes archives to the named `/data/backups` volume. An archive contains a `.backup` consistent database snapshot, uploaded images and `manifest.json` containing individual SHA-256 checksums.

```bash
# One-off backup while application remains online
sudo docker compose exec -T home-blog npm run backup:create
# Extract archives to Ubuntu backups/ folder, then transfer off the Ubuntu device
mkdir -p backups
sudo docker compose cp home-blog:/data/backups/. ./backups/
# Verify an individual archive without overwriting any production data
sudo docker compose exec -T home-blog npm run backup:verify -- /data/backups/<archive-name>.tar.gz
```

**Off-device copies are mandatory for reliable recovery:** configure rclone remote e.g. encrypted S3/OSS/NAS, and set `BACKUP_REMOTE` in `/etc/home-blog/backup.env`. `scripts/backup-host.sh` copies archives from Docker and syncs off-device via `rclone copy`. Without a configured remote it prints a warning; unattended deploy refuses to run without one. Default retention is 21 days locally, configurable with `BACKUP_RETENTION_DAYS`. Offsite retention/versioning must be configured separately.

Install systemd timer **after placing repository at `/opt/home-blog`**:

```bash
sudo mkdir -p /etc/home-blog
sudo nano /etc/home-blog/backup.env  # BACKUP_REMOTE=your-rclone-remote:home-blog
sudo cp scripts/systemd/home-blog-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now home-blog-backup.timer
sudo systemctl start home-blog-backup.service
sudo systemctl list-timers home-blog-backup.timer
```

To restore: stop serving traffic, verify archive, and restore **with explicit confirmation**. The script refuses `--apply` without `ALLOW_RESTORE=YES`, and preserves the previous DB/uploads with `.before-restore-TIMESTAMP` filenames. Check for stale `-wal`/`-shm` first; rehearse in a disposable Docker volume, never on the only copy.

```bash
# Verify while running; this does not modify live files
sudo docker compose exec -T home-blog npm run backup:verify -- /data/backups/<archive>.tar.gz
# Stop app, then use an isolated one-off container attached to same volume
sudo docker compose stop home-blog
sudo docker compose run --rm --no-deps -e ALLOW_RESTORE=YES home-blog \
  node scripts/restore.mjs /data/backups/<archive>.tar.gz --apply
sudo docker compose up -d home-blog
```

**Migration warning:** do not restore V3 DB into V2 app without confirming schema compatibility. Back up before migrating V2→V3.

## V3 automated CI, image publishing and Ubuntu pull deploy

1. On `v3.0`/`main` push or PR, `.github/workflows/ci.yml` runs tests, typechecks, lint, production build and DB migrations. New integration tests check FTS triggers, SQLite snapshot integrity and isolated restore.
2. After a successful **main push** validation, `publish.yml` builds the reviewed commit as `ghcr.io/1998x-stack/home-blog:main` and `:sha-<fullsha>`. GitHub package publishing requires Actions permission `packages:write`; make sure the resulting GHCR package has correct visibility/access.
3. On Ubuntu, **opt-in** to an hourly pull timer. The host checks for a new GHCR image, requires an offsite backup destination, snapshots the current deployment, applies migrations, starts the new image and healthchecks `/api/health/`. Automatic **database rollback is deliberately not attempted** after migration; address incompatible schemas with an explicit recovery plan.

```bash
# Test manual GHCR pull deployment first:
sudo docker compose -f compose.yaml -f compose.production.yaml pull
# Timer configuration (opt-in):
sudo nano /etc/home-blog/deploy.env
# HOME_BLOG_AUTO_DEPLOY=YES
# BACKUP_REMOTE=your-rclone-remote:home-blog
sudo cp scripts/systemd/home-blog-deploy.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now home-blog-deploy.timer
```

Prerequisites: Docker Compose v2.24+ (`!reset` override support), GHCR reachability from your ISP, write-capable `/opt/home-blog/backups` folder, `rclone` for offsite copy. Mainland China network access to GitHub/GHCR may be unreliable; if the image registry cannot be reached, use local Docker build + a controlled pull-based git deployment instead. Do not publish SSH or DB ports just for Actions.

**Deployment semantics:** The branch's source code stays in GitHub; the image in GHCR is a deployable artifact. Local automated deployment does not update Git working tree automatically. Any script/config updates require a separate administrator-controlled git update, or planned container-based release bundle.

## Development quality gates

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

V3 CI also exercises SQL migrations on an empty SQLite database. A dependency lockfile should be committed once the package graph has been installed and tested in a network-enabled environment; switch CI and Docker to `npm ci` after that. Do not claim reproducible builds without `package-lock.json`.

## Known limits and upgrade path

- Single machine SQLite only, not a multi-writer setup; don't run multiple independent app replicas pointing at the same local `.db`.
- No offline background queue, comments, approval workflow, password reset, email delivery, image resizing, or full audit logging in V2.
- Editing an article slug changes its public URL; no redirect table yet. Avoid renaming established slugs.
- Existing private image URLs become permanently public once a published article references them, unless a future media-management action removes the public flag; do not upload sensitive images.
- V3 search submits a query to your own origin but does not store it; the API only returns limited metadata for published articles. Do not include secrets in published posts.
- Cookies and csrf depend on exact `APP_ORIGIN`. Set proxy `X-Forwarded-Proto` correctly and force HTTPS.
- Consider edge rate limits, automated offsite backups, monitoring, and web accessibility audits before public launch.

## Branch policy

`v1.0`: historical static release. `v2.0`: historical CMS release. `v3.0`: full-text search and operations. `main`: latest stable release with **equivalent file tree** to the newest accepted release. Do not rewrite older version branches.
