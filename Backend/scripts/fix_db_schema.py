import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from sqlalchemy import text

def fix_schema():
    queries = [
        "ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;",
        "ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL;",
        "ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL;",
        "ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS rejection_reason TEXT;",
        "SELECT setval(pg_get_serial_sequence('recruiters', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM recruiters;",
        "SELECT setval(pg_get_serial_sequence('admin_users', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM admin_users;"
    ]
    with engine.begin() as conn:
        for q in queries:
            print(f"Executing: {q}")
            conn.execute(text(q))
    print("Recruiter columns successfully updated in PostgreSQL database.")

if __name__ == "__main__":
    fix_schema()
