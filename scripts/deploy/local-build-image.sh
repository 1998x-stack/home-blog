#!/usr/bin/env bash
# Build and package home-blog for Shanghai ECS (linux/amd64).
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(dirname "$ROOT")/home-blog-ecs-artifact"
mkdir -p "$OUT"
LOG="$OUT/build-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG") 2>&1
PHASE=preflight
on_error() {
  echo "[FAILED] phase=$PHASE code=$1 line=$2 command=$3" >&2
  echo "[LOG] $LOG" >&2
}
trap 'on_error "$?" "$LINENO" "$BASH_COMMAND"' ERR
cd "$ROOT"
command -v docker >/dev/null || { echo "Docker CLI unavailable; install/start Docker." >&2; exit 2; }
docker info >/dev/null
SHA="$(git rev-parse HEAD)"
echo "[INFO] source=$SHA"
echo "[INFO] target=linux/amd64"
PHASE=build
if docker buildx version >/dev/null 2>&1; then
  docker buildx build --platform linux/amd64 --load --progress plain \
    --label "org.opencontainers.image.revision=$SHA" -t home-blog:ecs .
else
  [[ "$(uname -m)" == x86_64 ]] || { echo "Need Docker Buildx for ARM host." >&2; exit 2; }
  docker build --platform linux/amd64 -t home-blog:ecs .
fi
PHASE=verify
TARGET="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' home-blog:ecs)"
[[ "$TARGET" == linux/amd64 ]] || { echo "[ERROR] wrong platform: $TARGET" >&2; exit 3; }
PHASE=package
docker save home-blog:ecs | gzip -1 > "$OUT/home-blog-image.tar.gz"
(
  cd "$OUT"
  if command -v sha256sum >/dev/null; then
    sha256sum home-blog-image.tar.gz > home-blog-image.tar.gz.sha256
  else
    shasum -a 256 home-blog-image.tar.gz > home-blog-image.tar.gz.sha256
  fi
)
ls -lh "$OUT/home-blog-image.tar.gz" "$OUT/home-blog-image.tar.gz.sha256"
echo "[SUCCESS] Artifacts: $OUT"
echo "[LOG] $LOG"
