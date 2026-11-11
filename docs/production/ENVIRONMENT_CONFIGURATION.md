# AbangCebuAI — Production Environment Configuration Guide

**Document Version:** 1.0.0  
**Target Environment:** AWS EC2 (`${DEPLOY_HOST}`), GitHub Actions CI/CD  
**Security Classification:** Redacted Reference Specification (Contains NO actual secret values)

---

## 1. Environment Variable Architecture & Boundaries

AbangCebuAI strictly adheres to the principle of least privilege regarding runtime configuration. Variables are split into three isolated tiers:

1. **Client-Exposed Public Variables (`NEXT_PUBLIC_*`):**
   - Inlined directly into browser JavaScript bundles at build time.
   - Must contain only non-sensitive configuration (public endpoints, public anon keys subject to RLS).
   - **Rule:** Never place database passwords, master keys, or private API tokens in `NEXT_PUBLIC_*`.

2. **Server-Side Confidential Secrets:**
   - Evaluated strictly in the Node.js server runtime, Server Components, and API Route Handlers.
   - Guarded in source code with `import "server-only";` (e.g. `src/lib/supabase/admin.ts`).
   - Injected into Docker containers via runtime environment files or orchestration secrets.

3. **CI/CD Deployment & Infrastructure Secrets:**
   - Injected into GitHub Actions runners to authorize container image publishing (GHCR) and private server SSH orchestration (Tailscale).

---

## 2. Exhaustive Environment Variables Inventory

| Variable Name | Required? | Tier / Scope | Sensitivity | Default / Dev Value | Production Target Value | Codebase Usage Location |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Client & Server | Public Config | `https://placeholder.supabase.co` | `https://<prod-id>.supabase.co` | `src/lib/supabase/*.ts`, `src/app/api/assistant/route.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client & Server | Public Key (RLS-gated) | `placeholder-anon-key` | `<prod-supabase-anon-key>` | `src/lib/supabase/*.ts` |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Client & Server | Public Config | `http://localhost:3000` | `https://abangcebu.tech` | `src/app/api/auth/reset-password/request/route.ts:98` |
| `NEXT_PUBLIC_MAP_STYLE_URL` | No | Client | Public Config | `/styles/osm.json` | `/styles/osm.json` (or self-hosted) | `src/components/map/MapCanvas.tsx` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server Only | **Critical Secret** | None (dev offline) | `<prod-service-role-key>` | `src/lib/supabase/admin.ts:7` (`server-only`) |
| `GROQ_API_KEY` | **Yes** (if AI active) | Server Only | **Secret** | `your-groq-api-key` | `<groq-api-key>` | `src/app/api/assistant/route.ts:126` |
| `GROQ_MODEL` | No | Server Only | Public Config | `openai/gpt-oss-120b` | `openai/gpt-oss-120b` | `src/app/api/assistant/route.ts:148` |
| `GOOGLE_MAPS_API_KEY` | No (optional tier) | Server Only | **Secret** | None | `<google-maps-api-key>` | `src/server/places/reverse-places.ts:104` |
| `NODE_ENV` | **Yes** | System | System Flag | `development` | `production` | Core runtime (Next.js & Node) |
| `PORT` | No | Container System | System Flag | `3000` | `3000` | Node server listen port |
| `HOSTNAME` | No | Container System | System Flag | `0.0.0.0` | `0.0.0.0` | Container bind address |

---

## 3. GitHub Actions Environment Configuration

Configure within GitHub Repository Settings: **Settings ➔ Environments ➔ New environment ➔ `production`**.

### 3.1 Environment Protection Rules
- **Required Reviewers:** Enable, assign `@hermarDev`.
- **Deployment Branches:** Restrict to `main` branch only.
- **Prevent Self-Review:** Enabled if multi-maintainer.

### 3.2 GitHub Environment Secrets
These secrets must be added under Environment `production`:

| Secret Name | Purpose | Example / Format |
|---|---|---|
| `SSH_PRIVATE_KEY` | Ed25519 or RSA private key for `ubuntu@${DEPLOY_HOST}` | PEM format private key |
| `TAILSCALE_AUTHKEY` | Ephemeral Tailscale auth key with tags `tag:ci` | `tskey-auth-...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected into production EC2 `.env` | `eyJhbGciOi...` |
| `GROQ_API_KEY` | Injected into production EC2 `.env` | `gsk_...` |

### 3.3 GitHub Environment Variables
These variables must be added under Environment `production`:

| Variable Name | Purpose | Value |
|---|---|---|
| `DEPLOY_HOST` | Tailscale private hostname or IP of EC2 | `${DEPLOY_HOST}` (e.g. `100.x.y.z`) |
| `DEPLOY_PATH` | Path on EC2 for docker-compose and app state | `/opt/abangcebu` |
| `APP_URL` | Canonical HTTPS public web application URL | `https://abangcebu.tech` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public endpoint for Supabase | `https://<prod-id>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Public anonymous key for Supabase | `<anon-jwt-token>` |

---

## 4. EC2 Runtime Environment Template (`/opt/abangcebu/.env`)

On the EC2 host at `/opt/abangcebu/.env` (owned by `ubuntu:ubuntu`, permissions `0600`):

```dotenv
# ==============================================================================
# AbangCebuAI Production Runtime Configuration
# Path: /opt/abangcebu/.env (chmod 600, root/ubuntu accessible only)
# ==============================================================================

NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Canonical Public Origin
NEXT_PUBLIC_SITE_URL=https://abangcebu.tech

# Supabase Production Project
NEXT_PUBLIC_SUPABASE_URL=https://<your-production-supabase-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-production-anon-key>

# Supabase Service Role Key (Server-Only Master Key)
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>

# AI Assistant Configuration
GROQ_API_KEY=<your-production-groq-api-key>
GROQ_MODEL=openai/gpt-oss-120b

# Map Styling
NEXT_PUBLIC_MAP_STYLE_URL=/styles/osm.json

# Optional: Google Maps Geocoding Tier
# GOOGLE_MAPS_API_KEY=
```
