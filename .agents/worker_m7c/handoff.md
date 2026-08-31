# Handoff Report: Oracle Cloud Infrastructure Setup Script (`deployment/oracle/setup.sh`)

- **Author**: `worker_m7c` (Role: Oracle Cloud Script Worker)
- **Target File**: `deployment/oracle/setup.sh`
- **Milestone**: Milestone 7 - Requirement 3 (Oracle Cloud Setup Script)
- **Status**: COMPLETE

---

## 1. Observation

1. **Original Request Specifications** (`ORIGINAL_REQUEST.md` lines 49–58):
   - Create `deployment/oracle/setup.sh`.
   - Must be a bash script that installs Node 20, pnpm, Docker, and FFmpeg on an Oracle Linux / Ubuntu server, designed for OCI A100 instances and standard compute shapes.
   - Must include `set -e` for fail-fast error handling and dual-OS support.
2. **Scope Contract** (`SCOPE.md` lines 52–56):
   - Directives: `#!/usr/bin/env bash` with `set -euo pipefail` and ERR trap error handler.
   - OS Support: Oracle Linux 8/9 (`dnf`) and Ubuntu 20.04/22.04 LTS (`apt`).
   - Core Components: Node.js 20 LTS (NodeSource), pnpm (Corepack / npm fallback), Docker CE + Compose v2 (`docker compose`), FFmpeg (distro package with static JohnVanSickle binary fallback for `amd64`/`arm64`), NVIDIA Container Toolkit detection and runtime configuration, OS firewall rules (ports 80, 443, 3000 for `firewalld`/`ufw`/`iptables`), systemd service template (`/etc/systemd/system/clipped.service`), post-install validation checks (`node -v`, `pnpm -v`, `docker -v`, `ffmpeg -version`).
3. **Artifact Created**:
   - `deployment/oracle/setup.sh` (488 lines, 19,715 bytes).

---

## 2. Logic Chain

1. **Robustness & Fail-Fast Architecture**:
   - `set -euo pipefail` ensures immediate exit on non-zero return codes, unset variable access, or pipeline failures.
   - `trap 'error_handler $? $LINENO' ERR` captures exact line numbers and exit codes upon unexpected failure.
2. **Privilege & User Abstraction**:
   - Detects `$EUID`: sets `SUDO=""` if root, or `SUDO="sudo"` if non-root.
   - Identifies non-root calling user (`$SUDO_USER` or `whoami`) and resolves home directory (`$ACTUAL_HOME`) for permission management, docker group membership, and systemd service binding.
3. **Operating System & Architecture Resolution**:
   - Sources `/etc/os-release` to detect `ID`, `VERSION_ID`, and assigns `PKG_FAMILY` (`debian` or `rhel`).
   - Resolves CPU architecture (`uname -m` -> `x86_64` vs `aarch64` Ampere).
4. **Toolchain & Dependency Provisioning**:
   - **Core Packages**: `curl`, `wget`, `git`, `build-essential` / `gcc`, `jq`, `unzip`, `tar`, `xz`, `pciutils`, `ca-certificates`, `gnupg`.
   - **Node.js 20 LTS**: Configures official NodeSource RPM/DEB repository and installs `nodejs`.
   - **pnpm**: Activates Corepack (`corepack enable && corepack prepare pnpm@latest --activate`) with fallback to `npm install -g pnpm`.
   - **FFmpeg**: Attempts native distro package installation; automatically falls back to downloading official static binaries (JohnVanSickle) for `x86_64` or `aarch64` and installs to `/usr/local/bin/ffmpeg` and `/usr/local/bin/ffprobe`.
   - **Docker CE & Compose v2**: Adds official Docker repository, installs `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`, enables `docker.service`, and adds `$ACTUAL_USER` to the `docker` group.
   - **NVIDIA GPU Detection**: Scans hardware using `lspci` and `nvidia-smi`. If present, installs proprietary drivers and `nvidia-container-toolkit`, configures Docker daemon runtime (`nvidia-ctk runtime configure --runtime=docker`), and restarts Docker. If not present, continues gracefully.
5. **Firewall & System Service Automation**:
   - Opens TCP ports 80, 443, and 3000 across `firewalld` (Oracle Linux), `ufw` (Ubuntu), and direct `iptables` (OCI Ubuntu cloud-init default drop rule bypass) with `netfilter-persistent save`.
   - Generates `/etc/systemd/system/clipped.service` template configured for `docker compose up` under `$ACTUAL_USER` and executes `systemctl daemon-reload`.
6. **Verification & Guidance Banner**:
   - Displays live version checks for `node`, `pnpm`, `docker`, `docker compose`, `ffmpeg`, and `nvidia-smi`.
   - Retrieves public IP via `https://ifconfig.me` and outputs launch commands and OCI VCN Ingress Rules guidance.

---

## 3. Caveats

1. **OCI VCN Ingress Security Lists**:
   Host firewall opening (`firewalld`/`ufw`/`iptables`) operates strictly at the OS layer. Cloud administrators must also configure Ingress Rules in their OCI VCN Security List / NSG allowing TCP traffic on port 3000 (and 80/443). The script includes prominent summary warnings for this requirement.
2. **First-Time NVIDIA Kernel Driver Activation**:
   On freshly provisioned GPU instances where the kernel module was not previously loaded, a system reboot (`sudo reboot`) may be required before `nvidia-smi` activates.
3. **Session Refresh for Docker Group**:
   New group membership takes effect in new shell sessions; the script instructs the user to run `newgrp docker` or reconnect via SSH.

---

## 4. Conclusion

`deployment/oracle/setup.sh` is complete, idempotent, and adheres to all architectural requirements specified in `ORIGINAL_REQUEST.md`, `SCOPE.md`, and `explorer_m7_3/handoff.md`.

---

## 5. Verification Method

### 5.1 Static Code & Syntax Inspection
- Inspect `deployment/oracle/setup.sh` to confirm:
  - Shebang `#!/usr/bin/env bash` and `set -euo pipefail` on lines 1–25.
  - OS-release parsing and branch handling for Debian (`apt`) and RHEL (`dnf`) on lines 99–137.
  - NodeSource 20.x setup on lines 191–207.
  - Corepack / npm fallback for pnpm on lines 209–225.
  - Static FFmpeg fallback function on lines 231–254.
  - Docker CE installation and service enablement on lines 276–313.
  - NVIDIA detection and `nvidia-container-toolkit` configuration on lines 315–363.
  - Port 80, 443, 3000 firewall rules on lines 365–405.
  - Systemd service file generation on lines 407–440.
  - Verification printout and summary guidance on lines 442–487.

### 5.2 Independent Bash Validation Command
Run the following in any POSIX bash shell:
```bash
bash -n deployment/oracle/setup.sh
```
Expected output: Return code 0 (no syntax errors).
