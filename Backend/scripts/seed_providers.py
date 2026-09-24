"""
Seed default course providers (NPTEL, Coursera, Udemy, YouTube) into PostgreSQL.
Safe and idempotent.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.services.course_service import seed_default_providers


def main():
    db = SessionLocal()
    try:
        print("🌱 Seeding default course providers...")
        providers = seed_default_providers(db)
        print(f"✅ Success! {len(providers)} providers verified/seeded in PostgreSQL:")
        for p in providers:
            print(f"   • [{p.id}] {p.name} (slug: '{p.slug}', type: '{p.type}', url: '{p.base_url}')")
    except Exception as e:
        print(f"❌ Error seeding providers: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
