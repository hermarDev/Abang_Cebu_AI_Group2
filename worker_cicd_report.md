# Worker 2: CI/CD Security Hardening Implementation Report

**Target Project:** AbangCebu AI (`hermarDev/Abang_Cebu_AI_Group2`)  
**Branch:** `security/cicd-hardening`  
**Working Directory:** `/home/hrmr/abang-cebu-cicd`  
**Date:** November 11, 2026  
**Auditor / Engineer:** Worker 2 (CI/CD Security)

---

## 1. Executive Summary

This report documents the verification, remediation, and validation of CI/CD security vulnerabilities and operational deployment gaps identified in `abang_cebu_security_cicd_audit.md`.

All 5 core findings assigned to Worker 2 were independently verified from live repository workflows, configuration files, and GitHub Actions execution logs. Targeted, minimal, and backward-compatible fixes were implemented across GitHub Actions workflows, Docker Compose, deployment scripts, and operations documentation.

All quality gates passed cleanly with zero regressions:
* **Vitest Test Suite:** 121 test files passed (1,073 tests passed, 0 failed)
* **TypeScript Compilation:** `tsc --noEmit` exited 0 (clean static types)
* **ESLint 9:** `pnpm lint` exited 0 (0 errors, 0 warnings)
* **YAML Validation:** PyYAML parse passed on all modified workflow and compose files
* **Docker Compose Validation:** `docker compose config` passed with valid schema and container specifications

---

## 2. Independent Verification & Triage Matrix

| Finding ID | Description | Audit Status | Observed Reality in Repo | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Finding 1** | Service & image name mismatch between `deploy.yml` and `docker-compose.yml` | **Confirmed High Risk** | `deploy.yml` pushed to `ghcr.io/${{ github.repository }}` (`ghcr.io/hermardev/abang_cebu_ai_group2`), but `docker-compose.yml` hardcoded `ghcr.io/hermardev/abangcebuai:latest` without referencing `IMAGE_TAG`. | Updated `docker-compose.yml` to `image: ghcr.io/hermardev/abang_cebu_ai_group2:${IMAGE_TAG:-latest}`. Updated `deploy.yml` to export `IMAGE_TAG="${{ needs.build-and-publish.outputs.image_tag }}"` and pull/deploy the immutable commit tag. |
| **Finding 2** | Production deployment triggers without waiting for CI checks | **Confirmed High Risk** | Both `ci.yml` and `deploy.yml` triggered concurrently on `push: branches: [main]`. A failing build or secret leak did not prevent `deploy.yml` from building and pushing to production. | Added `verify-ci` gate job in `deploy.yml` that awaits and verifies successful completion of `ci.yml` (both `ci` and `secret-scan` jobs) before `build-and-publish` and `deploy-production` can execute. |
| **Finding 3** | Unpinned third-party actions in `deploy.yml` | **Confirmed High Risk** | `deploy.yml` used mutable tags (`@v4`, `@v3`, `@v5`, `@v2`, `@v1.0.3`) while accessing privileged secrets (`SSH_PRIVATE_KEY`, `TAILSCALE_AUTHKEY`). | Pinned all third-party actions to immutable 40-character commit SHAs with version comments, matching the security standard in `ci.yml`. |
| **Finding 4** | Tailscale authentication cleanup | **Confirmed Medium Risk** | `deploy.yml` passed both `authkey` and unsupported `audience` / orphaned `oauth-client-id` without `oauth-secret`, triggering deprecation and unexpected input warnings in action logs. | Cleaned up `Connect to Tailscale` inputs to cleanly use `authkey: ${{ secrets.TAILSCALE_AUTHKEY }}` and `tags: tag:ci`, eliminating warnings and aligning with the active environment secret. |
| **Finding 5** | Missing automated rollback mechanism and deployment health checks | **Confirmed High Risk** | Health check loop previously logged failure and exited 1, leaving the container in a crashed or unhealthy state on EC2 with production offline. | Implemented automated rollback in `deploy.yml` (capturing running image before update, testing `/api/health`, and automatically rolling back to previous healthy image upon failure). Created standalone `scripts/rollback.sh` utility. |

---

## 3. Implementation Details

### 3.1 Synchronized Service & Image Tagging (`docker-compose.yml` & `deploy.yml`)
* In `docker-compose.yml`:
  ```yaml
  services:
    abangcebu-app:
      image: ghcr.io/hermardev/abang_cebu_ai_group2:${IMAGE_TAG:-latest}
      container_name: abangcebu-app
  ```
