# AbangCebuAI — Production Readiness Audit Report

**Date:** November 11, 2026  
**Lead Auditor:** Team-Lead (Orchestrator)  
**Specialist Auditors:** Investigator, Architect, QA Specialist  
**Target Repository:** `/home/hrmr/abang-cebu-ai`  
**Git Branch / Commit:** `main` (`4d0864d`)  
**Production Host:** AWS EC2 `${DEPLOY_HOST}` (`${TAILSCALE_IP}` / `${PUBLIC_IP}`)  
**Production Domain:** `abangcebu.tech`  
**Status:** Complete Read-Only Investigation (Gate 1)

---

## 1. Executive Summary

A comprehensive multi-agent investigation was executed across the AbangCebuAI application, runtime configurations, database integrations, infrastructure host, and CI/CD pipelines.

### Verification Status Across Quality Gates
| Layer | Verification Method | Results | Verdict |
|---|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | 0 errors across entire codebase | **PASS** |
| **ESLint Static Analysis** | `pnpm run lint` | 0 errors, 0 warnings | **PASS** |
| **Unit and Integration Tests** | `vitest run` (`pnpm test`) | 118 test files passed (1,048 / 1,048 tests) | **PASS** |
| **Playwright E2E Tests** | `playwright test` (headless Chromium) | 189 / 189 scenarios passed | **PASS** |
| **Next.js Production Build** | `next build` (Turbopack, Next 16.3.6) | 39 routes generated, 0 errors | **PASS** |
| **Host Connectivity and SSH** | Tailscale SSH to `${DEPLOY_HOST}` | 2 vCPU, 3.74GB RAM, 25GB free disk | **PASS** |
| **TLS Certificate Status** | Caddy ACME v2 Let's Encrypt | Valid certificates for `abangcebu.tech` and `www` | **PASS** |
| **CrowdSec Host IPS** | `cscli` + `cs-firewall-bouncer` | Caddy log acquisition active, firewall bouncer active | **PASS** |
| **Existing Containers** | Docker on EC2 | Clean isolation; no conflicts with OmniRoute/Redis | **PASS** |

---

## 2. Critical Production Blockers and Vulnerability Matrix

| ID | Category | Severity | Finding and Root Cause | File and Line Reference | Remediation Required |
|---|---|---|---|---|---|
| **BLK-01** | Infrastructure | **P0 - Critical** | **EC2 Host has 0 Swap Space**: `t3.medium` has 3.74GB RAM and 0B swap. Memory bursts or Docker build steps risk kernel Out-Of-Memory (OOM) killing running processes. | Live EC2 `free -h` (Swap: 0B) | Provision a 2GB swap file on `/swapfile` and limit container RAM to 2048MB. |
| **BLK-02** | Docker / Build | **P0 - Critical** | **Missing Next.js Standalone Mode**: `next.config.ts` lacks `output: "standalone"`. Without it, Docker images require full `node_modules` (>1.2GB image vs ~200MB standalone). | `next.config.ts:3-9` | Add `output: "standalone"` to `nextConfig` in `next.config.ts`. |
| **BLK-03** | Application Config | **P0 - Critical** | **Hardcoded Localhost Site URL**: `NEXT_PUBLIC_SITE_URL` defaults to `http://localhost:3000`. `route.ts` strictly requires HTTPS in production; otherwise password reset fails with HTTP 503 (`AUTH_PASSWORD_RESET_UNAVAILABLE`). | `src/app/api/auth/reset-password/request/route.ts:98-106` | Set `NEXT_PUBLIC_SITE_URL=https://abangcebu.tech` in production environment. |
| **BLK-04** | Security / Auth | **P0 - Critical** | **Cloudflare Header Requirement on Auth Rate Limiter**: In production (`NODE_ENV === "production"`), registration and reset endpoints strictly inspect `cf-connecting-ip`. If requests bypass Cloudflare and reach Caddy directly, `clientIp` is undefined and requests fail closed with HTTP 429. | `src/app/api/auth/register/route.ts:34-45`, `src/app/api/auth/reset-password/request/route.ts:38-49` | Enable Cloudflare proxy for `abangcebu.tech` OR configure Caddy to pass client IP and rate-limit logic to trust loopback `x-forwarded-for`. |
| **BLK-05** | Infrastructure | **P0 - Critical** | **Caddyfile Not Proxying to App**: Currently `/etc/caddy/Caddyfile` returns a static 503 "AbangCebuAI is being prepared for launch" and serves `www` identically without canonical 308 redirect to apex. | `/etc/caddy/Caddyfile:1-24` on EC2 | Update Caddyfile: 308 redirect `www` to `https://abangcebu.tech`, reverse proxy to `127.0.0.1:3000`, configure WebSocket headers and CrowdSec logging. |
| **BLK-06** | Email / Delivery | **P0 - Critical** | **Brevo Delivery Architecture Misunderstanding**: Codebase has zero direct Brevo SDK calls. Email delivery is delegated to **Supabase Auth GoTrue** via `signUp()` and `resetPasswordForEmail()`. | `src/app/api/auth/register/route.ts:75`, `src/app/api/auth/reset-password/request/route.ts:121` | Configure Custom SMTP in Supabase Dashboard with Brevo SMTP credentials (`smtp-relay.brevo.com:587`), verified sender, and configure Redirect URLs. |
| **BLK-07** | Network Security | **P0 - Critical** | **Docker UFW Bypass Danger**: Docker creates `DOCKER` iptables chains before UFW. If a container binds to `0.0.0.0:3000`, external traffic bypasses UFW rules. | EC2 host iptables / Docker architecture | Container port must bind strictly to `127.0.0.1:3000:3000`, ensuring all public traffic enters through Caddy on ports 80/443. |
| **SEC-01** | Security Hardening | **P1 - High** | **Silent Placeholder Supabase Fallback**: `client.ts`, `server.ts`, and `middleware.ts` fall back to `https://placeholder.supabase.co` when env vars are absent, concealing missing configuration. | `src/lib/supabase/client.ts:9-10`, `server.ts:12-13` | Add production fail-fast check throwing explicit configuration error on placeholder values. |
| **DEV-01** | Release Risk | **P1 - High** | **133 Local Working Tree Changes**: Repository has 133 modified/untracked files from previous features. Staging all dirty files risks accidental commits. | Git status (`git status -s`) | Isolate migration work in a dedicated feature branch (`feat/production-migration`) with explicit path scoping. |

