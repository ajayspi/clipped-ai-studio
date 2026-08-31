import urllib.request
import json
import os

url = "https://xbneetfubybzleuwhbnx.supabase.co/rest/v1/settings?select=provider,api_key"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibmVldGZ1YnliemxldXdoYm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzM0OTQ3MCwiZXhwIjoyMTAyOTI1NDcwfQ.w5J5ybitjIhPZpWt6OEPuyUm0iqSCk8qtesryC-sRBo"

req = urllib.request.Request(url)
req.add_header("apikey", key)
req.add_header("Authorization", f"Bearer {key}")
req.add_header("Content-Type", "application/json")

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
