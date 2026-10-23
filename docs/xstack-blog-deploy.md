# xstack.space/blog — V4 public mirror deployment

> Prerequisite: the Shanghai ECS is lawfully allowed to serve this public site, and the domain's applicable ICP/access requirements are satisfied before public exposure. DNS A record for `xstack.space` must point at ECS public IPv4.

## Architecture

`https://xstack.space/blog/ -> ECS Caddy (strips /blog prefix) -> local Nginx 127.0.0.1:8081 -> static V4 export`

The CMS remains on loopback only. Its database, drafts, cookies and /admin pages are not exported. Production source of truth can be on the home Ubuntu and pushed via SSH as described in the V4 README; the commands below demonstrate a one-host initial launch on the ECS, with private CMS localhost and public read-only mirror, useful until the home-to-cloud publisher is configured.

## 1. Provision ECS

Install Docker Engine + Compose plugin from https://docs.docker.com/engine/install/ubuntu/ and install nginx, caddy, sqlite3, python3 and git from supported package repositories. Back up existing Nginx/Caddy configs before editing. The sample Caddy config owns `xstack.space`; if a site already serves /, merge its route blocks instead of replacing them.

```sh
sudo apt-get update
sudo apt-get install -y git python3 sqlite3 nginx caddy
sudo mkdir -p /opt
sudo git clone -b feature/xstack-blog-llm-seo https://github.com/1998x-stack/home-blog.git /opt/home-blog
cd /opt/home-blog
sudo cp .env.example .env
# Set APP_ORIGIN=http://localhost:3000 and NEXT_PUBLIC_SITE_URL=http://localhost:3000 for private CMS.
# Generate a permanent random secret with: openssl rand -hex 32
sudoedit .env
sudo docker compose build
sudo docker compose run --rm home-blog npm run db:deploy
# Bootstrap an admin account: follow README bootstrap credentials instructions.
sudo docker compose up -d
sudo docker compose exec -T home-blog npm run db:import:v1
```

**Important:** `db:import:v1` is idempotent for existing slugs; run after bootstrap. The five new paper markdown files live under `content/posts/`. A persistent `blog_data` Docker volume must be backed up independently. If your ECS has 2GB RAM and runs out of memory building the image, build on another trusted AMD64 host and load the image onto the ECS; do not delete the data volume.

## 2. Export and serve

```sh
cd /opt/home-blog
sudo install -d -m 755 /srv/home-blog-public/bin /srv/home-blog-public/incoming /srv/home-blog-public/releases
sudo install -m 755 scripts/public/activate-release.py /srv/home-blog-public/bin/activate-release.py
sudo docker compose exec -T home-blog env PUBLIC_SITE_URL=https://xstack.space/blog PUBLIC_EXPORT_DIR=/data/public-export npm run public:export
sudo mkdir -p dist-public
sudo docker compose cp home-blog:/data/public-export/. ./dist-public/
(cd dist-public && find . -type f -printf '%P\\0' | tar --null -T - -czf /tmp/xstack-blog-release.tar.gz)
sudo python3 /srv/home-blog-public/bin/activate-release.py activate --root /srv/home-blog-public --archive /tmp/xstack-blog-release.tar.gz
sudo cp deploy/public/nginx.conf /etc/nginx/conf.d/home-blog-public.conf
sudo nginx -t && sudo systemctl reload nginx
curl -fI http://127.0.0.1:8081/healthz
curl -fI http://127.0.0.1:8081/articles/
```

On a clean host, ensure the default Nginx site does not claim 80/443: let Caddy own the public HTTP/TLS listeners; keep Nginx public export on 127.0.0.1:8081. Nginx's `/etc/nginx/sites-enabled/default` should be disabled only after checking what it serves and preserving any other applications.

## 3. HTTPS routing (after ICP approval)

Merge `deploy/public/Caddyfile.xstack.example` into `/etc/caddy/Caddyfile`, verify then reload:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

Allow 80/443 at the ECS security group only once legally ready for public access. Keep port 3000 and 8081 private. The Caddy `handle_path /blog/*` strips the prefix for Nginx, while the generated HTML contains absolute path links with `/blog/`. Do not strip the prefix a second time.

## 4. Acceptance and SEO/GEO checks

```sh
curl -fI https://xstack.space/blog/
curl -fsS https://xstack.space/blog/ | grep -o 'canonical[^>]*'
curl -fsS https://xstack.space/blog/sitemap.xml | grep -o 'https://xstack.space/blog/articles/' | head
curl -fsS https://xstack.space/blog/llms.txt | head
curl -fsS https://xstack.space/blog/articles/transformer-attention-is-all-you-need/ | grep -o 'application/ld+json'
curl -fsS https://xstack.space/robots.txt
```

Submit `https://xstack.space/blog/sitemap.xml` to Google Search Console and Bing Webmaster Tools. Search indexing and AI answer citations cannot be guaranteed. An `llms.txt` document is experimental discovery metadata, **not an official ranking factor**. Edit and fact-check articles before publicizing. Never advertise the private CMS admin/API.

For later updates: run `docker compose build` only when code changes require it, rerun `db:import:v1` for new slugs, export a fresh static mirror and atomically activate it; do not remove the named Docker volume.

## Safer error-reporting Workbench helper

The complete staged helper is at `scripts/deploy/ecs-workbench.sh`. It prints `phase`, `exit_code`, failed command and a `/var/log/home-blog-deploy/` log path on errors. Since secrets live in `.env`, do not paste `.env` in bug reports. Invoke:

```bash
cd /opt/home-blog
sudo bash scripts/deploy/ecs-workbench.sh doctor
sudo bash scripts/deploy/ecs-workbench.sh install
sudo bash scripts/deploy/ecs-workbench.sh build # may fail if Docker Hub is unreachable
# Alternative: sudo bash scripts/deploy/ecs-workbench.sh load-image /root/home-blog-image.tar.gz
sudo bash scripts/deploy/ecs-workbench.sh migrate
sudo bash scripts/deploy/ecs-workbench.sh bootstrap
sudo bash scripts/deploy/ecs-workbench.sh import
sudo bash scripts/deploy/ecs-workbench.sh start
sudo bash scripts/deploy/ecs-workbench.sh publish
sudo bash scripts/deploy/ecs-workbench.sh verify
```

Only after applicable ICP and hosting/access approval, and after checking the existing Caddyfile, opt in to the public action. The public action will not run without two explicit confirmation environment variables.
