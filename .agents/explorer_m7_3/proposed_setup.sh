#!/usr/bin/env bash
# ==============================================================================
# Clipped - Oracle Cloud Infrastructure (OCI) Compute Setup Script
# ==============================================================================
# Target Platforms:
#   - Oracle Linux 8 / 9 (Enterprise Linux / RHEL derivative)
#   - Ubuntu 20.04 / 22.04 LTS
# Target Compute Shapes:
#   - OCI GPU Instances (NVIDIA A100 / A10 / V100 / T4)
#   - OCI Ampere A1 (ARM64 / aarch64 - Always Free Tier)
#   - OCI Standard / Optimized Instances (AMD EPYC, Intel Xeon - x86_64)
#
# Components Installed & Configured:
#   1. System package manager update & core developer tools
#   2. Node.js 20 LTS (NodeSource distribution)
#   3. pnpm package manager (Corepack or standalone)
#   4. FFmpeg audio/video processing engine (Full codec support)
#   5. Docker Engine & Docker Compose v2 (Official Docker CE)
#   6. NVIDIA Drivers & NVIDIA Container Toolkit (if GPU detected)
#   7. OS Firewall rules (Ports 80, 443, 3000 via firewalld / ufw / iptables)
#   8. Systemd Service template & Clipped directory configuration
#   9. Verification test suite & Post-install summary
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Color Formats & Logging Utilities
# ------------------------------------------------------------------------------
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$*"
}

log_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$*"
}

log_warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$*"
}

log_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$*" >&2
}

log_header() {
    printf "\n${BOLD}${CYAN}=== %s ===${NC}\n" "$*"
}

# ------------------------------------------------------------------------------
# Error Handling & Traps
# ------------------------------------------------------------------------------
error_handler() {
    local exit_code="$1"
    local line_no="$2"
    log_error "Setup script failed with exit code ${exit_code} at line ${line_no}."
    log_error "Please inspect the error output above for details."
}

trap 'error_handler $? $LINENO' ERR

# ------------------------------------------------------------------------------
# Privilege & User Detection
# ------------------------------------------------------------------------------
log_header "Checking Environment & Privileges"

if [ "$EUID" -eq 0 ]; then
    SUDO=""
    ACTUAL_USER="${SUDO_USER:-root}"
else
    if command -v sudo &>/dev/null; then
        SUDO="sudo"
        ACTUAL_USER="${USER:-$(whoami)}"
    else
        log_error "This script requires root or sudo privileges. Please run as root or install sudo."
        exit 1
    fi
fi

ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)
ARCH=$(uname -m)

log_info "Running as user: ${ACTUAL_USER} (Home: ${ACTUAL_HOME})"
log_info "System Architecture: ${ARCH}"

# ------------------------------------------------------------------------------
# OS Auto-Detection
# ------------------------------------------------------------------------------
log_header "Detecting Operating System"

if [ ! -f /etc/os-release ]; then
    log_error "Cannot detect OS: /etc/os-release not found."
    exit 1
fi

. /etc/os-release
OS_ID="${ID:-unknown}"
OS_VERSION="${VERSION_ID:-unknown}"
OS_NAME="${PRETTY_NAME:-Linux}"

log_info "Detected OS: ${OS_NAME} (ID: ${OS_ID}, Version: ${OS_VERSION})"

case "$OS_ID" in
    ubuntu|debian)
        PKG_FAMILY="debian"
        export DEBIAN_FRONTEND=noninteractive
        ;;
    ol|oracle|rhel|centos|rocky|almalinux|fedora)
        PKG_FAMILY="rhel"
        ;;
    *)
        log_warn "Unrecognized OS '${OS_ID}'. Attempting generic Enterprise Linux / Debian compatibility mode."
        if [ -f /etc/debian_version ]; then
            PKG_FAMILY="debian"
            export DEBIAN_FRONTEND=noninteractive
        elif [ -f /etc/redhat-release ]; then
            PKG_FAMILY="rhel"
        else
            log_error "Unsupported operating system distribution."
            exit 1
        fi
        ;;
esac

log_info "Package management family: ${PKG_FAMILY}"

# ------------------------------------------------------------------------------
# Step 1: System Package Update & Core Developer Tools
# ------------------------------------------------------------------------------
log_header "Step 1: Updating System & Installing Core Utilities"

if [ "$PKG_FAMILY" = "debian" ]; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y --no-install-recommends \
        curl \
        wget \
        git \
        build-essential \
        jq \
        unzip \
        tar \
        xz-utils \
        ca-certificates \
        gnupg \
        lsb-release \
        pciutils \
        software-properties-common \
        iptables \
        iptables-persistent \
        netfilter-persistent
