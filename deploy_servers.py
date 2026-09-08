import paramiko
import time

commands = [
    "mkdir -p /var/www",
    "cd /var/www && rm -rf talkbyte clipped",
    
    # Talkbyte
    "cd /var/www && git clone https://github.com/ajayspi/Talkbyte.git talkbyte",
    "cd /var/www/talkbyte && git checkout feature/update-talkbyte-2026",
    "npm install -g serve",
    "pm2 delete talkbyte || true",
    "cd /var/www/talkbyte/Talkbyte && pm2 start 'serve -s . -l 3001' --name talkbyte",
    
    # Clipped
    "cd /var/www && git clone https://github.com/ajayspi/clipped-ai-studio.git clipped",
    "cd /var/www/clipped && git checkout Omniroute",
    "cd /var/www/clipped && npm install",
    "cd /var/www/clipped && npm run build",
    "pm2 delete clipped-web || true",
    "cd /var/www/clipped && pm2 start 'npm run start' --name clipped-web",
    
    # Omniroute
    "cd /var/www/clipped/omniroute-server && npm install",
    "cd /var/www/clipped/omniroute-server && npm run build",
    "pm2 delete omniroute || true",
    "cd /var/www/clipped/omniroute-server && pm2 start 'npm run start -- -p 20128' --name omniroute",
    
    "pm2 save"
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.236.176.251', port=22, username='root', key_filename=r'C:\Users\vigilare\Downloads\Other\ssh-key-2026-08-22.key')

print("Connected. Starting deployment...")
for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Stream output
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
