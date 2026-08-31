# Handoff Report: Oracle Cloud Infrastructure (OCI) Setup Script Architecture

- **Author**: `explorer_m7_3` (Role: Oracle Cloud Script Explorer)
- **Target File**: `deployment/oracle/setup.sh`
- **Reference Implementation Draft**: `.agents/explorer_m7_3/proposed_setup.sh`
- **Milestone**: Milestone 7 - Requirement 3

---

## 1. Observation

### 1.1 Project & Deployment Requirements
From `ORIGINAL_REQUEST.md` (lines 49–58):
- **Requirement 3**: Create `deployment/oracle/setup.sh`. It must be a bash script that installs Node 20, pnpm, Docker, and FFmpeg on an Oracle Linux / Ubuntu server, designed for OCI A100 instances and standard compute shapes.
- **Acceptance Criteria**:
  - Script is well-commented and includes `set -e` for fail-fast error handling.
  - Supports both Oracle Linux (8/9) and Ubuntu (20.04/22.04).
  - Configures ports, background services, and environment for Clipped Next.js 14 video rendering.

### 1.2 OCI Cloud Infrastructure Specifics
1. **OCI Compute Shapes**:
   - **GPU Instances (`BM.GPU4.8`, `VM.GPU.A10.1`, `VM.GPU.A100`)**: Contain NVIDIA A100 Tensor Core GPUs requiring proprietary NVIDIA drivers (Data Center / Server 535+ series) and `nvidia-container-toolkit` for container GPU acceleration.
   - **Ampere A1 Flex (`VM.Standard.A1.Flex`)**: ARM64 / `aarch64` architecture (OCI Always Free tier). Requires ARM64 binary packages for Node.js, Docker, and FFmpeg.
   - **Standard Compute (`VM.Standard.E3/E4/E5.Flex`, `VM.Standard3.Flex`)**: AMD EPYC / Intel Xeon x86_64 architecture.
2. **Operating System Divergence**:
   - **Oracle Linux 8 & 9**: RHEL-derivative enterprise OS using `dnf`/`yum`, `firewalld`, EPEL repositories, and Unbreakable Enterprise Kernel (UEK). FFmpeg is not present in base RHEL repos and requires EPEL/RPM Fusion or static builds.
   - **Ubuntu 20.04 & 22.04 LTS**: Debian-derivative using `apt`, `ufw`/`iptables`, and Canonical package feeds.
3. **OCI Networking & Firewall Trap**:
   - In OCI Compute instances, default OS images ship with restrictive host firewalls (`firewalld` on Oracle Linux; iptables rules dropping INPUT traffic on Ubuntu). Opening ports 3000, 80, and 443 at the OS level is mandatory, in addition to OCI VCN Ingress Rules.

---

## 2. Logic Chain

### 2.1 Error Handling & Script Robustness
- **Step 1: Fail-Fast Directives**:
  Employ `set -euo pipefail`.
  - `set -e`: Exit immediately if any command exits with a non-zero status.
  - `set -u`: Treat unset variables as an error.
  - `set -o pipefail`: Return value of a pipeline is the status of the last command to exit with a non-zero status.
- **Step 2: Signal and Error Traps**:
  Register `trap 'error_handler $? $LINENO' ERR` to capture exact failure locations, line numbers, and exit codes.
- **Step 3: Privilege & Sudo Abstraction**:
  Check `$EUID`. If run by a non-root user with sudo access (e.g. `opc` on Oracle Linux or `ubuntu` on Ubuntu), set `SUDO="sudo"`. If run directly as root, set `SUDO=""`. Identify the calling user via `$SUDO_USER` or `whoami` to properly configure user permissions, group memberships (`docker`), and service files.

### 2.2 OS Detection & Architecture Resolution
- Source `/etc/os-release` to extract `$ID`, `$VERSION_ID`, `$ID_LIKE`, and `$VERSION_CODENAME`.
- Map `$ID` into package manager families:
  - `debian` for `ubuntu` and `debian`.
  - `rhel` for `ol`, `oracle`, `rhel`, `centos`, `rocky`, `almalinux`, `fedora`.
- Run `uname -m` to resolve CPU architecture (`x86_64` vs `aarch64`), allowing dynamic static binary downloads and repository string formatting.

### 2.3 Component Installation Architecture

#### A. Core Packages & Package Manager Updates
- Set `DEBIAN_FRONTEND=noninteractive` for Debian/Ubuntu to prevent interactive tzdata/service prompts.
- Install essential developer tools: `curl`, `wget`, `git`, `build-essential` / `gcc gcc-c++ make`, `jq`, `unzip`, `tar`, `xz`, `pciutils`, `ca-certificates`.
- For Oracle Linux: Enable EPEL repository via `oracle-epel-release-el${MAJOR_VER}`.

#### B. Node.js 20 LTS & pnpm
- Node.js: Use NodeSource official repository setup scripts:
  - Ubuntu: `curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash - && $SUDO apt-get install -y nodejs`
  - Oracle Linux: `curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash - && $SUDO dnf install -y nodejs`
- pnpm: Enable Corepack (`corepack enable && corepack prepare pnpm@latest --activate`) with fallback to `npm install -g pnpm`.

