#!/usr/bin/env bash
# Opt-in Ubuntu pull-based deployment; GitHub cannot directly SSH into a home LAN.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [[ "${HOME_BLOG_AUTO_DEPLOY:-}" != "YES" ]]; then
  echo 'Explicit opt-in required: HOME_BLOG_AUTO_DEPLOY=YES' >&2
  exit 2
fi
LOCK=/tmp/home-blog-deploy.lock
exec 9>"$LOCK"
flock -n 9 || { echo 'Deployment already running' >&2; exit 0; }
compose=(docker compose -f compose.yaml -f compose.production.yaml)
# The public GHCR image must exist and have passed upstream CI.
"${compose[@]}" pull home-blog
current=$("${compose[@]}" ps -q home-blog)
if [[ -n "$current" ]]; then
  current_image=$(docker inspect -f '{{.Image}}' "$current")
else
  current_image=''
fi
next_image=$(docker image inspect -f '{{.Id}}' ghcr.io/1998x-stack/home-blog:main)
if [[ "$next_image" == "$current_image" ]]; then
  echo 'Already running latest image'; exit 0
fi
# Back up before any schema migration. Require off-host backup on production deployments.
if [[ "${BACKUP_REMOTE:-}" == "" ]]; then
  echo 'BACKUP_REMOTE must be configured for unattended deployments' >&2; exit 3
fi
if [[ -n "$current" ]]; then
  ./scripts/backup-host.sh
fi
"${compose[@]}" run --rm --no-deps home-blog npm run db:deploy
"${compose[@]}" up -d --no-deps home-blog
for i in {1..20}; do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health/ >/dev/null; then
    echo "Deploy OK: $next_image"; exit 0
  fi
  sleep 3
done
echo 'ERROR: health check failed. Investigate; database migrations may not be backward compatible.' >&2
exit 1