* In `deploy.yml`:
  * Metadata step generates immutable short commit SHA tags (`sha-<short_sha>`) as primary output (`outputs.version`), plus `:latest` and tag references.
  * Deployment step exports `IMAGE_TAG="${{ needs.build-and-publish.outputs.image_tag }}"` before running `docker compose pull abangcebu-app`.

### 3.2 Gated CD Execution on CI Success (`deploy.yml` & `ci.yml`)
* Added `verify-ci` job as the initial job in `deploy.yml`:
  * Verifies that `ci.yml` run for `github.sha` completes with `conclusion: success`.
  * Monitors status using GitHub CLI with a 10-minute timeout polling loop.
  * If CI fails or is cancelled, `verify-ci` exits with 1, aborting `build-and-publish` and `deploy-production`.
  * Includes emergency manual override flag `skip_ci_verification` under `workflow_dispatch`.
* Added `tags: ["v*"]` to `ci.yml` so release tag pushes also trigger full test and secret scanning suites.

### 3.3 Pinning All GitHub Actions to Immutable Commit SHAs (`deploy.yml`)
All third-party actions in `deploy.yml` are now pinned:
* `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
* `docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2 # v3.10.0`
* `docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567 # v3.3.0`
* `docker/metadata-action@369eb591f429131d6889c46b94e711f089e6ca96 # v5.6.1`
* `docker/build-push-action@ca052bb54ab0790a636c9b5f226502c73d547a25 # v5.4.0`
* `tailscale/github-action@4e4c49acaa9818630ce0bd7a564372c17e33fb4d # v2`
* `appleboy/ssh-action@029f5b4aeeeb58fdfe1410a5d17f967dacf36262 # v1.0.3`

### 3.4 Tailscale Connection Input Hardening (`deploy.yml`)
* Removed invalid input `audience` which is unsupported in `tailscale/github-action@v2`.
* Removed orphaned `oauth-client-id` that lacked `oauth-secret`.
* Retained verified `authkey: ${{ secrets.TAILSCALE_AUTHKEY }}` and `tags: tag:ci`.

### 3.5 Automated Pipeline Rollback & Standalone Tooling (`deploy.yml` & `scripts/rollback.sh`)
* In `deploy.yml`:
  * Pre-deployment state capture: inspects and records running image (`PREV_IMAGE=$(docker inspect --format='{{.Config.Image}}' abangcebu-app)`).
  * Expanded health verification: 20 checks at 2-second intervals against `http://127.0.0.1:3000/api/health`.
  * On failure: dumps container logs (`docker logs abangcebu-app --tail 100`) and automatically rolls back to `PREV_IMAGE`.
  * On success: prunes stale images (`docker image prune -f`).
* Created standalone executable script `scripts/rollback.sh`:
  * Allows host operators on EC2 to perform an instant zero-downtime rollback to any specified tag: `./rollback.sh sha-<commit_sha>`.
  * Verifies health status on `/api/health` and displays recent container logs if health check fails.
* Updated `docs/production/DEPLOYMENT_RUNBOOK.md` and `docs/production/CICD_ARCHITECTURE.md` to document the rollback procedure and synchronized image repository names.

---

## 4. Verification Evidence

### 4.1 Vitest Suite
```
 Test Files  121 passed (121)
      Tests  1073 passed (1073)
   Duration  21.27s
```

### 4.2 Static Checks
* `pnpm exec tsc --noEmit` -> Exit Code 0 (clean static typing)
* `pnpm lint` -> Exit Code 0 (clean ESLint 9 checks)

### 4.3 YAML & Compose Syntax
* PyYAML validation passed for:
  * `.github/workflows/ci.yml`
  * `.github/workflows/deploy.yml`
  * `docker-compose.yml`
* `docker compose config` passed with valid schema and resource boundaries.
* `bash -n scripts/rollback.sh` passed with 0 shell errors.

---

## 5. Scope & Residual Risk Notes

* **Skipped / Unmodified:** In strict accordance with ownership boundaries, no application business logic, Supabase database schemas/RLS policies, Caddy configs, or EC2 host networking rules were touched.
* **Residual Risk / Operational Prerequisites:**
  1. Once this PR is merged to `main`, the next deployment will pull image `ghcr.io/hermardev/abang_cebu_ai_group2:sha-<commit>`. EC2 host directory `/opt/abangcebu` will utilize the new compose definition automatically upon git sync.
  2. The Tailscale secret `TAILSCALE_AUTHKEY` in GitHub Environment `production` remains valid; if migrating to OAuth workload identity in the future, `oauth-secret` must be added to GitHub secrets.
