# EC2 Host Security & Port Exposure Runbook

**Target Host:** AWS EC2 Production (`${DEPLOY_HOST}`)  
**Audience:** Security Engineers, Systems Administrators, SREs  
**Scope:** Operating system baseline, listening sockets, firewall rules, Docker iptables integration, and Tailscale Zero-Trust access.

---

## 1. Threat Model & Network Perimeter Architecture

AbangCebu AI enforces a **zero-trust, minimal exposure perimeter** on AWS EC2:

1. **Public Ingress:** Restricted exclusively to TCP ports `80` (HTTP) and `443` (HTTPS) handled by Caddy.
2. **Administrative Ingress:** Public SSH (TCP port 22) is blocked. All terminal management and CI/CD rollouts transit the encrypted Tailscale WireGuard mesh (`tailscale0`).
3. **Application Loopback Binding:** The Next.js container binds strictly to host loopback `127.0.0.1:3000:3000`. This prevents Docker from creating NAT forwarding rules in the `DOCKER` iptables chain that could expose port `3000` to `0.0.0.0`.
4. **Inter-Host Isolation:** Coexistence with other projects (e.g. OmniRoute on separate instances) is strictly partitioned; no shared ports, caches, or Docker networks exist.

---

## 2. On-Host Security Baseline Verification

Execute these commands when auditing or onboarding an EC2 instance:

### 2.1 Listening Socket Audit (`ss`)
Verify that no development, database, or management ports listen on `0.0.0.0` or `::`:

```bash
# Display all listening TCP and UDP sockets with owning process IDs
sudo ss -tulpn
```

**Expected Healthy State:**
- `0.0.0.0:80` and `[::]:80` — Caddy HTTP
- `0.0.0.0:443` and `[::]:443` — Caddy HTTPS
- `127.0.0.1:3000` — Docker proxy / Next.js container (loopback only!)
- `100.x.y.z:22` or `tailscale0` binding — SSH daemon or Tailscale SSH
- `41641/udp` — Tailscale WireGuard encapsulation

**FAIL Condition:** Any entry showing `0.0.0.0:3000`, `0.0.0.0:5432`, `0.0.0.0:6379`, or `0.0.0.0:22`.

### 2.2 Host Firewall Audit (`ufw`)
Inspect active firewall rules and default policies:

```bash
sudo ufw status verbose
```

**Expected Configuration:**
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
Anywhere on tailscale0     ALLOW IN    Anywhere
80/tcp (v6)                ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)
Anywhere (v6) on tailscale0 ALLOW IN    Anywhere (v6)
```

### 2.3 Docker Port & Container Inspection
Confirm container network runtime bindings:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
```

**Expected Port Output:**
```
127.0.0.1:3000->3000/tcp
```
*(Must NEVER display `0.0.0.0:3000->3000/tcp`)*

### 2.4 IPTables Chain Verification
Inspect Docker-generated firewall chains to confirm no external NAT bypass exists:

```bash
sudo iptables -t nat -L DOCKER -n -v
```

Confirm that the destination address for port `3000` is bound to `127.0.0.1` and not accepted indiscriminately from external interfaces `eth0` / `ens5`.

---

## 3. Tailscale Zero-Trust & SSH Hardening

### 3.1 SSH Daemon Hardening (`/etc/ssh/sshd_config.d/99-hardened.conf`)
Ensure administrative SSH adheres to CIS Benchmarks:

```ini
# Disable password authentication; require SSH keys exclusively
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no

# Disable root login
PermitRootLogin no

# Bind SSH strictly to the Tailscale interface (or use Tailscale SSH)
# ListenAddress 100.x.y.z
# ListenAddress 127.0.0.1

# Restrict idle timeouts
ClientAliveInterval 300
ClientAliveCountMax 2

# Modern cryptographic algorithms only
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com
```

### 3.2 Tailscale ACLs & Tag Isolation
The production node belongs to tag `tag:production-host`. In the Tailscale Admin Console:
- Only CI/CD runners with `tag:ci` and authorized engineers in group `group:devops` possess SSH access permissions to `tag:production-host`.
- Unauthenticated devices or contractors on other tags are denied network connectivity.

---

## 4. CrowdSec Host Intrusion Prevention System (IPS)

CrowdSec monitors security logs and blocks brute-force or scanning attempts at the firewall level via `cs-firewall-bouncer`.

```bash
# 1. View active CrowdSec decisions (blocked IPs)
sudo cscli decisions list

# 2. View metrics and parsed event counts
sudo cscli metrics

# 3. Check status of CrowdSec and firewall bouncer services
sudo systemctl status crowdsec --no-pager
sudo systemctl status crowdsec-firewall-bouncer --no-pager

# 4. View recently triggered alerts
sudo cscli alerts list -l 20
```

---

## 5. Security Incident & Remediation Playbook

### Incident: Unexpected Public Port Exposed
1. Immediately stop the offending process or container:
   ```bash
   docker stop <container_name>
   # or
   sudo kill -9 <PID>
   ```
2. Verify socket closure:
   ```bash
   sudo ss -tulpn | grep <port>
   ```
3. Update `docker-compose.yml` to specify `127.0.0.1:<port>:<port>` and re-launch.

### Incident: Rogue SSH Login Attempt Detected
1. Check authentication log:
   ```bash
   sudo journalctl -u ssh -n 50 --no-pager
   ```
2. Verify UFW rules block port 22 on public interfaces:
   ```bash
   sudo ufw delete allow 22/tcp
   sudo ufw status verbose
   ```
3. Manually ban offending IP via CrowdSec:
   ```bash
   sudo cscli decisions add --ip <OFFENDING_IP> --duration 72h --reason "Suspicious SSH probe"
   ```