elif [ "$PKG_FAMILY" = "rhel" ]; then
    # Enable EPEL (Extra Packages for Enterprise Linux)
    if [ "$OS_ID" = "ol" ] || [ "$OS_ID" = "oracle" ]; then
        MAJOR_VER="${OS_VERSION%%.*}"
        $SUDO dnf install -y "oracle-epel-release-el${MAJOR_VER}" || true
    else
        $SUDO dnf install -y epel-release || true
    fi

    $SUDO dnf update -y --allowerasing || $SUDO dnf update -y
    $SUDO dnf install -y \
        curl \
        wget \
        git \
        gcc \
        gcc-c++ \
        make \
        jq \
        unzip \
        tar \
        xz \
        ca-certificates \
        pciutils \
        dnf-plugins-core \
        firewalld
fi

log_success "Core system utilities installed successfully."

# ------------------------------------------------------------------------------
# Step 2: Node.js 20 LTS Installation
# ------------------------------------------------------------------------------
log_header "Step 2: Installing Node.js 20 LTS"

if command -v node &>/dev/null && node -v | grep -q "^v20\."; then
    log_info "Node.js 20 LTS is already installed ($(node -v))."
else
    log_info "Configuring NodeSource repository for Node.js 20.x..."
    if [ "$PKG_FAMILY" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
        $SUDO apt-get install -y nodejs
    elif [ "$PKG_FAMILY" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash -
        $SUDO dnf install -y nodejs
    fi
fi

log_success "Node.js installed: $(node -v) (npm: $(npm -v))"

# ------------------------------------------------------------------------------
# Step 3: Corepack & pnpm Installation
# ------------------------------------------------------------------------------
log_header "Step 3: Installing pnpm"

if command -v corepack &>/dev/null; then
    log_info "Enabling Corepack for pnpm management..."
    $SUDO corepack enable || true
    $SUDO corepack prepare pnpm@latest --activate || true
fi

if ! command -v pnpm &>/dev/null; then
    log_info "Installing pnpm globally via npm..."
    $SUDO npm install -g pnpm
fi

log_success "pnpm installed: $(pnpm -v)"

# ------------------------------------------------------------------------------
# Step 4: FFmpeg Installation
# ------------------------------------------------------------------------------
log_header "Step 4: Installing FFmpeg (Audio/Video Engine)"

install_ffmpeg_static() {
    log_info "Installing standalone static FFmpeg build with all codecs..."
    local FFMPEG_TMP="/tmp/ffmpeg-static"
    mkdir -p "$FFMPEG_TMP"
    
    local ARCH_URL=""
    if [ "$ARCH" = "x86_64" ]; then
        ARCH_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
    elif [ "$ARCH" = "aarch64" ]; then
        ARCH_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz"
    fi

    if [ -n "$ARCH_URL" ]; then
        if curl -fsSL "$ARCH_URL" -o "$FFMPEG_TMP/ffmpeg.tar.xz"; then
            tar -xf "$FFMPEG_TMP/ffmpeg.tar.xz" -C "$FFMPEG_TMP" --strip-components=1
            $SUDO cp "$FFMPEG_TMP/ffmpeg" "$FFMPEG_TMP/ffprobe" /usr/local/bin/
            $SUDO chmod 755 /usr/local/bin/ffmpeg /usr/local/bin/ffprobe
            rm -rf "$FFMPEG_TMP"
            log_success "FFmpeg static binaries installed to /usr/local/bin"
            return 0
        fi
    fi
    return 1
}

if command -v ffmpeg &>/dev/null; then
    log_info "FFmpeg is already available ($(ffmpeg -version | head -n 1))."
else
    if [ "$PKG_FAMILY" = "debian" ]; then
        $SUDO apt-get install -y ffmpeg || install_ffmpeg_static
    elif [ "$PKG_FAMILY" = "rhel" ]; then
        # Try DNF with RPM Fusion or EPEL; fallback to static build
        $SUDO dnf install -y --nogpgcheck https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-$(rpm -E %rhel).noarch.rpm || true
        $SUDO dnf install -y ffmpeg || install_ffmpeg_static
    fi
fi

if ! command -v ffmpeg &>/dev/null; then
    install_ffmpeg_static
fi

log_success "FFmpeg installed: $(ffmpeg -version | head -n 1)"

# ------------------------------------------------------------------------------
# Step 5: Docker Engine & Docker Compose v2 Installation
# ------------------------------------------------------------------------------
log_header "Step 5: Installing Docker Engine & Docker Compose"

if command -v docker &>/dev/null; then
    log_info "Docker is already installed ($(docker --version))."
else
    log_info "Installing Docker CE..."
    if [ "$PKG_FAMILY" = "debian" ]; then
        $SUDO install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc || \
        curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
        $SUDO chmod a+r /etc/apt/keyrings/docker.asc

        DISTRO_CODENAME="${VERSION_CODENAME:-$(lsb_release -cs 2>/dev/null || echo "jammy")}"
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${OS_ID} ${DISTRO_CODENAME} stable" | \
            $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null

        $SUDO apt-get update -y
        $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif [ "$PKG_FAMILY" = "rhel" ]; then
        $SUDO dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        $SUDO dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || \
        $SUDO dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
fi

# Enable and start Docker service
$SUDO systemctl enable --now docker

# Add non-root user to docker group
if [ "$ACTUAL_USER" != "root" ]; then
    $SUDO usermod -aG docker "$ACTUAL_USER"
    log_info "Added user '${ACTUAL_USER}' to 'docker' group."
fi

log_success "Docker Engine: $(docker --version)"
log_success "Docker Compose: $(docker compose version)"

# ------------------------------------------------------------------------------
# Step 6: NVIDIA Driver & NVIDIA Container Toolkit (A100 / GPU Detection)
# ------------------------------------------------------------------------------
log_header "Step 6: Checking NVIDIA GPU & Container Toolkit"

HAS_GPU=false
if lspci 2>/dev/null | grep -Ei 'nvidia|3d controller|vga' &>/dev/null || command -v nvidia-smi &>/dev/null; then
    HAS_GPU=true
fi

if [ "$HAS_GPU" = true ]; then
    log_info "NVIDIA GPU hardware detected!"
    
    # Check if driver is already working
    if command -v nvidia-smi &>/dev/null && nvidia-smi &>/dev/null; then
        log_info "NVIDIA driver is already active: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)"
    else
        log_info "Installing NVIDIA drivers..."
        if [ "$PKG_FAMILY" = "debian" ]; then
            $SUDO apt-get install -y ubuntu-drivers-common || true
            $SUDO ubuntu-drivers install || $SUDO apt-get install -y nvidia-driver-535-server || true
        elif [ "$PKG_FAMILY" = "rhel" ]; then
            $SUDO dnf config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/rhel${OS_VERSION%%.*}/${ARCH}/cuda-rhel${OS_VERSION%%.*}.repo || true
            $SUDO dnf module install -y nvidia-driver:latest-dkms || true
        fi
    fi

    # Install NVIDIA Container Toolkit
    log_info "Configuring NVIDIA Container Toolkit for Docker GPU passthrough..."
    if [ "$PKG_FAMILY" = "debian" ]; then
        curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | $SUDO gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg --yes
        curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
            sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
            $SUDO tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
        $SUDO apt-get update -y
        $SUDO apt-get install -y nvidia-container-toolkit
    elif [ "$PKG_FAMILY" = "rhel" ]; then
        curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
            $SUDO tee /etc/yum.repos.d/nvidia-container-toolkit.repo > /dev/null
        $SUDO dnf install -y nvidia-container-toolkit
    fi

    if command -v nvidia-ctk &>/dev/null; then
        $SUDO nvidia-ctk runtime configure --runtime=docker
        $SUDO systemctl restart docker
        log_success "NVIDIA Container Toolkit configured with Docker runtime."
    fi
else
    log_info "No NVIDIA GPU detected (Standard CPU / Ampere A1 instance). Skipping NVIDIA GPU driver installation."
fi

# ------------------------------------------------------------------------------
# Step 7: Firewall & Network Port Configuration (Ports 80, 443, 3000)
# ------------------------------------------------------------------------------
log_header "Step 7: Configuring OS Firewall Rules"

# 1. Firewalld (Standard on Oracle Linux)
if command -v firewall-cmd &>/dev/null && (systemctl is-active --quiet firewalld || systemctl is-enabled --quiet firewalld); then
    log_info "Configuring firewalld rules for ports 80, 443, and 3000..."
    $SUDO firewall-cmd --permanent --add-port=80/tcp || true
    $SUDO firewall-cmd --permanent --add-port=443/tcp || true
    $SUDO firewall-cmd --permanent --add-port=3000/tcp || true
    $SUDO firewall-cmd --reload || true
    log_success "firewalld rules updated."
fi

# 2. UFW (Standard on Ubuntu desktop/server)
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    log_info "Configuring UFW rules for ports 80, 443, and 3000..."
    $SUDO ufw allow 80/tcp comment "HTTP" || true
    $SUDO ufw allow 443/tcp comment "HTTPS" || true
    $SUDO ufw allow 3000/tcp comment "Clipped Web App" || true
    $SUDO ufw reload || true
    log_success "UFW rules updated."
fi

# 3. Direct iptables (OCI Ubuntu Cloud-Init default images frequently drop INPUT)
if command -v iptables &>/dev/null; then
    log_info "Ensuring iptables allows incoming traffic on ports 80, 443, 3000..."
    # Insert rule ahead of any reject/drop rules
    $SUDO iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || $SUDO iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
    $SUDO iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || $SUDO iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
    $SUDO iptables -C INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || $SUDO iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT

    # Persist rules
    if command -v netfilter-persistent &>/dev/null; then
        $SUDO netfilter-persistent save || true
    fi
fi

log_success "OS firewall configuration complete."

# ------------------------------------------------------------------------------
# Step 8: Project Deployment Helper & Systemd Service Template
# ------------------------------------------------------------------------------
log_header "Step 8: Configuring Application Deployment & Service"

APP_DIR="${APP_DIR:-$ACTUAL_HOME/clipped}"
mkdir -p "$APP_DIR"
chown -R "$ACTUAL_USER":"$ACTUAL_USER" "$APP_DIR" 2>/dev/null || true

SERVICE_FILE="/etc/systemd/system/clipped.service"
log_info "Creating systemd service template at ${SERVICE_FILE}..."

$SUDO tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Clipped Next.js Video Automation Studio
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

$SUDO systemctl daemon-reload
log_success "Systemd service 'clipped.service' registered."

# ------------------------------------------------------------------------------
# Step 9: Verification Checks & Post-Install Summary
# ------------------------------------------------------------------------------
log_header "Step 9: Running Verification Checks"

PUBLIC_IP=$(curl -s --max-time 5 https://ifconfig.me 2>/dev/null || echo "YOUR_INSTANCE_PUBLIC_IP")

echo ""
printf "${BOLD}Installation Verification:${NC}\n"
printf "  • Node.js:         ${GREEN}%s${NC}\n" "$(node -v 2>/dev/null || echo 'NOT INSTALLED')"
printf "  • pnpm:            ${GREEN}%s${NC}\n" "$(pnpm -v 2>/dev/null || echo 'NOT INSTALLED')"
printf "  • Docker:          ${GREEN}%s${NC}\n" "$(docker --version 2>/dev/null || echo 'NOT INSTALLED')"
printf "  • Docker Compose:  ${GREEN}%s${NC}\n" "$(docker compose version 2>/dev/null || echo 'NOT INSTALLED')"
printf "  • FFmpeg:          ${GREEN}%s${NC}\n" "$(ffmpeg -version 2>/dev/null | head -n 1 || echo 'NOT INSTALLED')"

if [ "$HAS_GPU" = true ]; then
    printf "  • NVIDIA Driver:   ${GREEN}%s${NC}\n" "$(nvidia-smi --query-gpu=name,driver_version --format=csv,noheader 2>/dev/null || echo 'Detected (reboot may be required)')"
fi

echo ""
printf "${BOLD}${GREEN}========================================================================${NC}\n"
printf "${BOLD}${GREEN}          Oracle Cloud Infrastructure Setup Completed Successfully!     ${NC}\n"
printf "${BOLD}${GREEN}========================================================================${NC}\n"
echo ""
printf "${BOLD}Next Steps to Launch Clipped:${NC}\n"
printf "  1. Log out and back in (or run 'newgrp docker') to activate Docker group permissions:\n"
printf "     ${CYAN}newgrp docker${NC}\n\n"
printf "  2. Clone or navigate to the Clipped workspace directory:\n"
printf "     ${CYAN}cd %s${NC}\n\n" "$APP_DIR"
printf "  3. Configure your environment variables (.env.local):\n"
printf "     ${CYAN}cp .env.example .env.local${NC}\n\n"
printf "  4. Start the application with Docker Compose:\n"
printf "     ${CYAN}docker compose up -d${NC}\n"
printf "     OR start via systemd service:\n"
printf "     ${CYAN}sudo systemctl start clipped.service${NC}\n\n"
printf "  5. Access the Web Application:\n"
printf "     ${BOLD}${CYAN}http://%s:3000${NC}\n\n" "$PUBLIC_IP"
printf "${BOLD}${YELLOW}Important OCI Networking Reminder:${NC}\n"
printf "  Ensure that your OCI Virtual Cloud Network (VCN) Ingress Security Rules\n"
printf "  allow TCP traffic on port 3000 (and 80/443) from 0.0.0.0/0 (or your IP).\n"
printf "  (OCI Console -> Networking -> Virtual Cloud Networks -> Security Lists -> Ingress Rules)\n"
echo ""
