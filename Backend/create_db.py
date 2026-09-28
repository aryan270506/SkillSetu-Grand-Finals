import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    conn = psycopg2.connect(user="postgres", password="Harsh@2006", host="localhost", port="5432", dbname="postgres")
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE skillsetu")
    print("Database skillsetu created successfully")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
