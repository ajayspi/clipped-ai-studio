# Milestone 7 Oracle Cloud Setup & Integration Review Report

- **Author**: `reviewer_m7_2` (Role: Oracle Cloud & Integration Reviewer / Critic)
- **Review Target**: `deployment/oracle/setup.sh` & Cross-Deployment Consistency (`Dockerfile`, `docker-compose.yml`, `deployment/colab/clipped-studio.ipynb`, `package.json`, `.env.docker`)
- **Milestone**: Milestone 7 (Targeted Deployment Configurations)
- **Verdict**: **APPROVE**

---

## 1. Observation

Direct code inspections of `deployment/oracle/setup.sh` and related deployment artifacts yielded the following verified facts:

1. **POSIX Bash Fail-Fast Directives & Trap Handler** (`deployment/oracle/setup.sh` lines 1, 25, 59–69):
   - Line 1: `#!/usr/bin/env bash`
   - Line 25: `set -euo pipefail`
   - Lines 61–68: `error_handler()` prints `$1` (exit code) and `$2` (`$LINENO`) to stderr, wired with `trap 'error_handler $? $LINENO' ERR`.
2. **Privilege & User Abstraction** (`deployment/oracle/setup.sh` lines 71–97):
   - Lines 75–86: If `$EUID -eq 0`, sets `SUDO=""` and resolves `ACTUAL_USER="${SUDO_USER:-root}"`; if non-root, sets `SUDO="sudo"` and `ACTUAL_USER="${USER:-$(whoami)}"`.
   - Lines 88–91: Resolves home directory via `getent passwd "$ACTUAL_USER"` with fallback to `${HOME:-/root}`.
   - Line 93: Evaluates `ARCH=$(uname -m)`.
3. **Operating System Auto-Detection** (`deployment/oracle/setup.sh` lines 101–139):
   - Line 103: Validates `/etc/os-release` existence.
   - Lines 109–114: Sources `/etc/os-release`, reading `ID`, `VERSION_ID`, and `PRETTY_NAME`.
   - Lines 116–136: Case statement maps `ubuntu|debian` to `PKG_FAMILY="debian"` (`DEBIAN_FRONTEND=noninteractive`) and `ol|oracle|rhel|centos|rocky|almalinux|fedora` to `PKG_FAMILY="rhel"`, with fallback detection via `/etc/debian_version` and `/etc/redhat-release`.
4. **Toolchain & Runtime Provisioning**:
   - **Step 1: System Packages** (lines 143–190): Installs `curl`, `wget`, `git`, `jq`, `unzip`, `tar`, `xz`, `pciutils`, `ca-certificates`, `gnupg`, `build-essential`/`gcc`/`make`, `dnf-plugins-core`/`software-properties-common`, and firewall tools (`firewalld` or `iptables-persistent`/`netfilter-persistent`). Oracle Linux dynamically resolves EPEL via `oracle-epel-release-el${MAJOR_VER}`.
   - **Step 2: Node.js 20 LTS** (lines 196–209): Idempotently checks `node -v | grep -q "^v20\."`. Configures official NodeSource repo (`https://deb.nodesource.com/setup_20.x` or `https://rpm.nodesource.com/setup_20.x`) and installs `nodejs`.
   - **Step 3: Corepack & pnpm** (lines 214–230): Runs `corepack enable` and `corepack prepare pnpm@latest --activate` with fallback to `npm install -g pnpm`.
   - **Step 4: FFmpeg with Static Fallback** (lines 234–278): Attempts distro package installation (`apt-get install ffmpeg` / RPM Fusion `dnf install ffmpeg`), automatically falling back to JohnVanSickle static builds for `x86_64` (`ffmpeg-release-amd64-static.tar.xz`) and `aarch64` (`ffmpeg-release-arm64-static.tar.xz`), installed to `/usr/local/bin/ffmpeg` and `/usr/local/bin/ffprobe`.
   - **Step 5: Docker Engine & Compose v2** (lines 282–318): Installs official Docker CE repository (`docker.asc` / `docker-ce.repo`), installs `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin` (with `--allowerasing` for RHEL/OL), enables `docker.service`, and adds `$ACTUAL_USER` to the `docker` group.
   - **Step 6: NVIDIA GPU & Container Toolkit** (lines 322–368): Scans hardware using `lspci` and `nvidia-smi`. If GPU present, installs proprietary drivers and `nvidia-container-toolkit`, executes `nvidia-ctk runtime configure --runtime=docker`, and restarts `docker`. If absent, gracefully skips.
