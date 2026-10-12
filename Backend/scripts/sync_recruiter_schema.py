import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import inspect, text
from app.database import engine, Base
from app import models

def sync_recruiter_schema():
    print("Synchronizing Recruiter and Company schema in PostgreSQL...")
    
    # 1. Base create all
    Base.metadata.create_all(bind=engine)
    print("Tables verified/created via Base.metadata.create_all.")

    # 2. Add any missing columns to existing tables if needed
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print("Existing tables:", sorted(existing_tables))

    with engine.connect() as conn:
        # Check recruiters table
        recruiter_cols = [c['name'] for c in inspector.get_columns('recruiters')]
        if 'company_id' not in recruiter_cols:
            print("Adding company_id column to recruiters table...")
            conn.execute(text("ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;"))
            conn.commit()

        # Check internship_postings table
        if 'internship_postings' in existing_tables:
            posting_cols = [c['name'] for c in inspector.get_columns('internship_postings')]
            if 'company_id' not in posting_cols:
                print("Adding company_id column to internship_postings table...")
                conn.execute(text("ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;"))
                conn.commit()
            if 'duration' not in posting_cols:
                print("Adding duration column to internship_postings table...")
                conn.execute(text("ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS duration VARCHAR DEFAULT '6 Months';"))
                conn.commit()
            if 'application_threshold' not in posting_cols:
                print("Adding application_threshold column to internship_postings table...")
                conn.execute(text("ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS application_threshold INTEGER DEFAULT 80;"))
                conn.execute(text("UPDATE internship_postings SET application_threshold = 80 WHERE application_threshold IS NULL;"))
                conn.commit()

        # Check internship_listings table
        if 'internship_listings' in existing_tables:
            listing_cols = [c['name'] for c in inspector.get_columns('internship_listings')]
            if 'application_threshold' not in listing_cols:
                print("Adding application_threshold column to internship_listings table...")
                conn.execute(text("ALTER TABLE internship_listings ADD COLUMN IF NOT EXISTS application_threshold INTEGER DEFAULT 80;"))
                conn.execute(text("UPDATE internship_listings SET application_threshold = 80 WHERE application_threshold IS NULL;"))
                conn.commit()

        # Check internship_applications table
        if 'internship_applications' in existing_tables:
            app_cols = [c['name'] for c in inspector.get_columns('internship_applications')]
            if 'application_threshold_at_apply' not in app_cols:
                print("Adding application_threshold_at_apply column to internship_applications table...")
                conn.execute(text("ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS application_threshold_at_apply INTEGER DEFAULT 80;"))
                conn.commit()
            if 'eligibility_snapshot' not in app_cols:
                print("Adding eligibility_snapshot column to internship_applications table...")
                conn.execute(text("ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS eligibility_snapshot VARCHAR;"))
                conn.commit()
            if 'company_id' not in app_cols:
                print("Adding company_id column to internship_applications table...")
                conn.execute(text("ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;"))
                conn.commit()
            conn.execute(text("ALTER TABLE internship_applications DROP CONSTRAINT IF EXISTS internship_applications_internship_id_fkey;"))
            conn.commit()

    print("Schema sync completed successfully.")

if __name__ == "__main__":
    sync_recruiter_schema()
