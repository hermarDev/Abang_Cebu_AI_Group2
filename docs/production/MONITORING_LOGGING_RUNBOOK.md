# Production Infrastructure Monitoring & Logging Runbook

**Target Architecture:** AWS EC2 (`${DEPLOY_HOST}`), Caddy Reverse Proxy, Docker Standalone, Next.js App Router  
**Audience:** DevOps Engineers, On-Call Responders, Security Operations  
**Scope:** Host resource telemetry, Caddy access logging, container log aggregation, CrowdSec metrics, and alert thresholds.

---

## 1. Monitoring & Observability Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       AWS EC2 Host                          │
│                                                             │
│  ┌─────────────────┐       JSON logs        ┌────────────┐  │
│  │  Caddy Proxy    │ ─────────────────────► │  CrowdSec  │  │
│  │  (Port 80/443)  │  /var/log/caddy/       │  IPS Engine│  │
│  └────────┬────────┘  access.log            └────────────┘  │
│           │ HTTP/1.1                                        │
│           ▼                                                 │
│  ┌─────────────────┐       docker logs      ┌────────────┐  │
│  │ Docker Next.js  │ ─────────────────────► │ JSON Files │  │
│  │ (127.0.0.1:3000)│   stdout/stderr        │ /var/lib/  │  │
│  └─────────────────┘                        │ docker/... │  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Linux System Telemetry: Memory, CPU, Disk, Swap, OOM  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Telemetry & Health Checks

### 2.1 Host Health & Resource Utilization

Run periodic or automated checks on host capacity:

```bash
# 1. Memory and Swap utilization (critical on 4GB instances)
free -m
# Alert condition: available memory < 500MB or swap used > 80%

# 2. CPU load and top consumer processes
uptime
top -b -n 1 | head -n 20
# Alert condition: 15-min load average > 2.0 on 2-vCPU instance

# 3. Disk space and inode utilization
df -h /
df -i /
# Alert condition: Disk usage > 85% or inodes > 80%

# 4. Kernel Out-Of-Memory (OOM) events
sudo dmesg -T | grep -i -E 'oom[- ]killer|killed process'
```

### 2.2 Container Health & Resource Bounds

The Next.js container (`abangcebu-app`) is bounded to 1.75 CPUs and 2048MB memory in `docker-compose.yml`.

```bash
# 1. Real-time resource stream
docker stats --no-stream abangcebu-app

# 2. Container health status
docker inspect --format='{{json .State.Health}}' abangcebu-app | jq .

# 3. Container restart count (detect crash loops)
docker inspect --format='{{.RestartCount}}' abangcebu-app
# Alert condition: RestartCount > 0
```

---

## 3. Log Aggregation & Rotation Policies

### 3.1 Caddy Edge Access Logs
- **Location:** `/var/log/caddy/access.log`
- **Format:** Structured JSON (includes timestamp, client IP, method, status code, latency, user agent)
- **Rotation Configuration:**
  - `roll_size`: 10MB
  - `roll_keep`: 10 archives
  - `roll_keep_for`: 720h (30 days)
- **Log Inspection Commands:**
  ```bash
  # Tail live traffic in human-readable format
  sudo tail -f /var/log/caddy/access.log | jq '{time: .ts, ip: .request.remote_ip, method: .request.method, uri: .request.uri, status: .status, duration: .duration}'

  # Identify top 10 requesting client IPs in last 10,000 requests
  sudo tail -n 10000 /var/log/caddy/access.log | jq -r '.request.headers["X-Forwarded-For"][0] // .request.remote_ip' | sort | uniq -c | sort -nr | head -n 10

  # Count 4xx and 5xx status codes
  sudo tail -n 5000 /var/log/caddy/access.log | jq -r '.status' | awk '{print int($1/100)"xx"}' | sort | uniq -c
  ```

### 3.2 Application Container Logs
- **Location:** Managed by Docker `json-file` driver.
- **Rotation Configuration:**
  - `max-size`: "10m"
  - `max-file`: "5"
- **Log Inspection Commands:**
  ```bash
  # View recent application errors and exceptions
  docker logs --tail 200 abangcebu-app | grep -iE 'error|exception|fail|rejected'

  # Stream logs live
  docker logs -f --tail 50 abangcebu-app
  ```

---

## 4. Security Incident Monitoring (CrowdSec)

CrowdSec parses Caddy logs to identify malicious traffic, web scans, credential stuffing, and SQLi/XSS probes.

```bash
# 1. View live metrics of parsed HTTP requests and dropped packets
sudo cscli metrics

# 2. Active bans and decisions list
sudo cscli decisions list

# 3. View alerts from the past 24 hours
sudo cscli alerts list --since 24h

# 4. Inspect specific alert details
sudo cscli alerts inspect <ALERT_ID>
```

---

## 5. Recommended Alert Thresholds & SLOs

| Metric | Warning Threshold | Critical Threshold | Action Plan |
|---|---|---|---|
| **Host Disk Usage** | > 75% | > 85% | Run `docker system prune -f` and clean rotated journal logs |
| **Available RAM** | < 750 MB | < 400 MB | Check container memory leaks via `docker stats`; reboot if swap saturated |
| **5xx Error Rate** | > 1% of requests / 5m | > 5% of requests / 5m | Inspect Next.js backend logs and Supabase connection pool latency |
| **P95 Latency** | > 1.5s | > 3.0s | Inspect database query execution times and external API (Groq/Photon) latencies |
| **CrowdSec Bans** | > 20 bans / hour | > 100 bans / hour | Investigate coordinated L7 DDoS or botnet attack; evaluate upstream Cloudflare WAF activation |
| **Container Restarts** | >= 1 in 1 hour | >= 3 in 1 hour | Inspect `docker logs abangcebu-app` for uncaught runtime exceptions or memory OOM |
