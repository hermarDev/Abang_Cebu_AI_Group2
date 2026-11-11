#!/usr/bin/env bash
# scripts/rollback.sh — Standalone emergency rollback script for AbangCebu AI on EC2
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/abangcebu}"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/hermardev/abang_cebu_ai_group2}"

cd "$DEPLOY_DIR"

TARGET_TAG="${1:-}"

if [ -z "$TARGET_TAG" ]; then
  echo "Usage: $0 <image-tag>"
  echo "Example: $0 sha-a76b510"
  echo ""
  echo "Available local tags for $IMAGE_REPO:"
  docker images --filter "reference=$IMAGE_REPO" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"
  exit 1
fi

echo "=========================================="
echo "AbangCebu AI Emergency Container Rollback"
echo "Target Tag: $TARGET_TAG"
echo "Deploy Dir: $DEPLOY_DIR"
echo "=========================================="

export IMAGE_TAG="$TARGET_TAG"

echo "Attempting to pull target tag $TARGET_TAG..."
docker compose pull abangcebu-app || echo "Pull failed or offline; attempting to use cached local image..."

echo "Restarting abangcebu-app with $TARGET_TAG..."
docker compose up -d --remove-orphans abangcebu-app

echo "Verifying container health on /api/health..."
HEALTHY=false
for i in $(seq 1 15); do
  if curl -s -f http://127.0.0.1:3000/api/health > /dev/null; then
    echo "✅ Container healthy on attempt $i!"
    HEALTHY=true
    break
  fi
  echo "Waiting for healthcheck ($i/15)..."
  sleep 2
done

if [ "$HEALTHY" = "true" ]; then
  echo "✅ Rollback to $TARGET_TAG completed successfully!"
  exit 0
else
  echo "❌ ERROR: Container failed health check after rollback!"
  docker logs abangcebu-app --tail 50
  exit 1
fi
