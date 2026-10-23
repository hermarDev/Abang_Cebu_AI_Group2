---
name: run-abang-cebu-ai
description: Build, run, drive, smoke-test, and screenshot the AbangCebuAI Next.js app. Use when asked to start the app, verify its homepage in a browser, take a UI screenshot, build it, lint it, type-check it, or run its tests.
---

# Run AbangCebuAI

All paths are relative to the repository root. Use `.claude/skills/run-abang-cebu-ai/driver.sh` as the agent path: it starts the Next.js development server, checks the live homepage, captures it with headless Chromium, and stops the server.

## Prerequisites

- Node.js 22+
- pnpm 10+
- `curl`, `ss`, and `chromium-browser`
- A populated `.env.local`; copy `.env.example` and add the local Supabase values without committing secrets.

## Setup

```bash
pnpm install --frozen-lockfile
```

## Build

```bash
pnpm build
```

## Run (agent path)

```bash
.claude/skills/run-abang-cebu-ai/driver.sh
```

The driver verifies the title text and foundation message, then writes:

- Screenshot: `.claude/skills/run-abang-cebu-ai/artifacts/home.png`
- Server log: `.claude/skills/run-abang-cebu-ai/artifacts/server.log`

Set `PORT`, `HOST`, `ARTIFACT_DIR`, or `SCREENSHOT` to override defaults. Generated artifacts are ignored by Git.

## Run (human path)

```bash
pnpm dev --hostname 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`; stop with Ctrl-C.

## Test

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

Verified result: TypeScript and ESLint pass; Vitest passes 20 tests in 2 files.

## Gotchas

- Do not run `pnpm start -- --hostname ...`: pnpm forwards the literal `--`, and Next treats `--hostname` as a project directory. The agent driver avoids this by using the development script directly.
- Port `4173` must be free. The driver detects an existing listener and exits instead of killing an unrelated process; set `PORT` to another value.
- The current homepage is intentionally sparse. A mostly blank screenshot with centered `AbangCebuAI` and `Project structure and architecture foundation established.` is the expected render.

## Troubleshooting

- `Error: listen EADDRINUSE: address already in use 127.0.0.1:4173`: another process owns the port. Stop that process or rerun with `PORT=4174`.
- `Invalid project directory provided, no such directory: .../--hostname`: remove the extra `--`, or use the driver.
