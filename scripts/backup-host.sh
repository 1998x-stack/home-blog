#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mkdir -p ./backups
flock -n /tmp/home-blog-backup.lock bash -c '
  set -Eeuo pipefail
  docker compose exec -T home-blog npm run backup:create
  docker compose cp home-blog:/data/backups/. ./backups/
  chmod 700 ./backups
  find ./backups -name "home-blog-*.tar.gz" -type f -mtime +21 -delete
  if [[ -n "${BACKUP_REMOTE:-}" ]]; then
    command -v rclone >/dev/null || { echo "rclone is required for offsite backup" >&2; exit 1; }
    rclone copy ./backups "$BACKUP_REMOTE" --transfers 2
  else
    echo "WARNING: BACKUP_REMOTE unset. Backups are local only!" >&2
  fi
'
