#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
PORT=${PORT:-4173}
HOST=${HOST:-127.0.0.1}
BASE_URL="http://${HOST}:${PORT}"
ARTIFACT_DIR=${ARTIFACT_DIR:-"$ROOT/.claude/skills/run-abang-cebu-ai/artifacts"}
SCREENSHOT=${SCREENSHOT:-"$ARTIFACT_DIR/home.png"}
LOG=${LOG:-"$ARTIFACT_DIR/server.log"}
SERVER_PID=

listener_pid() {
  ss -ltnp "sport = :$PORT" 2>/dev/null | grep -o "pid=[0-9]*" | cut -d= -f2 | head -n1 || true
}

stop_server() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  local pid
  pid=$(listener_pid)
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
  fi
}

trap stop_server EXIT INT TERM

if [[ -n "$(listener_pid)" ]]; then
  printf "Port %s is already in use. Stop that listener or set PORT.\n" "$PORT" >&2
  exit 1
fi

command -v pnpm >/dev/null
command -v curl >/dev/null
command -v chromium-browser >/dev/null
command -v ss >/dev/null

mkdir -p "$ARTIFACT_DIR"
: > "$LOG"

pnpm --dir "$ROOT" dev --hostname "$HOST" --port "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    printf "Server exited before it became ready. See %s\n" "$LOG" >&2
    exit 1
  fi
  sleep 1
done

if ! curl -fsS "$BASE_URL/" >/dev/null 2>&1; then
  printf "Server did not become ready within 60 seconds. See %s\n" "$LOG" >&2
  exit 1
fi

html=$(curl -fsS "$BASE_URL/")
grep -Fq "AbangCebuAI" <<<"$html"
grep -Fq "Project structure and architecture foundation established" <<<"$html"

chromium-browser \
  --headless \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1440,1000 \
  --screenshot="$SCREENSHOT" \
  "$BASE_URL/" >/dev/null

test -s "$SCREENSHOT"
printf "Smoke passed: %s\nScreenshot: %s\nLog: %s\n" "$BASE_URL/" "$SCREENSHOT" "$LOG"
