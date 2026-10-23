#!/usr/bin/env bash
# ECS deployment helper for https://xstack.space/blog/
set -Eeuo pipefail
umask 077

ACTION=help
if [[ $# -gt 0 ]]; then ACTION="$1"; fi
ROOT=/opt/home-blog
if [[ -n "$(printenv BLOG_ROOT || true)" ]]; then ROOT="$BLOG_ROOT"; fi
PHASE=startup

usage() {
  cat <<'HELP'
Usage: sudo bash scripts/deploy/ecs-workbench.sh <command> [archive]
  doctor      Read-only diagnostics for Docker, network, secrets and ports
  install     Install OS utilities: nginx sqlite3 python3 curl
  build       Build image using Docker Hub
  load-image  Import prebuilt home-blog:ecs image from tar.gz
  migrate     Apply database migrations (repeatable)
  bootstrap   Create first admin account (interactive, only once)
  import      Import Markdown articles (skips existing slugs)
  start       Start private Next.js CMS on localhost:3000
  publish     Export public-only static snapshot to Nginx localhost:8081
  verify      Check site, canonical /blog URLs, sitemap, llms.txt
  public      Enable public Caddy HTTPS, gated by compliance confirmation

Order: doctor -> install -> build OR load-image -> migrate -> bootstrap
       -> import -> start -> publish -> verify
After applicable ICP filing and access approval:
  sudo ICP_APPROVED=YES PUBLIC_ACCESS_CONFIRMED=YES OVERWRITE_CADDY=YES \
    bash scripts/deploy/ecs-workbench.sh public
Never send .env, passwords or private keys with bug reports.
HELP
}

if [[ "$ACTION" == help || "$ACTION" == -h || "$ACTION" == --help ]]; then usage; exit 0; fi
if (( EUID != 0 )); then echo "Use: sudo bash scripts/deploy/ecs-workbench.sh $ACTION" >&2; exit 2; fi
mkdir -p /var/log/home-blog-deploy
LOG="/var/log/home-blog-deploy/$(date -u +%Y%m%dT%H%M%SZ)-$ACTION-$$.log"
exec > >(tee -a "$LOG") 2>&1
on_error() {
  local code="$1" lineno="$2" command="$3"
  echo "[FAIL] phase=$PHASE exit_code=$code line=$lineno" >&2
  echo "[FAIL] command=$command" >&2
  echo "[LOG] $LOG" >&2
  echo "[NEXT] sudo tail -n 100 $LOG" >&2
  exit "$code"
}
trap 'on_error "$?" "$LINENO" "$BASH_COMMAND"' ERR
log() { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "[ERROR] $*" >&2; return 1; }
need() { command -v "$1" >/dev/null || fail "Missing command: $1"; }

[[ -d "$ROOT/.git" && -f "$ROOT/compose.yaml" ]] || fail "Repository missing: $ROOT (set BLOG_ROOT if relocated)."
cd "$ROOT"
log "ACTION=$ACTION | git=$(git rev-parse --short HEAD) | log=$LOG"
check_env() {
  PHASE=environment
  need python3
  [[ -f .env ]] || fail "$ROOT/.env does not exist."
  python3 - <<'PY'
from pathlib import Path
import sys
values={}
for line in Path('.env').read_text().splitlines():
    if not line or line.lstrip().startswith('#') or '=' not in line: continue
    k,v=line.split('=',1)
    values[k.strip()]=v.strip().strip('"').strip("'")
s=values.get('CSRF_SECRET','')
if len(s)<32 or 'replace-me' in s:
    sys.exit('[ENV ERROR] CSRF_SECRET missing, default, or shorter than 32 chars.')
for k in ('APP_ORIGIN','NEXT_PUBLIC_SITE_URL'):
    v=values.get(k,'')
    if not v: sys.exit('[ENV ERROR] '+k+' missing.')
    print('[ENV]',k,'=',v)
print('[ENV] CSRF_SECRET configured (redacted).')
PY
  need docker
  docker compose version
  docker compose -f compose.yaml config --quiet
}
compose() {
  if [[ -f .ecs-prebuilt ]]; then
    docker compose -f compose.yaml -f compose.ecs-image.yaml "$@"
  else
    docker compose -f compose.yaml "$@"
  fi
}
check_image() {
  need docker
  docker info --format 'Docker daemon {{.ServerVersion}}' >/dev/null
  if [[ -f .ecs-prebuilt ]]; then
    docker image inspect home-blog:ecs >/dev/null || fail "Prebuilt marker exists but home-blog:ecs is missing."
  fi
}
case "$ACTION" in
doctor)
  PHASE=doctor
  need curl; need git
  log "OS: $(. /etc/os-release; echo "$PRETTY_NAME")"
  uname -m; free -h; df -h "$ROOT"
  check_env
  docker info --format 'Docker={{.ServerVersion}} driver={{.Driver}}'
  getent ahostsv4 registry-1.docker.io || true
  if curl -4 -I --connect-timeout 6 --max-time 10 https://registry-1.docker.io/v2/; then
    log "Docker Hub reachable (401 Unauthorized is expected)."
  else
    log "Docker Hub unreachable; build may timeout. Prefer load-image."
  fi
  ss -lntp | grep -E ':(22|80|443|3000|8081)\b' || true
  ;;
install)
  PHASE=os-install
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y python3 sqlite3 curl tar nginx
  log "OS tools installed. Default nginx site must be disabled before public Caddy."
  ;;
