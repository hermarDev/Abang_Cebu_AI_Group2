# AbangCebuAI — Prioritized Production Migration Plan

**Document Version:** 1.0.0  
**Target Architecture:** AWS EC2 (`t3.medium`), Docker Standalone, Caddy Reverse Proxy, CrowdSec IPS, Supabase, Brevo SMTP  
**Approval Gate:** Gate 1 (Investigation & Plan Presentation)

---

## 1. Migration Phasing & Priority Matrix

| Phase | Title | Priority | Primary Responsible Agent | Complexity | Dependencies |
|---|---|---|---|---|---|
| **Phase A** | Host System Preparation & Swap Provisioning | **P0 - Blocker** | Architect | Low | None (Pre-deploy EC2 config) |
| **Phase B** | Docker Standalone Optimization & Multi-Stage Build | **P0 - Blocker** | Builder / Architect | Medium | Phase A |
| **Phase C** | Application Environment & URL Configuration | **P0 - Blocker** | Investigator / Builder | Low | Phase B |
| **Phase D** | Caddy Reverse Proxy, Canonical Redirect & CrowdSec | **P0 - Blocker** | Architect | Medium | Phase A |
| **Phase E** | Supabase & Brevo SMTP Production Configuration | **P0 - Blocker** | Investigator / DBA | Medium | User manual dashboard setup |
| **Phase F** | GitHub Actions CI/CD Pipeline & GHCR Publishing | **P0 - Blocker** | Architect | Medium | Phase B |
| **Phase G** | Protected Production Deployment & Health Verification | **P0 - Blocker** | Release Manager | High | Phase D, E, F |
| **Phase H** | Post-Deploy End-to-End Verification & Monitoring | **P1 - Critical** | QA Specialist | Medium | Phase G |

---

## 2. Phase-by-Phase Implementation Specifications

### Phase A: Host System Preparation & Swap Provisioning
- **Objective:** Prevent kernel OOM panics on the `t3.medium` EC2 instance by establishing swap memory and directory structure.
- **Tasks:**
  1. SSH to `ubuntu@${DEPLOY_HOST}` over Tailscale.
  2. Verify existing memory and provision 2GB swapfile:
     ```bash
     sudo fallocate -l 2G /swapfile
     sudo chmod 600 /swapfile
     sudo mkswap /swapfile
     sudo swapon /swapfile
     echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
     ```
  3. Verify directory permissions on `/opt/abangcebu`:
     ```bash
     sudo mkdir -p /opt/abangcebu/secrets
     sudo chown -R ubuntu:ubuntu /opt/abangcebu
     chmod 755 /opt/abangcebu
     chmod 700 /opt/abangcebu/secrets
     ```
- **Acceptance Criteria:** `free -h` reports `Swap: 2.0Gi Total`, `/opt/abangcebu` is writable by user `ubuntu`.

---

