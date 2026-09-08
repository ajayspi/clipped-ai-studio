import paramiko
import sys

hostname = "172.236.176.251"
username = "root"
password = "9700675637Ajkk"

pub_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDOaYlrCd/g54qNCl+D8oTIjJREyeAwaxKysY5R8nzIE+ui0gevNrfOyzGrIDsbMrlFcpGklVV9LY3ouFubr3LyvVwQn3U6/Km60wzyNd/MrscyWNywUTpi1ZrifGxlC8zHcqE7xZszEwLwGmTFvATO29OeIqEXJ8YrOPChoPHXRDvU38ThA02MFSTKFLxDYuTn6utTtEu169jPcC5ocEeN/+39C6sb0w4iI4oLtFutdBh9QBJjlOtyI2amg2IjjvA8Y/0YJHf7uD8gZCNW7ifhzSu6kQvPSDYwkPt2QYsWnY8RFy/G/6L6ee9eVBEpjFGyuBVqP6udApmTifH10csl ssh-key-2026-08-22"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting...")
    client.connect(hostname, port=22, username=username, password=password, timeout=10)
    print("Connected successfully!")
    
    # Run a test command
    stdin, stdout, stderr = client.exec_command("uname -a")
    print("OS:", stdout.read().decode().strip())
    
    # Inject key
    command = f"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    stdin, stdout, stderr = client.exec_command(command)
    print("Key injected.")
    
except Exception as e:
    print(f"Failed: {e}")
finally:
    client.close()