build)
  check_env; check_image
  PHASE=docker-build
  if docker compose --progress plain -f compose.yaml build; then
    rm -f .ecs-prebuilt
    log "Image built. Continue with migrate."
  else
    log "Docker build failed. If registry-1.docker.io timed out, build home-blog:ecs on an AMD64 host, docker save, then load-image on ECS."
    fail "Inspect builder output above; do not reset volumes or delete .env."
  fi
  ;;
load-image)
  PHASE=load-image
  need docker
  [[ $# -ge 2 && -f "$2" ]] || fail "Provide a readable tar.gz: load-image /absolute/path/image.tar.gz"
  docker load -i "$2"
  docker image inspect home-blog:ecs >/dev/null || fail "Archive lacks home-blog:ecs image tag."
  cat > compose.ecs-image.yaml <<'YAML'
services:
  home-blog:
    image: home-blog:ecs
YAML
  printf '%s\n' prebuilt > .ecs-prebuilt
  check_env
  log "External image active; Compose will use --no-build."
  ;;
migrate)
  check_env; check_image; PHASE=prisma-migration
  compose run --rm --pull never home-blog npm run db:deploy
  ;;
bootstrap)
  check_env; check_image; PHASE=admin-bootstrap
  [[ -t 0 ]] || fail "Workbench interactive terminal required."
  read -rp "Admin email: " ADMIN_EMAIL
  read -rsp "Admin password (12+ chars; hidden): " ADMIN_PASSWORD
  echo
  [[ "$ADMIN_EMAIL" == *"@"* && "$(printf %s "$ADMIN_PASSWORD" | wc -c)" -ge 12 ]] || fail "Email invalid or password too short."
  export ADMIN_EMAIL ADMIN_PASSWORD
  compose run --rm --pull never -e ADMIN_EMAIL -e ADMIN_PASSWORD home-blog npm run db:bootstrap
  unset ADMIN_EMAIL ADMIN_PASSWORD
  log "Admin created. Do not repeat bootstrap."
  ;;
import)
  check_env; check_image; PHASE=markdown-import
  compose run --rm --pull never home-blog npm run db:import:v1
  log "Existing article slugs are not overwritten."
  ;;
start)
  check_env; check_image; PHASE=start-private-cms
  compose up -d --no-build
  ready=no
  for i in $(seq 1 20); do
    if curl -fsSI --max-time 5 http://127.0.0.1:3000/ >/dev/null; then ready=yes; break; fi
    sleep 2
  done
  if [[ "$ready" != yes ]]; then
    compose ps || true
    compose logs --tail=100 home-blog || true
    fail "Next.js did not respond on localhost:3000."
  fi
  log "Private CMS running on 127.0.0.1:3000."
  ;;
