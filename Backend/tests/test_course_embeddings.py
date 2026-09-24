import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from sqlalchemy.orm import Session
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

from app import models
from app.database import SessionLocal
from app.services import (
    course_service,
    embedding_service,
    course_embedding_service,
    course_search_service,
)
from app.schemas.course import NormalizedCourse
from app.workers.embed_courses import run_course_embedding


@pytest.fixture(scope="function")
def db_session():
    """Provides a transactional database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def memory_qdrant():
    """Provides an isolated in-memory Qdrant client for tests."""
    client = QdrantClient(":memory:")
    collection_name = "test_courses"
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    return client, collection_name


# ===========================================================================
# 1. Embedding Text Builder & Hash Tests
# ===========================================================================
def test_build_course_embedding_text():
    course = models.Course(
        id=101,
        title="Deep Learning and Neural Networks",
        description="Comprehensive course on neural networks and backpropagation.",
        instructor="Prof. Andrew",
        institution="Stanford",
        level="Intermediate",
        language="English",
        duration=10.0,
        duration_unit="weeks",
    )
    skills = [
        models.CourseSkill(skill_name="neural networks", esco_skill_id=123, confidence=0.95),
        models.CourseSkill(skill_name="deep learning", esco_skill_id=456, confidence=0.92),
        models.CourseSkill(skill_name="Backpropagation Algorithm", esco_skill_id=None, confidence=0.65),
    ]

    text = course_embedding_service.build_course_embedding_text(course, skills)

    assert "Course Title:\nDeep Learning and Neural Networks" in text
    assert "neural networks and backpropagation" in text
    assert "Institution: Stanford" in text
    assert "Instructor: Prof. Andrew"
    assert "Duration: 10.0 weeks" in text
    assert "ESCO Skills:\ndeep learning\nneural networks" in text
    assert "Candidate Skills:\nBackpropagation Algorithm" in text

    # Determinism test
    text_second = course_embedding_service.build_course_embedding_text(course, skills)
    assert text == text_second

    # Hash determinism
    hash1 = course_embedding_service.calculate_embedding_hash(text)
    hash2 = course_embedding_service.calculate_embedding_hash(text_second)
    assert hash1 == hash2
    assert len(hash1) == 64


# ===========================================================================
# 2. Embedding Service Unit Tests
# ===========================================================================
def test_embedding_dimensions_and_empty_handling():
    dim = embedding_service.get_embedding_dimension()
    assert dim == 384

    # Empty text returns zero vector of correct dimension
    zero_vec = embedding_service.embed_text("")
    assert len(zero_vec) == 384
    assert all(v == 0.0 for v in zero_vec)

    zero_vec_spaces = embedding_service.embed_text("   \n\t  ")
    assert len(zero_vec_spaces) == 384
    assert all(v == 0.0 for v in zero_vec_spaces)


def test_embed_texts_mocked():
    mock_vec = [0.1] * 384
    with patch.object(embedding_service, "get_embedding_model") as mock_get_model:
        mock_model = MagicMock()
        mock_model.embed.return_value = [mock_vec, mock_vec]
        mock_get_model.return_value = mock_model

        results = embedding_service.embed_texts(["course one", "course two"])
        assert len(results) == 2
        assert len(results[0]) == 384
        assert len(results[1]) == 384


# ===========================================================================
# 3. Qdrant Collection & Point Management Tests
# ===========================================================================
def test_qdrant_collection_creation_and_reuse():
    client = QdrantClient(":memory:")
    col_name = "skillsetu_test_collection"

    # First call creates collection
    created = course_embedding_service.ensure_course_collection(
        client=client, collection_name=col_name, vector_size=384
    )
    assert created is True
    assert client.collection_exists(col_name) is True

    # Second call reuses existing collection
    reused = course_embedding_service.ensure_course_collection(
        client=client, collection_name=col_name, vector_size=384
    )
    assert reused is True


def test_qdrant_point_idempotency(memory_qdrant):
    client, col_name = memory_qdrant

    prov = models.Provider(id=1, name="NPTEL", slug="nptel")
    course = models.Course(
        id=77,
        provider_id=1,
        external_id="ext-77",
        title="Aircraft Propulsion",
        provider=prov,
        level="Undergraduate",
        is_active=True,
    )
    skills = [
        models.CourseSkill(skill_name="aerodynamics", esco_skill_id=7059, confidence=0.9),
        models.CourseSkill(skill_name="Rocket Dynamics", esco_skill_id=None, confidence=0.6)
    ]
    mock_vector = [0.05] * 384

    # First upsert
    course_embedding_service.upsert_course_point(
        client=client,
        course=course,
        vector=mock_vector,
        skills=skills,
        collection_name=col_name
    )

    info = client.get_collection(col_name)
    assert info.points_count == 1

    # Second upsert (same course.id -> point_id 77)
    course_embedding_service.upsert_course_point(
        client=client,
        course=course,
        vector=mock_vector,
        skills=skills,
        collection_name=col_name
    )

    info_after = client.get_collection(col_name)
    assert info_after.points_count == 1  # No duplicate point created


# ===========================================================================
# 4. Worker Dry Run & Live Embedding Tests
# ===========================================================================
def test_worker_dry_run_and_change_detection(db_session: Session, memory_qdrant):
    client, col_name = memory_qdrant
    course_service.seed_default_providers(db_session)

    test_ext_id = "embed-test-unique-01"
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()

    # Create test course
    course_data = NormalizedCourse(
        provider_slug="nptel",
        external_id=test_ext_id,
        title="Computational Fluid Dynamics",
        description="Finite element methods for fluid dynamics",
        url=f"https://nptel.ac.in/courses/{test_ext_id}",
    )
    course = course_service.upsert_course(db_session, course_data)
    
    # Add course skill
    cs = models.CourseSkill(course_id=course.id, skill_name="fluid mechanics", esco_skill_id=7384, confidence=0.95)
    db_session.add(cs)
    db_session.commit()

    mock_vec = [0.02] * 384
    with patch.object(embedding_service, "embed_texts", return_value=[mock_vec]):
        # 1. Dry run
        dry_stats = run_course_embedding(
            db=db_session,
            dry_run=True,
            course_id=course.id,
            qdrant_client=client
        )
        assert dry_stats["dry_run"] is True
        assert dry_stats["status"] == "completed"

        # Verify DB not updated in dry run
        c_check = db_session.query(models.Course).filter(models.Course.id == course.id).first()
        assert c_check.embedding_indexed_at is None

        # 2. Live embedding
        with patch.object(course_embedding_service.settings, "QDRANT_COLLECTION_COURSES", col_name):
            live_stats = run_course_embedding(
                db=db_session,
                dry_run=False,
                course_id=course.id,
                qdrant_client=client
            )
            assert live_stats["status"] == "completed"
            assert live_stats["vectors_created"] == 1

            # Verify DB updated
            db_session.refresh(c_check)
            assert c_check.embedding_status == "indexed"
            assert c_check.embedding_content_hash is not None
            assert c_check.embedding_indexed_at is not None

            # 3. Second run with unchanged hash -> SKIP
            second_stats = run_course_embedding(
                db=db_session,
                dry_run=False,
                course_id=course.id,
                qdrant_client=client
            )
            assert second_stats["vectors_skipped"] == 1

    # Cleanup
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()


# ===========================================================================
# 5. Semantic Search Service Tests
# ===========================================================================
def test_semantic_search_retrieves_postgresql_records(db_session: Session, memory_qdrant):
    client, col_name = memory_qdrant
    course_service.seed_default_providers(db_session)

    test_ext_id = "search-test-unique-01"
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()

    course_data = NormalizedCourse(
        provider_slug="nptel",
        external_id=test_ext_id,
        title="Introduction to Aerodynamics",
        description="Fundamental principles of lift and drag in aerodynamics.",
        url=f"https://nptel.ac.in/courses/{test_ext_id}",
        instructor="Prof. Aero",
        institution="IIT Madras",
        level="Undergraduate",
    )
    course = course_service.upsert_course(db_session, course_data)
    
    cs = models.CourseSkill(course_id=course.id, skill_name="aerodynamics", esco_skill_id=7059, confidence=0.98)
    db_session.add(cs)
    db_session.commit()

    mock_vec = [0.1] * 384
    course_embedding_service.upsert_course_point(
        client=client,
        course=course,
        vector=mock_vec,
        skills=[cs],
        collection_name=col_name
    )

    with patch.object(embedding_service, "embed_text", return_value=mock_vec), \
         patch.object(course_embedding_service.settings, "QDRANT_COLLECTION_COURSES", col_name):

        results = course_search_service.search_courses(
            db=db_session,
            query="aerodynamics flight",
            limit=5,
            client=client,
            collection_name=col_name
        )

        assert len(results) >= 1
        top_res = results[0]
        assert top_res["course_id"] == course.id
        assert top_res["title"] == "Introduction to Aerodynamics"
        assert top_res["provider"] == "nptel"
        assert "aerodynamics" in top_res["skills"]
        assert top_res["similarity_score"] > 0.0

    # Cleanup
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()


# ===========================================================================
# 6. Failure Isolation Test
# ===========================================================================
def test_worker_failure_isolation(db_session: Session, memory_qdrant):
    client, col_name = memory_qdrant
    course_service.seed_default_providers(db_session)

    id1 = "fail-iso-01"
    id2 = "fail-iso-02"
    for x in [id1, id2]:
        db_session.query(models.Course).filter(models.Course.external_id == x).delete()
    db_session.commit()

    c1 = course_service.upsert_course(db_session, NormalizedCourse(
        provider_slug="nptel", external_id=id1, title="Good Course 1", url="https://nptel.ac.in/1"
    ))
    c2 = course_service.upsert_course(db_session, NormalizedCourse(
        provider_slug="nptel", external_id=id2, title="Good Course 2", url="https://nptel.ac.in/2"
    ))

    # Mock embed_texts to fail on first call then succeed
    call_count = 0
    def mock_embed(texts):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("Temporary ONNX runtime glitch")
        return [[0.05] * 384] * len(texts)

    with patch.object(embedding_service, "embed_texts", side_effect=mock_embed), \
         patch.object(course_embedding_service.settings, "QDRANT_COLLECTION_COURSES", col_name):

        # Process first course (will fail)
        stats1 = run_course_embedding(db=db_session, dry_run=False, course_id=c1.id, qdrant_client=client)
        assert stats1["failures"] == 1

        # Process second course (must succeed despite previous failure)
        stats2 = run_course_embedding(db=db_session, dry_run=False, course_id=c2.id, qdrant_client=client)
        assert stats2["vectors_created"] == 1
        assert stats2["failures"] == 0

    # Cleanup
    for x in [id1, id2]:
        db_session.query(models.Course).filter(models.Course.external_id == x).delete()
    db_session.commit()


# ===========================================================================
# 7. Semantic Search API Test
# ===========================================================================
def test_semantic_search_api_endpoint(db_session: Session, memory_qdrant):
    q_client, col_name = memory_qdrant
    course_service.seed_default_providers(db_session)

    test_ext_id = "api-search-01"
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()

    course = course_service.upsert_course(db_session, NormalizedCourse(
        provider_slug="nptel",
        external_id=test_ext_id,
        title="Machine Learning Foundations",
        description="Core machine learning algorithms and neural networks",
        url=f"https://nptel.ac.in/{test_ext_id}"
    ))

    cs = models.CourseSkill(course_id=course.id, skill_name="machine learning", esco_skill_id=11842, confidence=0.99)
    db_session.add(cs)
    db_session.commit()

    mock_vec = [0.08] * 384
    course_embedding_service.upsert_course_point(
        client=q_client,
        course=course,
        vector=mock_vec,
        skills=[cs],
        collection_name=col_name
    )

    with patch("app.services.course_embedding_service.get_qdrant_client", return_value=q_client), \
         patch.object(embedding_service, "embed_text", return_value=mock_vec), \
         patch.object(course_embedding_service.settings, "QDRANT_COLLECTION_COURSES", col_name):

        from fastapi.testclient import TestClient
        from main import app
        test_client = TestClient(app)
        response = test_client.get("/api/v1/courses/search?q=machine+learning&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["query"] == "machine learning"
        assert len(data["results"]) >= 1
        assert data["results"][0]["course_id"] == course.id
        assert data["results"][0]["title"] == "Machine Learning Foundations"

    # Cleanup
    db_session.query(models.Course).filter(models.Course.external_id == test_ext_id).delete()
    db_session.commit()