### Phase B: Docker Standalone Optimization & Multi-Stage Build
- **Objective:** Produce a minimal, secure Docker container image (<220MB) using Next.js standalone output.
- **Tasks:**
  1. Patch `next.config.ts` to include `output: "standalone"`.
  2. Create production multi-stage `Dockerfile`:
     - **Stage 1 (deps):** `node:22-alpine` with `libc6-compat`, install dependencies via committed `pnpm-lock.yaml`.
     - **Stage 2 (builder):** Run `pnpm run build` with public build args (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://abangcebu.tech`).
     - **Stage 3 (runner):** Minimal Alpine image, non-root user `nextjs:nodejs` (UID 1001), copy `.next/standalone`, `.next/static`, and `public`.
     - **Healthcheck:** `curl -f http://localhost:3000/api/health || exit 1`.
  3. Create `.dockerignore` excluding `.git`, `node_modules`, `.next`, `.env*`, and test directories.
  4. Create `docker-compose.yml` in `/opt/abangcebu`:
     - Service `abangcebu-app` binding strictly to `127.0.0.1:3000:3000`.
     - Container memory limit: 2048M, reservation: 512M.
     - Restart policy: `unless-stopped`.
- **Acceptance Criteria:** Local `docker build` succeeds, produces image <250MB, container boots cleanly and responds 200 on `/api/health`.

---

### Phase C: Application Environment & URL Configuration
- **Objective:** Eliminate localhost references and ensure production rate-limiting functions seamlessly behind reverse proxy.
- **Tasks:**
  1. Prepare redacted production environment blueprint (`.env.production.example`).
  2. In `src/server/rate-limit.ts`, audit client IP resolution:
     - When behind Caddy on EC2, trust `x-forwarded-for` from loopback `127.0.0.1` while preserving `cf-connecting-ip` if Cloudflare is fronted.
  3. Harden Supabase client initialization in `src/lib/supabase/*.ts` to fail fast with an explicit error in production if `NEXT_PUBLIC_SUPABASE_URL` is unset or contains `placeholder.supabase.co`.
- **Acceptance Criteria:** Password reset and registration endpoints resolve client IP correctly and generate valid `https://abangcebu.tech` URLs.

---

### Phase D: Caddy Reverse Proxy, Canonical Redirect & CrowdSec
- **Objective:** Configure Caddy to serve `abangcebu.tech` with TLS, redirect `www` to apex, proxy to container on port 3000, and feed access logs to CrowdSec.
- **Tasks:**
  1. Update `/etc/caddy/Caddyfile`:
     ```caddy
     www.abangcebu.tech {
         redir https://abangcebu.tech{uri} permanent
     }

     abangcebu.tech {
         log {
             output file /var/log/caddy/access.log {
                 roll_size 10mb
                 roll_keep 10
                 roll_keep_for 720h
             }
             format json
         }

         # Security Headers
         header {
             Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
             X-Content-Type-Options "nosniff"
             X-Frame-Options "DENY"
             Referrer-Policy "strict-origin-when-cross-origin"
         }

         # Reverse Proxy to Docker Container
         reverse_proxy 127.0.0.1:3000 {
             header_up Host {host}
             header_up X-Real-IP {remote_host}
             header_up X-Forwarded-For {remote_host}
             header_up X-Forwarded-Proto {scheme}
         }
     }
     ```
  2. Validate configuration: `sudo caddy validate --config /etc/caddy/Caddyfile`.
  3. Reload Caddy: `sudo systemctl reload caddy`.
- **Acceptance Criteria:** `curl -I https://www.abangcebu.tech` returns HTTP 308 redirecting to `https://abangcebu.tech`. `curl -I https://abangcebu.tech` proxies to 127.0.0.1:3000.

---

### Phase E: Supabase & Brevo SMTP Production Configuration
- **Objective:** Configure production authentication settings, allowed redirect URLs, and Brevo SMTP relay in Supabase Dashboard.
- **Tasks (Manual User Actions):**
  1. **Site URL:** Set to `https://abangcebu.tech` in Supabase Dashboard (Authentication ➔ URL Configuration).
  2. **Redirect URLs:** Add:
     - `https://abangcebu.tech/auth/callback`
     - `https://abangcebu.tech/auth/reset-password/callback`
  3. **Custom SMTP (Brevo):** Configure in Supabase Dashboard (Authentication ➔ SMTP Settings):
     - Host: `smtp-relay.brevo.com`
     - Port: `587`
     - Sender: `noreply@abangcebu.tech` (must match verified Brevo domain)
     - Username & API Key password from Brevo account.
- **Acceptance Criteria:** Test registration email and password reset email successfully deliver through Brevo and contain valid `https://abangcebu.tech` action URLs.

---

### Phase F: GitHub Actions CI/CD Pipeline & GHCR Publishing
- **Objective:** Automate quality checks, GHCR image builds, and controlled deployments.
- **Tasks:**
  1. Update `.github/workflows/ci.yml` or add `deploy.yml`:
     - **Job 1 (ci):** Lint, typecheck, vitest, build.
     - **Job 2 (publish):** Trigger on release tag / approved main commit. Build Docker image with buildx cache, push to `ghcr.io/hermardev/abangcebuai:<sha>` and `latest`.
     - **Job 3 (deploy):** Protected by GitHub Environment `production` (requires manual reviewer approval). Uses Tailscale Action to connect to `${DEPLOY_HOST}`, pulls new image digest, updates compose, verifies `/api/health`.
- **Acceptance Criteria:** Commits to feature branches run CI only. Merges to main trigger image publication. Deployments execute only after explicit approval in GitHub UI.

---

### Phase G: Protected Production Deployment & Health Verification
- **Objective:** Deploy the verified container to `${DEPLOY_HOST}` and verify service health.
- **Tasks:**
  1. Trigger production deployment through approved workflow (or manual runbook during initial go-live).
  2. Execute `docker compose pull && docker compose up -d`.
  3. Verify container health: `curl -f http://127.0.0.1:3000/api/health`.
  4. Verify public HTTPS: `curl -I https://abangcebu.tech`.
- **Acceptance Criteria:** Container status is `healthy`, HTTPS response is 200 OK.

---

### Phase H: Post-Deploy End-to-End Verification & Monitoring
- **Objective:** Ensure end-to-end functionality across all user roles.
- **Tasks:**
  1. Verify Visitor view: map tiles render, search chips work, property bottom sheet opens.
  2. Verify Auth: login with authorized test credentials, check password toggle (Eye/EyeOff), check role redirection.
  3. Verify Renter & Landlord dashboards.
  4. Inspect Caddy logs: `/var/log/caddy/access.log`.
  5. Inspect CrowdSec metrics: `sudo cscli metrics`.
- **Acceptance Criteria:** Zero 5xx errors, map and auth operational, CrowdSec successfully monitoring traffic.
