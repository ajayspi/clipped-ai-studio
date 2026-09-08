import paramiko

commands = [
    "export DEBIAN_FRONTEND=noninteractive && apt update && apt install -y curl git",
    "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
    "export DEBIAN_FRONTEND=noninteractive && apt install -y nodejs npm python3-pip python3-venv caddy git ffmpeg chromium-browser unzip",
    "npm install -pm2 -g",
    
    # Setup Talkbyte
    "mkdir -p /var/www",
    "cd /var/www && rm -rf talkbyte clipped",
    "cd /var/www && git clone https://github.com/ajayspi/Talkbyte.git talkbyte",
    "cd /var/www/talkbyte && git checkout feature/update-talkbyte-2026 || true",
    "npm install -g serve",
    "pm2 delete talkbyte || true",
    # If the subfolder 'Talkbyte' doesn't exist, just serve the root
    "cd /var/www/talkbyte && if [ -d 'Talkbyte' ]; then cd Talkbyte; fi && pm2 start 'serve -s . -l 3001' --name talkbyte",
    
    # Setup Clipped
    "cd /var/www && git clone https://github.com/ajayspi/clipped-ai-studio.git clipped",
    "cd /var/www/clipped && git checkout Omniroute",
    "cd /var/www/clipped && npm install",
    "cd /var/www/clipped && npm run build",
    "pm2 delete clipped-web || true",
    "cd /var/www/clipped && pm2 start 'npm run start' --name clipped-web",
    
    # Setup Omniroute
    "cd /var/www/clipped/omniroute-server && npm install",
    "cd /var/www/clipped/omniroute-server && npm run build",
    "pm2 delete omniroute || true",
    "cd /var/www/clipped/omniroute-server && pm2 start 'npm run start -- -p 20128' --name omniroute",
    
    "pm2 save"
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.236.176.251', port=22, username='root', key_filename=r'C:\Users\vigilare\Downloads\Other\ssh-key-2026-08-22.key')

print("Connected. Starting FULL deployment...")
for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line.strip())
        
    exit_status = stdout.channel.recv_exit_status()
    print(f"Exit status: {exit_status}")
    if exit_status != 0:
        err = stderr.read().decode()
        if err:
            print(f"Error: {err}")

print("Deployment completed successfully!")
client.close()