---

## 3. Detailed Phase Investigation Findings

### Phase 1 and 2: Application Architecture and Localhost Scan
- **Framework:** Next.js 16.3.6 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS 4, Radix UI primitives, MapLibre GL 6.11.2.
- **Localhost Audit Findings:**
  - 0 hardcoded production URLs point to developer laptops.
  - Test suites (`vitest` and `playwright`) correctly use `http://localhost/api` and `http://127.0.0.1:3218` (isolated test server).
  - Production URL consumption is centralized in `NEXT_PUBLIC_SITE_URL`.

### Phase 3: Supabase Production Audit
- **Credential Isolation:** Verified clean. `SUPABASE_SERVICE_ROLE_KEY` is referenced solely in `src/lib/supabase/admin.ts:7`, protected by `import "server-only";`. Zero client bundle leakage.
- **Role Enforcement:** PostgreSQL RLS enabled across all 15 tables (`profiles`, `listings`, `properties`, `property_units`, `property_drafts`, `property_draft_media`, `property_submissions`, `property_reviews`, `rental_conversations`, `rental_messages`, `rental_message_attachments`, `user_blocks`, `abuse_reports`, `notifications`, `kyc_verifications`).
- **Storage Buckets:**
  - `property-images` (public, 10MB limit, jpeg/png/webp)
  - `kyc-documents` (private, landlord/admin only, 10MB limit)
  - `profile-avatars` (private, owner folder scoped, served via signed URLs)
  - `property-draft-media` (private, client RLS denied, service-role orchestrated, 300s signed URLs)
  - `rental-message-attachments` (private, conversation participants only)

### Phase 4: Brevo Email Integration Audit
- **Architecture:** Supabase Auth Delegated Architecture (GoTrue + Brevo SMTP Relay).
- **Templates Required:**
  - `Confirm your signup`: passes `emailRedirectTo: https://abangcebu.tech/auth/callback?next=/`
  - `Reset password`: passes `redirectTo: https://abangcebu.tech/auth/reset-password/callback?type=recovery&next=/reset-password`
- **DNS Prerequisites:** Brevo domain verification (SPF `include:spf.brevo.com`, DKIM, DMARC) on `abangcebu.tech`.

### Phase 6 and 7: Docker, Host and Caddy Security Audit
- **EC2 Instance:** Ubuntu 24.04.5 LTS, Kernel 6.8.0-1017-aws, 2 vCPUs, 3.74GB RAM, 25GB free disk.
- **Coexistence:** OmniRoute and Redis are NOT currently running on the AbangCebu production instance (they reside on a separate isolated instance `${OMNIROUTE_HOST}`). Zero port, network, or name collisions exist on the host.
- **Caddy:** Native systemd service (`/usr/bin/caddy`), Let's Encrypt certificates valid, CrowdSec Caddy scenario acquisition active.
- **UFW:** Ports 80, 443, and Tailscale open. Port 22 rate-limited.

### Phase 8: GitHub Actions CI/CD Audit
- **Existing Workflow:** `.github/workflows/ci.yml` runs typecheck, lint, vitest, build, and gitleaks secret-scan.
- **Missing Automation:** Needs automated GHCR image build and push, and a protected deployment job targeting GitHub Environment `production` with required approval gate and Tailscale SSH execution.

---

## 4. Audit Sign-Off

The AbangCebuAI codebase and EC2 infrastructure have been verified. The application is well-architected, secure, and ready for production migration once the identified P0 blockers are remediated under Gate 2.
