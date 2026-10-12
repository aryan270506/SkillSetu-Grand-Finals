import logging
from sqlalchemy import text
from app.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_live_snapshots")

def migrate():
    with engine.begin() as conn:
        logger.info("Migrating snapshot columns for live opportunities...")
        
        # 1. saved_internships
        conn.execute(text("""
            ALTER TABLE saved_internships ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'external';
            ALTER TABLE saved_internships ADD COLUMN IF NOT EXISTS source_id VARCHAR;
            ALTER TABLE saved_internships ADD COLUMN IF NOT EXISTS title_snapshot VARCHAR;
            ALTER TABLE saved_internships ADD COLUMN IF NOT EXISTS organization_snapshot VARCHAR;
            ALTER TABLE saved_internships ADD COLUMN IF NOT EXISTS source_url VARCHAR;
            ALTER TABLE saved_internships ADD COLUMN IF NOT EXISTS application_url VARCHAR;
            ALTER TABLE saved_internships ALTER COLUMN internship_id DROP NOT NULL;
        """))

        # 2. internship_applications
        conn.execute(text("""
            ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'external';
            ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS source_id VARCHAR;
            ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS title_snapshot VARCHAR;
            ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS company_snapshot VARCHAR;
            ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS source_url_snapshot VARCHAR;
            ALTER TABLE internship_applications ADD COLUMN IF NOT EXISTS application_url_snapshot VARCHAR;
            ALTER TABLE internship_applications ALTER COLUMN internship_id DROP NOT NULL;
        """))

        # 3. saved_scholarships
        conn.execute(text("""
            ALTER TABLE saved_scholarships ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'external';
            ALTER TABLE saved_scholarships ADD COLUMN IF NOT EXISTS source_id VARCHAR;
            ALTER TABLE saved_scholarships ADD COLUMN IF NOT EXISTS name_snapshot VARCHAR;
            ALTER TABLE saved_scholarships ADD COLUMN IF NOT EXISTS provider_snapshot VARCHAR;
            ALTER TABLE saved_scholarships ADD COLUMN IF NOT EXISTS source_url VARCHAR;
            ALTER TABLE saved_scholarships ADD COLUMN IF NOT EXISTS application_url VARCHAR;
            ALTER TABLE saved_scholarships ALTER COLUMN scholarship_id DROP NOT NULL;
        """))

        # 4. scholarship_applications
        conn.execute(text("""
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'external';
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS source_id VARCHAR;
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS name_snapshot VARCHAR;
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS provider_snapshot VARCHAR;
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS source_url_snapshot VARCHAR;
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS application_url_snapshot VARCHAR;
            ALTER TABLE scholarship_applications ADD COLUMN IF NOT EXISTS eligibility_status_at_apply VARCHAR DEFAULT 'ELIGIBLE';
            ALTER TABLE scholarship_applications ALTER COLUMN scholarship_id DROP NOT NULL;
        """))

        # 5. Clear any persistent scraped catalogs to guarantee zero scraped opportunity data stored in DB
        conn.execute(text("""
            TRUNCATE TABLE internship_required_skills CASCADE;
            TRUNCATE TABLE internship_listings CASCADE;
            TRUNCATE TABLE scholarship_eligibility_rules CASCADE;
            TRUNCATE TABLE scholarships CASCADE;
        """))

        logger.info("✅ Live opportunities snapshot migration completed successfully!")

if __name__ == "__main__":
    migrate()
