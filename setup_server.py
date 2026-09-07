import paramiko
import time

commands = [
    "apt update && apt upgrade -y",
    "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
    "apt install -y nodejs npm python3-pip python3-venv caddy git",
    "npm install -pm2 -g",
    "pm2 startup systemd -u root --hp /root",
    "pm2 save"
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.236.176.251', port=22, username='root', password='Clipp3dAI!2026Server')

print("Connected. Starting setup...")
for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Wait for command to finish
    exit_status = stdout.channel.recv_exit_status()
    print(f"Exit status: {exit_status}")
    if exit_status != 0:
        print(f"Error: {stderr.read().decode()}")

print("Setup completed successfully!")
client.close()