publish)
  check_env; check_image; PHASE=static-export
  need python3; need tar; need nginx
  compose ps --status running | grep -q home-blog || fail "Start the CMS first."
  compose exec -T home-blog env PUBLIC_SITE_URL=https://xstack.space/blog PUBLIC_EXPORT_DIR=/data/public-export npm run public:export
  PHASE=release-activate
  stage="$(mktemp -d /tmp/xstack-static.XXXXXXXX)"
  trap 'rm -rf -- "$stage"' EXIT
  mkdir -p "$stage/files"
  compose cp home-blog:/data/public-export/. "$stage/files/"
  [[ -f "$stage/files/release-manifest.json" ]] || fail "Missing release-manifest.json after export."
  archive="$stage/release.tar.gz"
  # File-only tar: never include './' directory entries, rejected by validator.
  ( cd "$stage/files"; find . -type f -printf '%P\0' | tar --null -T - -czf "$archive" )
  install -d -m 755 /srv/home-blog-public/bin /srv/home-blog-public/releases /srv/home-blog-public/incoming
  install -m 755 scripts/public/activate-release.py /srv/home-blog-public/bin/activate-release.py
  python3 /srv/home-blog-public/bin/activate-release.py activate --root /srv/home-blog-public --archive "$archive"
  PHASE=nginx-local
  if [[ -f /etc/nginx/conf.d/home-blog-public.conf ]]; then
    cp -a /etc/nginx/conf.d/home-blog-public.conf "/etc/nginx/conf.d/home-blog-public.conf.bak.$(date +%s)"
  fi
  install -m 644 deploy/public/nginx.conf /etc/nginx/conf.d/home-blog-public.conf
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    default_target="$(readlink -f /etc/nginx/sites-enabled/default)"
    if [[ "$default_target" == /etc/nginx/sites-available/default ]] && grep -q 'root /var/www/html' "$default_target"; then
      mv /etc/nginx/sites-enabled/default "/etc/nginx/sites-available/default.disabled-link.$(date +%s)"
      log "Disabled stock Nginx welcome site; backup link retained."
    else
      log "WARNING: Custom Nginx default site left unchanged."
    fi
  fi
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
  curl -fsSI http://127.0.0.1:8081/healthz
  curl -fsSI http://127.0.0.1:8081/articles/
  log "Static blog activated on localhost:8081; no public HTTPS enabled."
  ;;
verify)
  PHASE=verify
  need curl
  tmp="$(mktemp -d /tmp/xstack-verify.XXXXXXXX)"
  trap 'rm -rf -- "$tmp"' EXIT
  curl -fsSI http://127.0.0.1:8081/healthz
  curl -fsSI http://127.0.0.1:8081/articles/
  curl -fsS http://127.0.0.1:8081/articles/transformer-attention-is-all-you-need/ -o "$tmp/article"
  curl -fsS http://127.0.0.1:8081/sitemap.xml -o "$tmp/sitemap"
  curl -fsS http://127.0.0.1:8081/llms.txt -o "$tmp/llms"
  grep -Fq 'https://xstack.space/blog/articles/transformer-attention-is-all-you-need/' "$tmp/article" || fail "Missing /blog canonical article URL."
  grep -Fq 'https://xstack.space/blog/articles/' "$tmp/sitemap" || fail "Sitemap URLs lack /blog."
  grep -Fq 'Transformer' "$tmp/llms" || fail "LLM article not in llms.txt."
  log "Static HTML, canonical URL, sitemap and llms.txt verified."
  ;;
public)
  PHASE=compliance-check
  [[ "$(printenv ICP_APPROVED || true)" == YES && "$(printenv PUBLIC_ACCESS_CONFIRMED || true)" == YES ]] ||
    fail "Public deployment blocked: first complete relevant ICP备案 and hosting/access requirements; then set ICP_APPROVED=YES PUBLIC_ACCESS_CONFIRMED=YES."
  [[ -f /srv/home-blog-public/current/index.html ]] || fail "No static mirror; run publish."
  curl -fsSI http://127.0.0.1:8081/healthz >/dev/null || fail "Nginx not healthy; run verify."
  PHASE=caddy-public
  if ! command -v caddy >/dev/null; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
  fi
  [[ -f deploy/public/Caddyfile.xstack.example ]] || fail "Missing Caddyfile.xstack.example. Update from main."
  if [[ -s /etc/caddy/Caddyfile && "$(printenv OVERWRITE_CADDY || true)" != YES ]]; then
    fail "Existing /etc/caddy/Caddyfile may host other sites. Merge manually or explicitly set OVERWRITE_CADDY=YES."
  fi
  if [[ -e /etc/caddy/Caddyfile ]]; then cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%s)"; fi
  install -m 644 deploy/public/Caddyfile.xstack.example /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile
  systemctl enable --now caddy
  systemctl reload caddy
  log "Caddy started. Open TCP 80/443 security group only after approval, and check DNS A records."
  ;;
*)
  usage
  fail "Unknown command: $ACTION"
  ;;
esac
log "[SUCCESS] $ACTION complete. Log: $LOG"
