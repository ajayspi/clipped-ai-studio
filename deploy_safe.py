import paramiko

script = """
set -e
export DEBIAN_FRONTEND=noninteractive
mkdir -p /var/www

echo "Starting Talkbyte deployment..."
cd /var/www
if [ ! -d "talkbyte" ]; then git clone https://github.com/ajayspi/Talkbyte.git talkbyte; fi
cd talkbyte
git fetch origin
git checkout feature/update-talkbyte-2026 || true
git pull origin feature/update-talkbyte-2026 || true
pm2 delete talkbyte || true
if [ -d 'Talkbyte' ]; then cd Talkbyte; fi
pm2 start 'serve -s . -l 3001' --name talkbyte || true

echo "Starting Clipped deployment..."
cd /var/www
if [ ! -d "clipped" ]; then git clone https://github.com/ajayspi/clipped-ai-studio.git clipped; fi
cd clipped
git fetch origin
git checkout Omniroute || true
git pull origin Omniroute || true
npm install --legacy-peer-deps
npm run build || true
pm2 delete clipped-web || true
pm2 start 'npm run start' --name clipped-web || true

echo "Starting Omniroute deployment..."
cd /var/www/clipped/omniroute-server
npm install --legacy-peer-deps
npm run build || true
pm2 delete omniroute || true
pm2 start 'npm run start -- -p 20128' --name omniroute || true

pm2 save
echo "ALL DONE!"
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.236.176.251', port=22, username='root', key_filename=r'C:\Users\vigilare\Downloads\Other\ssh-key-2026-08-22.key')

with open("deploy.log", "w", encoding="utf-8") as log:
    stdin, stdout, stderr = client.exec_command(f"bash -c '{script}'", get_pty=True)
    
    while True:
        line = stdout.readline()
        if not line:
            break
        log.write(line)
        log.flush()

    status = stdout.channel.recv_exit_status()
    log.write(f"\\nEXIT STATUS: {status}\\n")

client.close()