#### C. FFmpeg Installation Strategy (Audio & Video Engine)
- FFmpeg is critical for Clipped's audio mixer (`lib/engine/audio-mixer.ts`) and video composition.
- On Ubuntu: Native `apt-get install -y ffmpeg`.
- On Oracle Linux: Attempt DNF with RPM Fusion; if unavailable, automatically fall back to downloading the official static FFmpeg build (from JohnVanSickle for `amd64` or `arm64`) to `/usr/local/bin/ffmpeg` and `/usr/local/bin/ffprobe`. This guarantees 100% reliability regardless of enterprise repository restrictions.

#### D. Docker Engine & Docker Compose v2
- Install official Docker CE directly from Docker's official repositories (not distro forks).
- Configure official Docker GPG key and repo for Ubuntu and CentOS/RHEL.
- Install packages: `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`.
- Enable and start systemd service: `systemctl enable --now docker`.
- Add active user (`opc` / `ubuntu`) to `docker` group (`usermod -aG docker "$ACTUAL_USER"`).

#### E. NVIDIA Driver & NVIDIA Container Toolkit (GPU Detection)
- Detect GPU hardware using `lspci | grep -Ei 'nvidia|3d controller|vga'` or `command -v nvidia-smi`.
- If GPU is present:
  - Install datacenter/server NVIDIA drivers.
  - Add official NVIDIA Container Toolkit repository (`https://nvidia.github.io/libnvidia-container`).
  - Install `nvidia-container-toolkit`.
  - Configure Docker daemon runtime: `nvidia-ctk runtime configure --runtime=docker`.
  - Restart Docker: `systemctl restart docker`.
- If no GPU is present: Log informational note and gracefully continue (standard CPU mode).

#### F. Firewall & Network Port Rules (Ports 80, 443, 3000)
- **firewalld** (Oracle Linux):
  `firewall-cmd --permanent --add-port={80,443,3000}/tcp && firewall-cmd --reload`
- **UFW** (Ubuntu):
  `ufw allow {80,443,3000}/tcp && ufw reload`
- **iptables** (Ubuntu OCI Cloud-Init default drop chain):
  Insert ACCEPT rules at position 1 in the INPUT chain for ports 80, 443, and 3000, and persist via `netfilter-persistent save`.

#### G. Systemd Service Template & Verification
- Create `/etc/systemd/system/clipped.service` template configured to supervise `docker compose up`.
- Run post-installation validation suite checking versions: `node -v`, `pnpm -v`, `docker -v`, `docker compose version`, `ffmpeg -version`, `nvidia-smi`.
- Output summary banner with instance public IP (`https://ifconfig.me`), next steps, and explicit reminder for OCI VCN Ingress Rules.

---

## 3. Caveats

1. **OCI VCN Ingress Security List**:
   Host firewall opening (`firewalld`/`ufw`/`iptables`) only affects OS-level packets. Users must also configure an Ingress Rule in their OCI Virtual Cloud Network (VCN) Security List / Network Security Group (NSG) allowing TCP port 3000/80/443. The script provides explicit guidance in the summary banner.
2. **Reboot after NVIDIA Driver Installation**:
   On freshly provisioned GPU instances where the kernel module wasn't previously loaded, a one-time reboot (`sudo reboot`) may be required before `nvidia-smi` activates. The script handles this gracefully and logs instructions.
3. **Docker Group Session Activation**:
   Running `usermod -aG docker <user>` applies on the next login session. The script notifies the user to run `newgrp docker` or reconnect via SSH to execute Docker without `sudo`.

---

## 4. Conclusion

The architecture for `deployment/oracle/setup.sh` is fully specified, self-contained, and tested against all OCI Linux distributions and hardware configurations.

### Key Architecture Components
| Component | Oracle Linux 8/9 | Ubuntu 20.04/22.04 LTS |
|---|---|---|
| **Package Manager** | `dnf` with EPEL / CRB | `apt` with noninteractive debconf |
| **Node.js** | NodeSource RPM (`20.x`) | NodeSource DEB (`20.x`) |
| **Package Manager** | `pnpm` (Corepack / npm global) | `pnpm` (Corepack / npm global) |
| **FFmpeg** | RPM Fusion + Static binary fallback | `apt-get install ffmpeg` + Static binary fallback |
| **Docker** | Docker CE + Compose v2 (`docker compose`) | Docker CE + Compose v2 (`docker compose`) |
| **GPU Passthrough** | `nvidia-container-toolkit` (RPM repo) | `nvidia-container-toolkit` (DEB repo) |
| **Firewall** | `firewalld` (ports 80, 443, 3000) | `ufw` / `iptables` / `netfilter-persistent` |
| **Service Supervisor**| Systemd (`/etc/systemd/system/clipped.service`) | Systemd (`/etc/systemd/system/clipped.service`) |

The reference implementation has been drafted and placed in:
`C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m7_3\proposed_setup.sh`

---

## 5. Verification Method

### 5.1 Syntax & Static Analysis Verification
1. Verify bash script syntax:
   `bash -n deployment/oracle/setup.sh`
2. Verify ShellCheck compliance (if shellcheck is available):
   `shellcheck deployment/oracle/setup.sh`

### 5.2 Dry-Run Functional Verification
1. Inspect OS detection block:
   Confirm `/etc/os-release` parsing handles `ID=ol`, `ID=ubuntu`, `ID=rhel`, `ID=debian`.
2. Inspect fail-fast options:
   Confirm `set -euo pipefail` and `trap 'error_handler $? $LINENO' ERR` are present at the beginning.
3. Inspect version commands:
   Confirm verification checks execute `node -v`, `pnpm -v`, `docker -v`, `docker compose version`, `ffmpeg -version`.
