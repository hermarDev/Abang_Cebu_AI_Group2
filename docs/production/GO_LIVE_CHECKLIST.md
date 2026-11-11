# AbangCebuAI — Production Go-Live Checklist

**Document Version:** 1.0.0  
**Target Environment:** AWS EC2 Production (`https://abangcebu.tech`)  
**Approval Gate:** Gate 3 (Pre-Release Sign-Off)

---

## 1. Phase 1: Infrastructure & Host Hardening Checks

- [ ] **EC2 Host Resources:**
  - [ ] 2GB swap space provisioned on `/swapfile` (`free -h` verifies swap available).
  - [ ] Root disk `/dev/root` has at least 15GB free storage (`df -h`).
- [ ] **Docker Daemon Configuration:**
  - [ ] Docker service is active and enabled on boot (`systemctl is-active docker`).
  - [ ] User `ubuntu` is in the `docker` group (`id ubuntu`).
  - [ ] Container memory limits enforced (2048MB cap in `docker-compose.yml`).
  - [ ] Port 3000 binds strictly to `127.0.0.1:3000:3000` (zero public port exposure).
- [ ] **Caddy Reverse Proxy & TLS:**
  - [ ] Valid Let's Encrypt certificates issued for `abangcebu.tech` and `www.abangcebu.tech`.
  - [ ] `www.abangcebu.tech` returns 308 redirecting to `https://abangcebu.tech`.
  - [ ] Security headers active: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
  - [ ] WebSocket and HTTP/2 and HTTP/3 support active.
- [ ] **CrowdSec Intrusion Prevention:**
  - [ ] Caddy access log `/var/log/caddy/access.log` acquired by CrowdSec.
  - [ ] `cs-firewall-bouncer` active and dropping malicious scanners at iptables level.
- [ ] **Host Firewall (UFW):**
  - [ ] Only ports 80 (HTTP), 443 (HTTPS), and Tailscale traffic permitted from public internet.
  - [ ] Port 22 rate-limited or restricted to Tailscale.

---

## 2. Phase 2: Security & Configuration Checks

- [ ] **Zero Hardcoded Secrets in Git:**
  - [ ] Gitleaks secret scan passed in CI with 0 leaked secrets.
  - [ ] `.env*` and `.jira*` files verified in `.gitignore`.
  - [ ] Client bundles inspected: no `SUPABASE_SERVICE_ROLE_KEY` or admin keys inlined.
- [ ] **Production Environment Variables (`/opt/abangcebu/.env`):**
  - [ ] `NODE_ENV=production` set.
  - [ ] `NEXT_PUBLIC_SITE_URL=https://abangcebu.tech` configured (HTTPS required).
  - [ ] Production Supabase URL and anon key populated.
  - [ ] Production `SUPABASE_SERVICE_ROLE_KEY` populated with strict `chmod 600`.
  - [ ] Production `GROQ_API_KEY` populated.
- [ ] **Fail-Fast Configuration:**
  - [ ] Application throws an immediate startup error if `placeholder.supabase.co` is detected.

---

## 3. Phase 3: Supabase & Database Integrity Checks

- [ ] **Database Schema & Migrations:**
  - [ ] All migrations up to date via `supabase migration list`.
  - [ ] Row Level Security (RLS) enabled on all 15 tables.
  - [ ] Public reads revoked on `public.profiles` (`auth.uid() = id` strictly enforced).
  - [ ] Admin RPCs (`public.is_admin()`) verified with `SECURITY DEFINER SET search_path = public`.
- [ ] **Storage Buckets:**
  - [ ] All 5 storage buckets created: `property-images`, `kyc-documents`, `profile-avatars`, `property-draft-media`, `rental-message-attachments`.
  - [ ] `property-draft-media` RLS policy denies all client access (service-role managed only).
- [ ] **Supabase Auth URL Allowlist:**
  - [ ] Site URL set to `https://abangcebu.tech`.
  - [ ] Allowed redirect URLs contain `https://abangcebu.tech/auth/callback` and `https://abangcebu.tech/auth/reset-password/callback`.

---

## 4. Phase 4: Brevo Email Delivery Checks

- [ ] **Domain Verification:**
  - [ ] `abangcebu.tech` authenticated in Brevo with valid SPF, DKIM, and DMARC records.
- [ ] **Supabase SMTP Settings:**
  - [ ] Custom SMTP enabled with `smtp-relay.brevo.com:587`.
  - [ ] Sender address set to `noreply@abangcebu.tech` with sender name `AbangCebu`.
- [ ] **Transactional Email Verification:**
  - [ ] Test registration email delivers and includes `https://abangcebu.tech/auth/callback...` URL.
  - [ ] Test password reset email delivers and includes `https://abangcebu.tech/auth/reset-password/callback...` URL.
  - [ ] Zero emails contain `localhost:3000`.

---

## 5. Phase 5: Functional & UX Verification Checks

- [ ] **Visitor Experience:**
  - [ ] MapLibre GL map renders smoothly with Cebu rental pins.
  - [ ] Content-width quick-filter chips filter properties properly.
  - [ ] Rental details bottom sheet opens, displays photos, amenities, and landmark distance.
  - [ ] 1-tap Light/Dark theme toggle and System OS preference sync work without white flash.
- [ ] **Authentication Flows:**
  - [ ] Login dialog hugs content (no excess whitespace).
  - [ ] Password visibility toggle (Eye/EyeOff icon) functions properly.
  - [ ] Renter vs Landlord role selector active during registration (never on login).
  - [ ] Password strength checklist validates length, uppercase, lowercase, numbers, and symbols in real-time.
  - [ ] Logout invalidates session and clears all `sb-*-auth-token` cookies.
- [ ] **Renter Features:**
  - [ ] Favorites can be added and removed with instant UI updates.
  - [ ] Two-way messaging with landlords works with real-time updates.
  - [ ] Photo attachments upload securely with MIME and magic byte validation.
- [ ] **Landlord Features:**
  - [ ] Landlord Workspace displays portfolio summary, draft listings, and published units.
  - [ ] Listing submission flow works with step-by-step progress retention.
- [ ] **Admin Portal:**
  - [ ] Direct `/admin/*` visits by unauthenticated users or non-admins return 404 (prevents portal enumeration).
  - [ ] Admin reviews and moderates property submissions and permits.

---

## 6. Phase 6: Rollback & Disaster Recovery Readiness

- [ ] **Container Rollback Tested:**
  - [ ] Known-good Docker image digest recorded.
  - [ ] Rollback procedure tested: modifying `image:` in `docker-compose.yml` and running `docker compose up -d` recovers service within 60 seconds.
- [ ] **Health Monitoring:**
  - [ ] `/api/health` returns HTTP 200 with database connectivity confirmation.
  - [ ] Caddy access log rotation verified (10MB roll size, 10 archives retained).
- [ ] **Emergency Contact:**
  - [ ] Lead DevOps Engineer / Systems Administrator on standby during rollout.

---

## Final Sign-Off

| Role | Name | Decision | Date |
|---|---|---|---|
| **Lead DevOps Engineer** | Hermar Centillas | [ ] Approved [ ] Blocked | 2026-11-11 |
| **Release Manager** | Hermar Centillas | [ ] Approved [ ] Blocked | 2026-11-11 |
