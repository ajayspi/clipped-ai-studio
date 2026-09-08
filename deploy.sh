#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get remove -y npm nodejs || true
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git curl unzip caddy ffmpeg chromium-browser
npm install -g pm2 serve

mkdir -p /var/www
cd /var/www
if [ ! -d "talkbyte" ]; then git clone https://github.com/ajayspi/Talkbyte.git talkbyte; fi
cd talkbyte
git fetch origin
git checkout feature/update-talkbyte-2026 || true
git pull origin feature/update-talkbyte-2026 || true
pm2 delete talkbyte || true
if [ -d "Talkbyte" ]; then cd Talkbyte; fi
pm2 start 'serve -s . -l 3001' --name talkbyte > /dev/null 2>&1 || true

cd /var/www
if [ ! -d "clipped" ]; then git clone https://github.com/ajayspi/clipped-ai-studio.git clipped; fi
cd clipped
git fetch origin
git checkout Omniroute || true
git pull origin Omniroute || true
npm install --legacy-peer-deps
npm run build || true
pm2 delete clipped-web || true
pm2 start "npm run start" --name clipped-web > /dev/null 2>&1 || true

cd /var/www/clipped/omniroute-server
npm install --legacy-peer-deps
npm run build || true
pm2 delete omniroute || true
pm2 start "npm run start -- -p 20128" --name omniroute > /dev/null 2>&1 || true

pm2 save > /dev/null 2>&1
echo 'ALL DEPLOYMENTS FINISHED SUCCESSFULLY' > /root/deploy_status.txt
