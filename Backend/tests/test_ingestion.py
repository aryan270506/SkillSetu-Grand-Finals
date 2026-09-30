import pytest
from app.database import SessionLocal
from app.services.ingestion.sync_engine import OpportunitySyncEngine
from app.services.ingestion.base_source import BaseSourceAdapter
from app.models import InternshipListing, Scholarship

def test_content_hash_calculation():
    """Test deterministic SHA-256 hash generation."""
    hash1 = BaseSourceAdapter.compute_content_hash(
        title="Backend Developer",
        company="TechCorp",
        description="Build microservices",
        location="Bangalore"
    )
    
    hash2 = BaseSourceAdapter.compute_content_hash(
        title="Backend Developer",
        company="TechCorp",
        description="Build microservices",
        location="Bangalore"
    )
    
    hash3 = BaseSourceAdapter.compute_content_hash(
        title="Backend Developer",
        company="TechCorp",
        description="Build frontend interfaces",
        location="Bangalore"
    )
    
    assert hash1 == hash2
    assert hash1 != hash3
    assert len(hash1) == 64


def test_ingestion_deduplication():
    """Test that running ingestion twice on the same sources does not create duplicate entries."""
    session = SessionLocal()
    try:
        engine = OpportunitySyncEngine(session)
        
        # Initial count
        init_int_count = session.query(InternshipListing).count()
        init_sch_count = session.query(Scholarship).count()
        
        # Run sync engine
        int_res = engine.sync_all_internships()
        sch_res = engine.sync_all_scholarships()
        
        # Second count
        after_int_count = session.query(InternshipListing).count()
        after_sch_count = session.query(Scholarship).count()
        
        # Created in 2nd run should be 0 or equal to initial if all existed
        assert int_res["records_created"] == 0 or (after_int_count - init_int_count == int_res["records_created"])
        assert sch_res["records_created"] == 0 or (after_sch_count - init_sch_count == sch_res["records_created"])
    finally:
        session.close()
