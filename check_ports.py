import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.236.176.251', port=22, username='root', key_filename=r'C:\Users\vigilare\Downloads\Other\ssh-key-2026-08-22.key')
stdin, stdout, stderr = client.exec_command('apt-get install -y net-tools >/dev/null 2>&1; netstat -tulnp')
print(stdout.read().decode('ascii', 'ignore'))
client.close()
