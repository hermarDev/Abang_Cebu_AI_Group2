# Security Audit and Dead-Code Cleanup Implementation Plan

> For agentic workers: use superpowers:executing-plans for serialized implementation and independent Security/QA review. Track evidence per task; never infer success.

Goal: audit AbangCebu security and bugs, then remove proven unused code without changing supported behavior or overwriting concurrent work.

Architecture: inventory first, two bounded read-only review streams, one integrating editor. Security findings and unused-code candidates require source evidence, reachability checks and focused validation before fixes/deletions. No new analyzers or dependencies by default.

Tech stack: Next.js 16.3.6, React 19, TypeScript, Supabase, pnpm 10.33.0, Vitest and Playwright (versions from current package.json).

Spec: user request in this session authorizes planning and implementation of security audit and dead-code cleanup. Scope is this checkout only.

## Global constraints

- Authorized checkout: /home/hrmr/abang-cebu-ai. Baseline HEAD a82d754bb17d765dffffc134b4c8805ee831ffcf; main is 21 commits ahead of origin/main; open PR #26 points to that HEAD.
- Baseline has 37 modified tracked paths and 17 untracked top-level status entries. Do not treat inherited modifications as this task's changes.
- Active foreign claims cover dark UI/auth shell and quick filters. Do not edit, format, build over their artifacts, change branch, or delete their dependencies. Require verified handoff for overlapping work.
- Parent claim: 48592c5f-bc42-4ef1-84b5-374236e64f77; owner hermes-security-cleanup-20261025. Expand only after inspecting exact current ownership and obtaining successful atomic renewal.
- No credential files, real customer data, live exploit scans, production migrations, deployment, role grants, forced upgrades, or remote ticket changes.
- No new tooling installs. ESLint/tsc reference scans are candidate evidence, not a whole-program proof of dead code.
- No git publication unless explicitly authorized; existing unpublished commits must not be pushed incidentally.
- Keep framework-discovered routes, public entrypoints, generated assets, migrations and uncertain dynamic references.
- Before edits to inherited dirty files, require confirmed ownership/handoff and preserve private non-secret baseline snapshots plus binary diff.

## Review focus

1. Anonymous versus signed-in access: protected operations must enforce authorization server-side, not in UI.
2. Role/profile provisioning: editable metadata must not grant privileged roles; distinguish migration source from deployed RLS.
3. Hostile input: callbacks, reset links, search queries, request bodies and forwarded IP headers must cross bounded validated interfaces.
4. Dead-code false positives: route conventions, barrel exports, dynamic imports, CSS references, fixtures and documentation consumers must survive cleanup.
5. Concurrent edits: record scoped hashes before/after validation; changed inputs invalidate that evidence.

## Acceptance criteria

- Findings identify severity, confidence, exact source references, attacker preconditions, impact, existing mitigation and smallest remediation.
- Every removed path/symbol has documented reference searches and explicit exclusions for framework/dynamic/public usage.
- Security behavior fixes have a focused regression that fails before and passes after the minimal fix.
- Removed modules have no remaining executable consumers; focused tests and relevant lint/type/build checks run against final stable inputs.
- Existing failures, environment limits and live integration gaps are distinct from introduced regressions.
- Independent Security and QA review, final scoped diff and PASS/FAIL/BLOCKED/NOT RUN matrix accompany delivery.

## Task 1: Establish baseline and audit boundaries

Files: AGENTS.md, CLAUDE.md, package.json, pnpm-lock.yaml, vitest.config.ts, eslint.config.mjs, tsconfig.json, playwright.config.ts, .github/workflows/ci.yml (read only).

- [x] Inspect root, status, branch, remotes, worktrees, open PR and live coordination claims.
- [x] Confirm local dependency/tool availability and test discovery. Vitest scope is src/**/*.test.{ts,tsx}; Playwright uses local placeholders on port 3218; do not start it without checking listener ownership.
- [x] Acquire nonoverlapping plan/review claim.
- [ ] Capture audit inputs and baseline check outputs in private scratch; exclude credential contents.
- [ ] Resolve any overlapping edit ownership before implementation; do not infer abandonment from expiry.

## Task 2: Parallel evidence collection (read only)

Interfaces: Security returns finding IDs and exact minimal proposed changes; QA returns exact deletion candidates and reference evidence. Neither modifies source or coordination registry.

- [x] Dispatch Security: src/app/api, src/app/auth, src/lib/auth, src/lib/supabase, src/server, supabase/migrations, next.config.ts and CI.
- [x] Dispatch QA: legacy src/components/features, src/styles/finder, src/types and utility-reference graph.
- [ ] Parent: run pnpm native dependency audit without forced remediation; keep registry failure distinct from clean result. Inspect manager/lock/CI consistency.
- [ ] Parent: collect feasible baseline tests and read-only lint/type checks, avoid build/server interference with concurrent UI owners.
- [ ] Reproduce and deduplicate returned findings. Reject guesses and scanner-only deletion suggestions.

## Task 3: Approve a bounded remediation/deletion batch

Files: exact source/test paths determined by verified findings, not invented in advance.

- [ ] Record candidate table: exact path/symbol, callers/tests/config/fixtures/exports, confidence, user impact, minimal edit, required tests, ownership.
- [ ] Present broad/ambiguous deletions for approval before removal. Execute only an unambiguous bounded batch within user authorization and atomic claim.
- [ ] Defer any security change to authentication semantics, CORS, rate limiting, elevated privileges or database policy until its concrete change and compatibility consequences are approved.
- [ ] Save task-only rollback evidence; never use reset/clean/stash or overwrite inherited files.

## Task 4: Serialized smallest complete changes

- [ ] Load systematic-debugging/TDD before behavior fixes; inspect each definition and every caller.
- [ ] Add one focused negative regression per confirmed root cause; execute and record its genuine failing output.
- [ ] Apply minimal shared fix, update necessary consumers/fixtures/exports only, and rerun focused checks.
- [ ] Remove only verified approved dead code and references made obsolete by that removal. Keep migrations/generated assets out of cleanup.
- [ ] Inspect exact task diff after each coherent batch; no unrelated formatting or new abstraction.

## Task 5: Independent review and final validation

- [ ] Run pnpm test; pnpm lint; pnpm exec tsc --noEmit --incremental false, with scoped hashes and complete logs.
- [ ] Run pnpm build only after safe shared artifact ownership; otherwise mark BLOCKED rather than overwrite another session's build.
- [ ] Run focused existing Playwright scenarios for affected runtime behavior on a session-owned verified local preview; fixture checks are not live auth/RLS assurance.
- [ ] Independent QA checks deletion references and compatibility; Security retests affected controls and unresolved severity.
- [ ] Inspect final diff/status against inherited baseline; separate local evidence from CI and deployed configuration.
- [ ] Publish concise audit report and concrete remaining-risk list, exact removed paths, verification matrix and approval blockers.
- [ ] Release/complete only this session's verified claim after work stops. No remote publication without authorization.

Rollback: reverse only task-authored hunks or restore exact task-deleted files from the privately retained baseline. Preserve concurrent/inherited content. If ownership becomes unclear, stop edits and report handoff needed.

## Initial status

Discovery and two parallel read-only reviews started. No application edits or deletions performed. Full production security assurance is not implied by this plan or local tests.
