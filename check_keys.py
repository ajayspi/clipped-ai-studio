import psycopg2
import json

def get_keys():
    try:
        conn = psycopg2.connect(
            dbname="clipped",
            user="postgres",
            password="postgrespassword",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        cur.execute("SELECT provider, api_key FROM settings;")
        rows = cur.fetchall()
        for row in rows:
            print(f"Provider: {row[0]}")
            print(f"API Key: {row[1]}")
            print("-" * 30)
            
        if not rows:
            print("No API keys found in the settings table.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_keys()
