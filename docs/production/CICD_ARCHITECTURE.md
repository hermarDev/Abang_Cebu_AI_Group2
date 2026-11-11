# AbangCebuAI — CI/CD & Deployment Architecture

**Document Version:** 1.0.0  
**CI Engine:** GitHub Actions (`ubuntu-latest`)  
**Container Registry:** GitHub Container Registry (GHCR — `ghcr.io/hermardev/abangcebuai`)  
**Deployment Target:** AWS EC2 (`100.113.204.110` via Tailscale SSH)  
**Security Gate:** GitHub Environment `production` (Required Reviewer Approval)

---

## 1. Architectural Overview & Workflow Topology

The continuous delivery pipeline guarantees that **no untrusted or unreviewed code ever reaches production**, while automating testing, containerization, and atomic releases.

```
+-----------------------------------------------------------------------------------------+
|                                    GitHub Actions                                       |
|                                                                                         |
|  [Pull Request / Push to Branch]                                                        |
|                 |                                                                       |
|                 v                                                                       |
|        +-----------------+                                                              |
|        |     Job 1:      |                                                              |
|        |   CI Pipeline   |  --> [Lint, Typecheck, Vitest, Standalone Build, Gitleaks]  |
|        +-----------------+                                                              |
|                 |                                                                       |
|  [Merge to main / Tag push]                                                             |
|                 |                                                                       |
|                 v                                                                       |
|        +-----------------+                                                              |
|        |     Job 2:      |                                                              |
|        | Image Publish   |  --> [Docker Buildx -> Push to ghcr.io with SHA & Tag]       |
|        +-----------------+                                                              |
|                 |                                                                       |
|                 v                                                                       |
|     =======================                                                             |
|     ||   APPROVAL GATE   ||  --> Required Reviewer: @hermarDev (Manual UI Approval)     |
|     =======================                                                             |
|                 |                                                                       |
|                 v                                                                       |
|        +-----------------+                                                              |
|        |     Job 3:      |  --> [Tailscale Action -> SSH 100.113.204.110]               |
|        |  CD Production  |  --> [Pull Image -> Compose Update -> Health Check]          |
|        +-----------------+                                                              |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v (Private WireGuard mesh)
                   +-----------------------------------------------+
                   |             AWS EC2 (abangcebu-main)          |
                   |                                               |
                   |  +--------------------+   +----------------+  |
                   |  |   Caddy (Port 443) |-->| Docker (3000)  |  |
                   |  +--------------------+   +----------------+  |
                   +-----------------------------------------------+
```

---

## 2. Pipeline Jobs Specification

### 2.1 Job 1: Quality Gate & Secret Scan (`ci`)
- **Triggers:** Pull requests targeting `main`, pushes to feature branches.
- **Actions:**
  1. `actions/checkout@v4` with `persist-credentials: false`.
  2. `pnpm/action-setup@v4` with pnpm version pinned to `10.33.0`.
  3. `actions/setup-node@v4` with Node 22 and pnpm cache.
  4. `pnpm install --frozen-lockfile`.
  5. `pnpm exec tsc --noEmit` (Static typecheck).
  6. `pnpm lint --max-warnings=0` (ESLint 9).
  7. `pnpm test` (Vitest unit & integration test suite).
  8. `pnpm run build` (Next.js standalone compilation check).
  9. `gitleaks/gitleaks-action@v3` (Historical secret scanning).

### 2.2 Job 2: GHCR Image Build & Publish (`publish`)
- **Triggers:** Pushes to `main` branch or release tags (`v*`).
- **Permissions:** `contents: read`, `packages: write`.
- **Image Metadata:**
  - Base Image: `ghcr.io/hermardev/abangcebuai`
  - Tags:
    - `ghcr.io/hermardev/abangcebuai:sha-<commit_sha>` (Immutable, traceable)
    - `ghcr.io/hermardev/abangcebuai:latest` (Pointers only; never used for rollback)
    - `ghcr.io/hermardev/abangcebuai:<semver_tag>` (When tagged)
- **Caching:** Uses GitHub Actions Cache (`type=gha`) for fast multi-stage caching.

### 2.3 Job 3: Protected Production Deployment (`deploy`)
- **Environment:** `production` (Enforces mandatory human reviewer approval in GitHub UI).
- **Permissions:** `contents: read`, `packages: read`.
- **Security Boundaries:**
  - Untrusted PRs cannot trigger this job.
  - SSH to EC2 is restricted to the private Tailscale interface (`100.113.204.110`). No public SSH port is exposed.
- **Deployment Protocol:**
  1. Authenticate runner to Tailscale mesh via `tailscale/github-action@v2`.
  2. SSH into `ubuntu@100.113.204.110` using private key.
  3. Execute automated rollout script on EC2:
     ```bash
     cd /opt/abangcebu
     echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin
     docker compose pull abangcebu-app
     docker compose up -d --remove-orphans abangcebu-app
     ```
  4. Perform post-deploy health check:
     ```bash
     curl --fail --retry 5 --retry-delay 3 http://127.0.0.1:3000/api/health || exit 1
     ```

---

## 3. Atomic Rollback Strategy

In the event of an undetected runtime regression after deployment:

### 3.1 Fast Image Rollback (<60 seconds)
Every deployment references an immutable commit SHA tag. To roll back to the previously known good release:
1. In `/opt/abangcebu/docker-compose.yml`, update `image:` to the previous known good tag:
   ```yaml
   image: ghcr.io/hermardev/abangcebuai:sha-<previous_good_sha>
   ```
2. Restart container:
   ```bash
   docker compose up -d abangcebu-app
   ```
3. Verify recovery via `/api/health`.

### 3.2 GitHub Actions Redeploy
Alternatively, navigate to GitHub Actions ➔ Select the workflow run corresponding to the target commit ➔ Click **Re-run jobs** under the `production` deployment step.

---

## 4. Maintenance & Coexistence with OmniRoute

- Host `abangcebu-main` (`100.113.204.110`) does not host OmniRoute/Redis (those run on `omniroute-ec2` `100.92.152.17`).
- All AbangCebu Docker resources use project name `abangcebu` and network `abangcebu_internal`.
- Caddy is managed as a host systemd service and isolates reverse proxy routing.
