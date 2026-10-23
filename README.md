# Home Blog V2.0 — Next.js CMS on Ubuntu

A self-hosted Chinese-first technical blog. **V2 changes the runtime**: preserves the V1 public pages and Markdown content model, and adds a server-side editorial dashboard, Prisma + SQLite, image uploads, revision history, and login.

- Repository: https://github.com/1998x-stack/home-blog
- Latest stable branch: [`main`](https://github.com/1998x-stack/home-blog/tree/main)
- Release branch: [`v2.0`](https://github.com/1998x-stack/home-blog/tree/v2.0)
- Previous immutable static baseline: [`v1.0`](https://github.com/1998x-stack/home-blog/tree/v1.0)

## Architecture

```
Browser -> compliant HTTPS reverse proxy -> localhost:3000 -> Next.js Node server
   public pages: /, /articles, /articles/:slug, /tags, /search, /feed.xml, /sitemap.xml
   admin pages:  /admin, /admin/login, /admin/posts/:id, /admin/media, /admin/users
                 origin check + signed CSRF + sessions (DB token hashes)
                               |-> Prisma / SQLite at /data/blog.db
                               |-> uploaded JPEG/PNG/WEBP at /data/uploads
```

Unlike V1, **do not deploy `out/` or the Nginx V1 image**: the V2 backend needs a long-running Node.js server and a durable volume.

## V2 scope

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
git clone -b v2.0 https://github.com/1998x-stack/home-blog.git
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

## Backup/restore

With the container running, create a SQLite-consistent snapshot (do **not** copy a live `.db` without WAL awareness):

```bash
mkdir -p backups
sudo docker compose exec -T home-blog sqlite3 /data/blog.db '.backup /data/blog-snapshot.db'
container="$(sudo docker compose ps -q home-blog)"
sudo docker cp "$container:/data/blog-snapshot.db" "backups/blog-$(date +%F).db"
# Additionally back up the /data/uploads directory; the database alone is insufficient.
# Transfer both backups to encrypted off-device storage. Practice test restores.
```

Keep daily backups off the Ubuntu machine, restrict backup access, and rehearse a restore to a **separate** volume before depending on the site. For upgrades: backup -> `docker compose build` -> `docker compose run --rm home-blog npm run db:deploy` -> `docker compose up -d` -> check health.

## Development quality gates

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

V2 CI also exercises SQL migrations on an empty SQLite database. A dependency lockfile should be committed once the package graph has been installed and tested in a network-enabled environment; switch CI and Docker to `npm ci` after that. Do not claim reproducible builds without `package-lock.json`.

## Known limits and upgrade path

- Single machine SQLite only, not a multi-writer setup; don't run multiple independent app replicas pointing at the same local `.db`.
- No offline background queue, comments, approval workflow, password reset, email delivery, image resizing, or full audit logging in V2.
- Editing an article slug changes its public URL; no redirect table yet. Avoid renaming established slugs.
- Existing private image URLs become permanently public once a published article references them, unless a future media-management action removes the public flag; do not upload sensitive images.
- Client-side search transmits *no queries*, but published article bodies are included in the public page payload; never include secrets in published posts.
- Cookies and csrf depend on exact `APP_ORIGIN`. Set proxy `X-Forwarded-Proto` correctly and force HTTPS.
- Consider edge rate limits, automated offsite backups, monitoring, and web accessibility audits before public launch.

## Branch policy

`v1.0`: stable static historical release. `v2.0`: dynamic CMS release. `main`: latest accepted stable release **with equivalent source tree** to the newest stable branch, updated after checks. Avoid editing older release branches.
