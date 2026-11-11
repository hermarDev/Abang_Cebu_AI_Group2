# Caddy Reverse Proxy & Edge Hardening Guide

**Target Environment:** AWS EC2 Production (`${DEPLOY_HOST}`)  
**Domain:** `https://abangcebu.tech` (apex) with `www.abangcebu.tech` canonical 308 redirect  
**Backend:** Next.js Standalone container on `127.0.0.1:3000` (`abangcebu-app`)  
**Security Integration:** CrowdSec IPS log parser + systemd service  

---

## 1. Overview & Architecture

Caddy serves as the public edge gateway on ports `80` (HTTP) and `443` (HTTPS).

```
[Public Visitor] ──── HTTPS (80/443) ───► [Caddy Reverse Proxy]
                                                │
                                    (Loopback 127.0.0.1:3000)
                                                ▼
                                    [Next.js Docker Container]
```

### Key Security Responsibilities:
1. **Automated TLS:** Automatic ACME management via Let's Encrypt / ZeroSSL with OCSP stapling and HTTP-to-HTTPS redirect.
2. **Canonical Host Redirect:** Permanent 308 redirection from `www.abangcebu.tech` to `https://abangcebu.tech`.
3. **Anti-Spoofing Header Normalization:** Explicitly overwriting `X-Forwarded-For` and `X-Real-IP` with `{remote_host}` (the actual TCP socket address) so attackers cannot bypass application rate limiters by injecting synthetic IP headers.
4. **Edge Security Headers:** Enforces `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and strips the `Server` identity banner.
5. **CrowdSec Intrusion Prevention:** Emits structured JSON access logs to `/var/log/caddy/access.log` with size-based rotation (`10mb`, 10 archives, 720h retention) parsed by CrowdSec `caddy-logs` scenario.

---

## 2. Tracked Caddyfile Specification

The production Caddyfile is tracked at `Caddyfile` in the repository root and deployed to `/etc/caddy/Caddyfile` on the EC2 host.

```caddy
{
    email noreply@abangcebu.tech
}

# 1. Canonical Redirect: www to apex domain
www.abangcebu.tech {
    redir https://abangcebu.tech{uri} permanent
}

# 2. Main Production Site
abangcebu.tech {
    log {
        output file /var/log/caddy/access.log {
            roll_size 10mb
            roll_keep 10
            roll_keep_for 720h
        }
        format json
    }

    # Edge HTTP Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=(self)"
        -Server
    }

    # Strict Reverse Proxy to Next.js container bound to 127.0.0.1:3000
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
        header_up Connection {>Connection}
        header_up Upgrade {>Upgrade}

        transport http {
            response_header_timeout 60s
            dial_timeout 5s
        }
    }
}
```

---

## 3. Host Installation & Update Runbook

When deploying or modifying the Caddyfile on the EC2 production instance:

```bash
# 1. Connect to production host via Tailscale SSH
ssh ubuntu@${DEPLOY_HOST}

# 2. Backup existing Caddyfile
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%Y%m%d%H%M%S)

# 3. Copy tracked Caddyfile from repository checkout
sudo cp /opt/abangcebu/Caddyfile /etc/caddy/Caddyfile
sudo chown root:root /etc/caddy/Caddyfile
sudo chmod 644 /etc/caddy/Caddyfile

# 4. Validate Caddyfile syntax (MUST pass with 'Valid configuration')
sudo caddy validate --config /etc/caddy/Caddyfile

# 5. Reload Caddy with zero downtime
sudo systemctl reload caddy

# 6. Verify service health and active listening ports
sudo systemctl status caddy --no-pager
sudo ss -tulpn | grep -E ':80|:443'
```

---

## 4. Verification & Validation Tests

Run from an external workstation to verify edge security controls:

### Test 1: Verify Canonical WWW to Apex 308 Redirect
```bash
curl -sI https://www.abangcebu.tech | head -n 5
# Expected:
# HTTP/2 308
# location: https://abangcebu.tech/
```

### Test 2: Verify Edge Security Headers
```bash
curl -sI https://abangcebu.tech | grep -iE 'strict-transport|x-content-type|x-frame|referrer|permissions|server'
# Expected:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-content-type-options: nosniff
# x-frame-options: DENY
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: camera=(), microphone=(), geolocation=(self)
# (Server header must be absent or masked)
```

### Test 3: Verify Anti-Spoofing Header Overwrite
Send a probe request with synthetic `X-Forwarded-For` and `X-Real-IP`:
```bash
curl -sI -H "X-Forwarded-For: 1.2.3.4" -H "X-Real-IP: 5.6.7.8" https://abangcebu.tech/api/health
# Caddy overwrites the header so Next.js rate limiters observe the real caller IP, not 1.2.3.4.
```

### Test 4: Verify CrowdSec Log Ingestion
```bash
sudo tail -n 5 /var/log/caddy/access.log | jq .
sudo cscli metrics | grep -A 5 caddy
```
