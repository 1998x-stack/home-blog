#!/usr/bin/env bash
# Push only the static export to a provisioned cloud VPS. Never send /data/blog.db.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
: "${PUBLIC_SITE_URL:?Specify HTTPS origin}"
: "${PUBLIC_SSH_TARGET:?Set e.g. blogpublisher@example.com}"
if [[ ! "$PUBLIC_SSH_TARGET" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*@[a-zA-Z0-9.-]+$ ]]; then
  echo 'Invalid PUBLIC_SSH_TARGET' >&2; exit 2
fi
docker compose exec -T home-blog env PUBLIC_SITE_URL="$PUBLIC_SITE_URL" PUBLIC_EXPORT_DIR=/data/public-export npm run public:export
mkdir -p dist-public
if [[ -e dist-public/release-manifest.json ]]; then rm -rf dist-public; mkdir dist-public; fi
docker compose cp home-blog:/data/public-export/. ./dist-public
bundle="$(mktemp "${TMPDIR:-/tmp}/home-blog-public.XXXXXX.tar.gz")"
trap 'rm -f "$bundle"' EXIT
# No private files: pack ONLY dist-public, never database, env vars or repository.
tar -czf "$bundle" -C dist-public .
remote_file="/srv/home-blog-public/incoming/$(sha256sum "$bundle" | cut -c1-32).tar.gz"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$PUBLIC_SSH_TARGET" 'mkdir -p /srv/home-blog-public/incoming'
scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes "$bundle" "${PUBLIC_SSH_TARGET}:${remote_file}"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$PUBLIC_SSH_TARGET" \
  "python3 /srv/home-blog-public/bin/activate-release.py activate --root /srv/home-blog-public --archive ${remote_file}"
printf 'Released public snapshot. Verify %s and /healthz at cloud origin.\n' "$PUBLIC_SITE_URL"
