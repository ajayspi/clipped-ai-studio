import urllib.request
import json
import os

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibmVldGZ1YnliemxldXdoYm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzM0OTQ3MCwiZXhwIjoyMTAyOTI1NDcwfQ.w5J5ybitjIhPZpWt6OEPuyUm0iqSCk8qtesryC-sRBo"

def fetch_table(table_name):
    print(f"Fetching {table_name}...")
    url = f"https://xbneetfubybzleuwhbnx.supabase.co/rest/v1/{table_name}?select=*"
    req = urllib.request.Request(url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"HTTPError on {table_name}: {e.code} {e.reason}")

fetch_table("api_keys")
fetch_table("settings")