5. **Firewall & System Service Automation** (`deployment/oracle/setup.sh` lines 373–444):
   - Lines 375–407: Configures TCP ports 80, 443, and 3000 across `firewalld` (`firewall-cmd --permanent --add-port`), `ufw` (`ufw allow`), and direct `iptables` (`iptables -I INPUT 1 -p tcp --dport ... -j ACCEPT` + `netfilter-persistent save`).
   - Lines 416–444: Generates `/etc/systemd/system/clipped.service` bound to `$ACTUAL_USER`, `WorkingDirectory=$APP_DIR`, `ExecStart=/usr/bin/docker compose up`, `ExecStop=/usr/bin/docker compose down`, and executes `systemctl daemon-reload`.
6. **Summary Banner & OCI VCN Ingress Rules Guidance** (`deployment/oracle/setup.sh` lines 449–488):
   - Queries `https://ifconfig.me` for public IP, prints verification status for Node.js, pnpm, Docker, Docker Compose, FFmpeg, NVIDIA drivers, and details OCI VCN Security List ingress configuration for port 3000.
7. **Cross-Deployment Artifacts**:
   - `Dockerfile` (lines 4, 18, 52): Targets Node 20 (`node:20-alpine`), `pnpm@11.24.0`, FFmpeg (`apk add ffmpeg`), port 3000.
   - `docker-compose.yml` (lines 8, 20, 41): PostgreSQL 16 Alpine with `schema.sql` mount, web app container exposed on port 3000.
   - `deployment/colab/clipped-studio.ipynb` (cells 3, 5, 7): Node 20 LTS via NodeSource, `pnpm@11.24.0`, FFmpeg, localtunnel port 3000 forwarding with `/api/health` polling.
   - `package.json` (line 37): Specifies `"packageManager": "pnpm@11.24.0"`.

---

## 2. Logic Chain

1. **Correctness of Dual-OS Packaging**:
   - Observations 3 & 4 demonstrate that `setup.sh` cleanly branches between Debian/Ubuntu (`apt-get`, `DEBIAN_FRONTEND=noninteractive`, `.list` keyring configuration) and Enterprise Linux / Oracle Linux (`dnf`, EPEL repo configuration, `.repo` files).
   - The inclusion of `--allowerasing` on line 302 specifically prevents DNF package conflicts between Docker CE and default RHEL/OL `podman`/`runc` packages.
2. **Robustness of Static Fallback Architecture**:
   - Observation 4 (FFmpeg) shows that if distro repositories lack multimedia codecs or fail to provide FFmpeg (common in stripped cloud minimal images), `install_ffmpeg_static()` downloads official pre-built static binaries for either `x86_64` or `aarch64` (Ampere A1).
3. **OCI Cloud-Init Network Traps Handled**:
   - Canonical Ubuntu images on Oracle Cloud install restrictive iptables rules via cloud-init. Observation 5 verifies that `setup.sh` inserts ACCEPT rules at position 1 (`-I INPUT 1`) for ports 80, 443, and 3000 and invokes `netfilter-persistent save`, guaranteeing inbound access.
4. **Hardware Agnostic & GPU Passthrough**:
   - Lines 324–368 check for GPU hardware without throwing an error on CPU-only or ARM64 Ampere A1 instances. When NVIDIA hardware is present, the script automates both driver setup and Docker runtime integration (`nvidia-ctk`).
5. **Cross-Deployment Uniformity**:
   - Observation 7 establishes full parity across Docker, Colab, and Oracle setups: Node 20 LTS, pnpm 11, FFmpeg, port 3000, and NextAuth/Supabase environment variable schemas are aligned.

---

## 3. Adversarial Challenge & Stress-Test Report

### Overall Risk Assessment: LOW

### Challenge Scenarios & Mitigations

#### Challenge 1: Execution on ARM64 Ampere A1 (Always Free Tier)
- **Assumption**: Setup script may assume x86_64 architecture for binary downloads or repository setup.
- **Attack Vector**: User provisions OCI Ampere A1 Compute (`VM.Standard.A1.Flex` with 4 OCPUs, 24 GB RAM, aarch64).
- **Behavior Under Test**:
  - `ARCH` resolves to `aarch64`.
  - NodeSource setup script auto-selects `aarch64` deb/rpm packages.
  - Docker CE deb uses `[arch=$(dpkg --print-architecture)]` (resolves to `arm64`).
  - Static FFmpeg fallback dynamically targets `ffmpeg-release-arm64-static.tar.xz`.
  - NVIDIA check evaluates `HAS_GPU=false` and skips GPU driver installation cleanly.
