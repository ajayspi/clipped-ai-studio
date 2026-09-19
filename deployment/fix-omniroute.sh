#!/bin/bash
# ============================================================
#  OmniRoute Server - Auto Diagnostic & Fix Script
#  Run this on your Oracle VM:
#    bash deployment/fix-omniroute.sh
# ============================================================

set -e
OMNIROUTE_DIR="$(cd "$(dirname "$0")/.." && pwd)/omniroute-server"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "======================================================"
echo "  OmniRoute Diagnostic & Fix"
echo "======================================================"
echo ""

# --- Step 1: Check directory exists ---
echo "▶ [1/6] Checking omniroute-server directory..."
if [ ! -d "$OMNIROUTE_DIR" ]; then
  echo -e "${RED}✗ omniroute-server directory not found at: $OMNIROUTE_DIR${NC}"
  echo "  Make sure you cloned the full Clipped repo onto the Oracle VM."
  exit 1
fi
echo -e "${GREEN}✓ Found: $OMNIROUTE_DIR${NC}"

# --- Step 2: Check .env file ---
echo ""
echo "▶ [2/6] Checking .env file..."
if [ ! -f "$OMNIROUTE_DIR/.env" ]; then
  echo -e "${YELLOW}⚠ .env not found — creating from .env.example...${NC}"
  cp "$OMNIROUTE_DIR/.env.example" "$OMNIROUTE_DIR/.env"

  # Auto-generate required secrets
  JWT_SECRET=$(openssl rand -base64 48)
  API_KEY_SECRET=$(openssl rand -hex 32)

  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$OMNIROUTE_DIR/.env"
  sed -i "s|^API_KEY_SECRET=.*|API_KEY_SECRET=$API_KEY_SECRET|" "$OMNIROUTE_DIR/.env"
  sed -i "s|^INITIAL_PASSWORD=.*|INITIAL_PASSWORD=Clipped@Oracle2026|" "$OMNIROUTE_DIR/.env"

  echo -e "${GREEN}✓ .env created with auto-generated secrets.${NC}"
  echo -e "  ${YELLOW}Dashboard password set to: Clipped@Oracle2026${NC}"
  echo "  (Change this after first login in Dashboard → Settings → Security)"
else
  echo -e "${GREEN}✓ .env exists.${NC}"

  # Check required keys are not empty
  MISSING=()
  JWT_VAL=$(grep "^JWT_SECRET=" "$OMNIROUTE_DIR/.env" | cut -d= -f2-)
  API_VAL=$(grep "^API_KEY_SECRET=" "$OMNIROUTE_DIR/.env" | cut -d= -f2-)
  [ -z "$JWT_VAL" ] && MISSING+=("JWT_SECRET")
  [ -z "$API_VAL" ] && MISSING+=("API_KEY_SECRET")

  if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Missing required secrets: ${MISSING[*]} — auto-filling...${NC}"
    JWT_SECRET=$(openssl rand -base64 48)
    API_KEY_SECRET=$(openssl rand -hex 32)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$OMNIROUTE_DIR/.env"
    sed -i "s|^API_KEY_SECRET=.*|API_KEY_SECRET=$API_KEY_SECRET|" "$OMNIROUTE_DIR/.env"
    echo -e "${GREEN}✓ Secrets filled in.${NC}"
  fi
fi

# --- Step 3: Check dependencies installed ---
echo ""
echo "▶ [3/6] Checking node_modules..."
if [ ! -d "$OMNIROUTE_DIR/node_modules" ]; then
  echo -e "${YELLOW}⚠ node_modules missing — installing...${NC}"
  cd "$OMNIROUTE_DIR" && npm install --production 2>&1 | tail -5
  echo -e "${GREEN}✓ Dependencies installed.${NC}"
else
  echo -e "${GREEN}✓ node_modules present.${NC}"
fi

# --- Step 4: Open port 20128 in iptables ---
echo ""
echo "▶ [4/6] Checking iptables for port 20128..."
if sudo iptables -C INPUT -p tcp --dport 20128 -j ACCEPT 2>/dev/null; then
  echo -e "${GREEN}✓ Port 20128 already open in iptables.${NC}"
else
  echo -e "${YELLOW}⚠ Port 20128 not open — adding rule...${NC}"
  sudo iptables -I INPUT -p tcp --dport 20128 -j ACCEPT
  # Try to persist it
  if command -v netfilter-persistent &>/dev/null; then
    sudo netfilter-persistent save
  elif command -v iptables-save &>/dev/null; then
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
  fi
  echo -e "${GREEN}✓ Port 20128 opened.${NC}"
fi

# --- Step 5: Restart PM2 process ---
echo ""
echo "▶ [5/6] Restarting PM2 process 'omniroute-gateway'..."
if command -v pm2 &>/dev/null; then
  cd "$(dirname "$OMNIROUTE_DIR")"

  if pm2 show omniroute-gateway > /dev/null 2>&1; then
    pm2 restart omniroute-gateway
    echo -e "${GREEN}✓ PM2 process restarted.${NC}"
  else
    echo -e "${YELLOW}⚠ Process not found in PM2 — starting fresh from ecosystem.config.js...${NC}"
    pm2 start ecosystem.config.js --only omniroute-gateway
    echo -e "${GREEN}✓ PM2 process started.${NC}"
  fi
  pm2 save
else
  echo -e "${RED}✗ PM2 not found. Install it: npm install -g pm2${NC}"
  exit 1
fi

# --- Step 6: Health check ---
echo ""
echo "▶ [6/6] Running health check on http://localhost:20128..."
sleep 4  # Give the process time to boot

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:20128 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "302" ] || [ "$HTTP_STATUS" == "401" ]; then
  echo -e "${GREEN}✓ OmniRoute is UP and responding (HTTP $HTTP_STATUS)${NC}"
  echo ""
  echo "======================================================"
  echo -e "${GREEN}  SUCCESS! OmniRoute is running.${NC}"
  echo "  Access it at: http://150.230.139.174:20128"
  echo "  Dashboard password: Clipped@Oracle2026"
  echo "  (if you just created the .env for the first time)"
  echo "======================================================"
else
  echo -e "${RED}✗ Health check failed (HTTP $HTTP_STATUS). Showing last 30 log lines:${NC}"
  echo ""
  pm2 logs omniroute-gateway --lines 30 --nostream
  echo ""
  echo "  → Paste the log output above for further diagnosis."
fi
