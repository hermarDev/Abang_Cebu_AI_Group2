# AbangCebuAI — Production Deployment & Operations Runbook

**Document Version:** 1.0.0  
**Target Host:** AWS EC2 `ubuntu@abangcebu-main` (`100.113.204.110`)  
**Audience:** Lead DevOps Engineer, Systems Administrator, Release Manager

---

## 1. Accessing the Production Host

Administrative access is strictly restricted to Tailscale. Ensure Tailscale is running on your local workstation.

```bash
# Verify Tailscale connectivity
tailscale ping 100.113.204.110

# SSH to production instance
ssh ubuntu@abangcebu-main
# Or by Tailscale IP:
ssh ubuntu@100.113.204.110
```

---

## 2. Initial Host Provisioning (One-Time Execution)

Run these commands once during initial host onboarding:

### 2.1 Enable 2GB Swap Memory
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

### 2.2 Setup Deployment Directories & Permissions
```bash
sudo mkdir -p /opt/abangcebu/secrets
sudo chown -R ubuntu:ubuntu /opt/abangcebu
chmod 755 /opt/abangcebu
chmod 700 /opt/abangcebu/secrets
```

### 2.3 Populate Production Environment (`/opt/abangcebu/.env`)
Create `/opt/abangcebu/.env` with strict permissions:
```bash
cat << 'EOF' > /opt/abangcebu/.env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_SITE_URL=https://abangcebu.tech
NEXT_PUBLIC_SUPABASE_URL=https://<your-prod-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-prod-service-role-key>
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=openai/gpt-oss-120b
NEXT_PUBLIC_MAP_STYLE_URL=/styles/osm.json
EOF

chmod 600 /opt/abangcebu/.env
```

### 2.4 Deploy Docker Compose Configuration
Place `/opt/abangcebu/docker-compose.yml`:
```yaml
version: "3.8"

services:
  abangcebu-app:
    image: ghcr.io/hermardev/abangcebuai:latest
    container_name: abangcebu-app
    restart: unless-stopped
    env_file:
      - .env
    ports:
      # Bound strictly to host loopback to prevent Docker from bypassing UFW
      - "127.0.0.1:3000:3000"
    deploy:
      resources:
        limits:
          cpus: "1.75"
          memory: 2048M
        reservations:
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
```

---

## 3. Routine Deployment & Release Procedures

### 3.1 Automated Deployment via GitHub Actions (Recommended)
1. Navigate to GitHub Repository: **Actions ➔ Deploy to Production**.
2. When the deployment reaches the approval gate, review the release commit and click **Approve and deploy**.
3. The workflow connects over Tailscale, pulls the new image digest, restarts the container, and verifies `/api/health`.

### 3.2 Manual Deployment Procedure (CLI Fallback)
```bash
ssh ubuntu@abangcebu-main
cd /opt/abangcebu

# Authenticate to GHCR (if pulling private packages)
# echo "<github_token>" | docker login ghcr.io -u <github_username> --password-stdin

# Pull new image
docker compose pull abangcebu-app

# Re-create container with zero downtime transition
docker compose up -d abangcebu-app

# Verify container status
docker compose ps
docker compose logs -f --tail=50 abangcebu-app
```

---

## 4. Health Checks & Verification

### 4.1 Internal Container Health
```bash
curl -I http://127.0.0.1:3000/api/health
# Expected: HTTP/1.1 200 OK
```

### 4.2 Public HTTPS & TLS Verification
```bash
# Apex canonical domain
curl -I https://abangcebu.tech

# WWW redirection check
curl -I https://www.abangcebu.tech
# Expected: HTTP/2 308 Permanent Redirect to https://abangcebu.tech
```

### 4.3 Caddy & CrowdSec Status
```bash
# Check Caddy status
sudo systemctl status caddy --no-pager

# Tail Caddy access logs
sudo tail -f /var/log/caddy/access.log

# Check CrowdSec bouncers and decisions
sudo cscli decisions list
sudo cscli metrics
```

---

## 5. Troubleshooting & Incident Recovery

### 5.1 Container Failing to Start / CrashLoopBackOff
```bash
# Inspect container exit code and logs
docker logs abangcebu-app --tail=100

# Common Cause: Missing environment variable
# Solution: Check /opt/abangcebu/.env keys against docs/production/ENVIRONMENT_CONFIGURATION.md
```

### 5.2 Out-Of-Memory (OOM) Situations
```bash
# Check kernel dmesg for OOM kills
sudo dmesg -T | grep -i oom

# Inspect live container memory usage
docker stats --no-stream
```

### 5.3 Rollback to Previous Release
If an unexpected bug occurs:
```bash
cd /opt/abangcebu

# Update docker-compose.yml to previous image tag:
# image: ghcr.io/hermardev/abangcebuai:sha-<previous_commit_sha>

docker compose up -d abangcebu-app
curl -f http://127.0.0.1:3000/api/health
```

### 5.4 Caddy Reload or Restart
```bash
# Validate config before restarting
sudo caddy validate --config /etc/caddy/Caddyfile

# Gracefully reload configuration without dropping connections
sudo systemctl reload caddy
```