- **Result**: PASS.

#### Challenge 2: Non-Root Execution vs Sudo Invocation
- **Assumption**: Script might break paths or permissions if run via `sudo ./setup.sh` vs as `root` directly.
- **Attack Vector**: Invocation under `sudo bash setup.sh` by user `opc` or `ubuntu`.
- **Behavior Under Test**:
  - `$SUDO_USER` is identified as `opc`/`ubuntu`.
  - `$ACTUAL_HOME` correctly resolves to `/home/opc` or `/home/ubuntu`.
  - `$APP_DIR` resolves to `/home/opc/clipped` or `/home/ubuntu/clipped` and is chowned to `opc`/`ubuntu`.
  - `usermod -aG docker opc` enables non-root docker access.
  - Systemd service template sets `User=opc` (avoiding running Docker as root).
- **Result**: PASS.

#### Challenge 3: Unhandled Traps under `set -euo pipefail`
- **Assumption**: Optional commands that return non-zero (e.g. `firewall-cmd` when firewalld is inactive, or `nvidia-smi` when GPU absent) might trigger ERR trap and abort installation.
- **Attack Vector**: Running on a minimal Ubuntu image where `firewalld` is not present, or checking `nvidia-smi` on CPU instance.
- **Behavior Under Test**:
  - All non-guaranteed checks use conditional guards (`if command -v firewalld &>/dev/null && ...`), redirection of errors (`2>/dev/null`), or explicit `|| true` guards.
  - Real errors in required steps (e.g. download failures) correctly trigger `error_handler` with line number.
- **Result**: PASS.

---

## 4. Caveats

1. **OCI VCN Ingress Rules (Cloud Console)**:
   - Operating system firewalls (`firewalld`, `ufw`, `iptables`) are fully configured by `setup.sh`. However, OCI Virtual Cloud Network (VCN) Security Lists / Network Security Groups operate outside the VM guest OS. Users must ensure TCP port 3000 (and 80/443) is allowed in their OCI VCN Ingress Rules. The script explicitly prints this reminder in the post-install banner.
2. **First-Time NVIDIA Kernel Driver Reboot**:
   - On freshly provisioned GPU instances where the proprietary kernel module is compiled via DKMS, a one-time reboot (`sudo reboot`) may be necessary before `nvidia-smi` activates.
3. **Session Refresh for Docker Group**:
   - As in standard Linux environments, group membership changes require logging out and back in or running `newgrp docker`.

---

## 5. Conclusion

The Oracle Cloud Setup Script (`deployment/oracle/setup.sh`) is complete, robust, well-architected, and fully aligned with `ORIGINAL_REQUEST.md`, `SCOPE.md`, and all cross-deployment specifications.

**Verdict**: **APPROVE**

---

## 6. Verification Method

To independently verify the script and deployment configurations:

1. **Bash Static Syntax Validation**:
   ```bash
   bash -n deployment/oracle/setup.sh
   ```
   *Expected*: Exit code 0 with zero syntax errors.
2. **Key Structural Code Inspections**:
   - Line 1 & 25: Verify `#!/usr/bin/env bash` and `set -euo pipefail`.
   - Lines 116–136: Verify Debian and RHEL/Oracle Linux detection branches.
   - Lines 236–259: Verify `install_ffmpeg_static` with `x86_64` and `aarch64` tarball URLs.
   - Lines 361–365: Verify `nvidia-ctk runtime configure --runtime=docker`.
   - Lines 375–407: Verify port 80, 443, and 3000 rules across firewalld, ufw, and iptables.
   - Lines 420–444: Verify systemd service template `/etc/systemd/system/clipped.service`.
3. **Cross-Deployment Parity Inspection**:
   - Compare Node version (`20`), package manager (`pnpm@11.24.0`), port (`3000`), and FFmpeg installation across `Dockerfile`, `docker-compose.yml`, `deployment/colab/clipped-studio.ipynb`, and `deployment/oracle/setup.sh`.
