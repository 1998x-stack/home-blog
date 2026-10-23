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
PHASE=buildx-check
if ! docker buildx version; then
  echo "[ERROR] Docker Buildx is missing; this script will not fall back to legacy docker build." >&2
  echo "[HINT] Ubuntu docker.io: sudo apt update && sudo apt install -y docker-buildx" >&2
  echo "[HINT] Official Docker CE: sudo apt install -y docker-buildx-plugin" >&2
  echo "[HINT] macOS: update/install Docker Desktop and make sure it is running." >&2
  exit 11
fi

PHASE=registry-check
echo "[INFO] Docker context: $(docker context show)"
echo "[INFO] Configured registry mirrors:"
docker info --format '{{json .RegistryConfig.Mirrors}}' || true
echo "[INFO] Verifying official base image node:24-bookworm-slim (linux/amd64)."
if ! docker pull --platform linux/amd64 node:24-bookworm-slim; then
  echo "[ERROR] Cannot pull the official Node 24 base image." >&2
  echo "[HINT] The tag exists: https://github.com/docker-library/official-images/blob/master/library/node" >&2
  echo "[HINT] If configured, verify your Docker registry mirror actually carries this tag." >&2
  echo "[HINT] Check curl -4 -I https://registry-1.docker.io/v2/; HTTP 401 is normally healthy." >&2
  echo "[HINT] Do not modify Dockerfile to a random Node tag or disable TLS verification." >&2
  exit 12
fi

PHASE=build
docker buildx build --platform linux/amd64 --load --progress plain \
  --label "org.opencontainers.image.revision=$SHA" -t home-blog:ecs .
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
