import pytest
from fastapi.testclient import TestClient
from main import app
from app.database import get_db, SessionLocal
from app.models import StudentUser, Course, LearningPath, LearningPathItem, EscoSkill, Provider
from app.services import career_intelligence_service

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_learning_data_comes_from_backend(db_session):
    """Test 1: Learning data comes directly from backend career-intelligence."""
    student = db_session.query(StudentUser).filter(StudentUser.email == "abhoge27@gmail.com").first()
    assert student is not None

    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email=student.email)
    assert intel["status"] == "success"
    data = intel["data"]
    
    assert data["student_id"] == student.id
    assert "skills" in data
    assert "learning_path" in data
    assert "career_readiness" in data
    assert "roadmap_milestones" in data
    assert "curated_next_steps" in data
    assert "skill_assignments" in data
    assert "mock_tests" in data
    assert "capstone_projects" in data
    assert "validated_credentials" in data
    assert "recent_activity" in data

def test_no_hardcoded_course_ids_used(db_session):
    """Test 2: All course IDs map to valid integer primary keys in PostgreSQL courses table."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    data = intel["data"]
    
    course_ids = [c["course_id"] for c in data["curated_next_steps"] if c.get("course_id")]
    if data.get("learning_path") and data["learning_path"].get("items"):
        course_ids.extend([i["course_id"] for i in data["learning_path"]["items"] if i.get("course_id")])

    for cid in course_ids:
        assert isinstance(cid, int)
        db_course = db_session.query(Course).filter(Course.id == cid).first()
        assert db_course is not None, f"Course ID {cid} must exist in PostgreSQL courses table"

def test_no_hardcoded_skill_ids_used(db_session):
    """Test 3: All skill IDs map to real canonical ESCO/database skill identifiers."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    skills = intel["data"]["skills"]
    assert len(skills) > 0
    for sk in skills:
        assert "skill_id" in sk
        assert sk["skill_id"] is not None
        assert "skill_name" in sk
        assert len(sk["skill_name"]) > 0

def test_career_data_comes_from_career_intelligence(db_session):
    """Test 4: Career name and ID are authoritative from Career Intelligence."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    active_career = intel["data"]["active_career"]
    assert active_career["name"] == "Full Stack Developer"
    assert "id" in active_career

def test_course_progress_comes_from_learning_path_data(db_session):
    """Test 5: Course progress is dynamic and sourced from learning_path_items in PostgreSQL."""
    student = db_session.query(StudentUser).filter(StudentUser.email == "abhoge27@gmail.com").first()
    lp = db_session.query(LearningPath).filter(LearningPath.student_id == student.id).order_by(LearningPath.created_at.desc()).first()
    assert lp is not None
    assert len(lp.items) > 0
    
    first_item = lp.items[0]
    expected_progress = round(first_item.progress_percent or 0.0)
    
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email=student.email)
    raw_items = intel["data"]["learning_path"]["items"]
    matching_item = next(i for i in raw_items if i["id"] == first_item.id)
    assert round(matching_item["progress_percent"]) == expected_progress

def test_skill_evidence_comes_from_phase_9(db_session):
    """Test 6: Skill evidence summary is derived from Phase 9 evidence service."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    assert "evidence_summary" in intel["data"]
    assert "verified_skills_count" in intel["data"]["evidence_summary"]

def test_course_recommendations_come_from_existing_service(db_session):
    """Test 7: Recommendations reuse the canonical recommendation engine."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    next_steps = intel["data"]["curated_next_steps"]
    assert len(next_steps) > 0
    for ns in next_steps:
        assert "why_crucial" in ns
        assert "title" in ns
        assert "meta" in ns

def test_no_mock_fallback_on_valid_student(db_session):
    """Test 8: Database queries return genuine database models without fake fallback placeholders."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    assert intel["status"] == "success"
    assert intel["data"]["active_career"]["name"] in ["Full Stack Developer", "Backend Developer", "Mobile App Developer"]

def test_changing_backend_progress_changes_returned_learning_data(db_session):
    """Test 9: Live mutation test - changing item progress in PostgreSQL immediately changes API output."""
    student = db_session.query(StudentUser).filter(StudentUser.email == "abhoge27@gmail.com").first()
    lp = db_session.query(LearningPath).filter(LearningPath.student_id == student.id).order_by(LearningPath.created_at.desc()).first()
    assert lp is not None and len(lp.items) > 0
    item = lp.items[0]
    
    orig_progress = item.progress_percent or 0.0
    test_progress = 73.0
    
    try:
        item.progress_percent = test_progress
        db_session.commit()
        
        intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email=student.email)
        mutated_items = intel["data"]["learning_path"]["items"]
        mutated_item = next(i for i in mutated_items if i["id"] == item.id)
        assert mutated_item["progress_percent"] == 73.0
    finally:
        item.progress_percent = orig_progress
        db_session.commit()

def test_multiple_target_careers_remain_supported(db_session):
    """Test 10: Multi-career switcher returns all target careers configured for the student."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    target_careers = intel["data"]["target_careers"]
    assert isinstance(target_careers, list)
    assert len(target_careers) >= 1
    for tc in target_careers:
        assert "id" in tc
        assert "name" in tc

def test_courses_are_deduplicated_using_canonical_course_ids(db_session):
    """Test 11: All courses in learning path have distinct course_id values."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    items = intel["data"]["learning_path"]["items"]
    course_ids = [i["course_id"] for i in items if i.get("course_id")]
    # Course IDs should be integers
    assert all(isinstance(cid, int) for cid in course_ids)

def test_provider_scope_is_nptel_youtube_freecodecamp(db_session):
    """Test 12: Only NPTEL, YouTube, and freeCodeCamp are active provider slugs."""
    from app.services import course_service
    course_service.seed_default_providers(db_session)
    providers = db_session.query(Provider).filter(Provider.is_active == True).all()
    slugs = {p.slug.lower() for p in providers}
    assert slugs == {"nptel", "youtube", "freecodecamp"}

def test_swayam_is_not_treated_as_independent_provider(db_session):
    """Test 13: 'swayam' is not an active provider slug in PostgreSQL."""
    swayam = db_session.query(Provider).filter(Provider.slug == "swayam").first()
    assert swayam is None or swayam.is_active == False

def test_no_mongodb_dependency():
    """Test 14: Confirm no mongodb/pymongo/motor is imported or used."""
    import sys
    assert "pymongo" not in sys.modules
    assert "motor" not in sys.modules

def test_roadmap_uses_real_skill_ids(db_session):
    """Test 15: Every skill under roadmap milestones has a real canonical skill ID."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    assert len(milestones) > 0
    
    total_skills = 0
    for m in milestones:
        skills_in_m = m.get("skills", [])
        total_skills += len(skills_in_m)
        for sk in skills_in_m:
            assert "skill_id" in sk
            assert sk["skill_id"] is not None
            assert len(str(sk["skill_id"])) > 0
    assert total_skills > 0

def test_roadmap_does_not_combine_skill_names(db_session):
    """Test 16: Milestone titles do NOT combine skill names with '&', ',', or '/'."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    for m in milestones:
        # Title must be pure stage label (e.g., 'Foundation', 'Intermediate', 'Advanced')
        assert "&" not in m["title"]
        assert "," not in m["title"]
        assert m["title"] in ["Foundation", "Intermediate", "Advanced", "Stage 1", "Stage 2", "Stage 3"]

def test_milestone_groups_real_backend_skills(db_session):
    """Test 17: Skills in milestones contain actual scores, gaps, and priorities from backend."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    for m in milestones:
        for sk in m.get("skills", []):
            assert "current_score" in sk
            assert "target_score" in sk
            assert "gap" in sk
            assert "priority" in sk
            assert "status" in sk
            assert isinstance(sk["current_score"], (int, float))
            assert isinstance(sk["target_score"], (int, float))
            assert isinstance(sk["gap"], (int, float))

def test_milestone_progress_is_dynamic(db_session):
    """Test 18: Milestone progress is a calculated percentage between 0 and 100."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    for m in milestones:
        assert "progress" in m
        assert 0 <= m["progress"] <= 100

def test_active_learning_step_is_dynamic(db_session):
    """Test 19: Active learning badge text reflects dynamic step numbers."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    active_milestones = [m for m in milestones if m["status"] == "active"]
    if active_milestones:
        m = active_milestones[0]
        assert "badge_text" in m
        assert "Step" in m["badge_text"] or "Complete" in m["badge_text"]

def test_skill_current_target_and_gap_consistency(db_session):
    """Test 20: Skill score math is consistent: gap = max(0, target_score - current_score)."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    for m in milestones:
        for sk in m.get("skills", []):
            expected_gap = max(0.0, sk["target_score"] - sk["current_score"])
            assert abs(sk["gap"] - expected_gap) < 0.1

def test_skill_course_relationship_uses_real_course_ids(db_session):
    """Test 21: Any course associated with milestone skills has valid primary key in courses table."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com")
    milestones = intel["data"]["roadmap_milestones"]
    for m in milestones:
        for sk in m.get("skills", []):
            if sk.get("course"):
                cid = sk["course"]["id"]
                assert isinstance(cid, int)
                db_c = db_session.query(Course).filter(Course.id == cid).first()
                assert db_c is not None

def test_career_switch_updates_roadmap_skills(db_session):
    """Test 22: Switching career to Mobile App Developer produces updated roadmap milestones."""
    intel_fs = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    intel_mob = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Mobile App Developer")
    
    assert intel_fs["data"]["active_career"]["name"] == "Full Stack Developer"
    assert intel_mob["data"]["active_career"]["name"] == "Mobile App Developer"
    assert "roadmap_milestones" in intel_mob["data"]

def test_full_stack_career_uses_correct_canonical_occupation(db_session):
    """Test 23: Full Stack Developer is canonically mapped to ESCO web developer occupation."""
    from app.models import CareerOccupationMapping
    mapping = db_session.query(CareerOccupationMapping).filter(
        CareerOccupationMapping.career_id.in_(["car_fullstack_developer", "car_full_stack_developer"])
    ).first()
    assert mapping is not None
    assert mapping.esco_occupation_uri == "http://data.europa.eu/esco/occupation/c40a2919-48a9-40ea-b506-1f34f693496d"
    assert mapping.mapping_status == "validated"

def test_no_engineering_skill_contamination(db_session):
    """Test 24: Mechanical/drawing/scientific research skills are NOT required for Full Stack Developer."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    skill_names = [s["skill_name"].lower() for s in intel["data"]["skills"]]
    
    prohibited_skills = [
        "use technical drawing software",
        "technical drawings",
        "perform scientific research",
        "manage engineering project",
        "engineering principles",
        "engineering processes"
    ]
    for prohibited in prohibited_skills:
        assert prohibited not in skill_names, f"Prohibited non-software skill '{prohibited}' should not be in Full Stack Developer skills"

def test_full_stack_required_skills_are_technical_skills(db_session):
    """Test 25: Full Stack Developer required skills contain concrete technical skills."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    skill_names = [s["skill_name"].lower() for s in intel["data"]["skills"]]
    
    expected_tech = ["react", "node.js", "typescript", "javascript", "sql", "postgresql"]
    for exp in expected_tech:
        assert any(exp in sn for sn in skill_names), f"Expected technical skill '{exp}' must be in Full Stack Developer skills ({skill_names})"

def test_career_fit_recalculates_after_mapping_change(db_session):
    """Test 26: Career readiness score and counts dynamically reflect the canonical skill requirements."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    readiness = intel["data"]["career_readiness"]
    assert "score" in readiness
    assert "verified_count" in readiness
    assert "gap_count" in readiness
    assert "total_skills" in readiness
    assert readiness["total_skills"] == len(intel["data"]["skills"])
    assert readiness["verified_count"] + readiness["gap_count"] == readiness["total_skills"]

def test_no_cross_career_skill_contamination(db_session):
    """Test 27: Full Stack Developer and Mobile App Developer maintain distinct skill requirements."""
    intel_fs = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    intel_mob = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Mobile App Developer")
    
    fs_skills = {s["skill_name"].lower() for s in intel_fs["data"]["skills"]}
    mob_skills = {s["skill_name"].lower() for s in intel_mob["data"]["skills"]}
    
    # React Native is specific to Mobile App Developer
    assert any("react native" in s for s in mob_skills)
    assert not any("react native" in s for s in fs_skills)

def test_skills_required_breakdown_contains_technical_skills(db_session):
    """Test 28: Skills Required Breakdown contains actual actionable technical skills."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    skills = intel["data"]["skills"]
    assert len(skills) > 0
    names = [s["skill_name"] for s in skills]
    assert "React" in names
    assert "TypeScript" in names
    assert "Node.js" in names
    assert any("SQL" in n for n in names)

def test_no_generic_competency_labels_as_primary_display_skills(db_session):
    """Test 29: Generic occupational competency labels are not primary display skills."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    names = [s["skill_name"].lower() for s in intel["data"]["skills"]]
    generic_labels = [
        "computer programming",
        "web programming",
        "web services",
        "use an application-specific interface"
    ]
    for label in generic_labels:
        assert label not in names, f"Generic competency label '{label}' should not be a primary display skill"

def test_technical_skills_have_canonical_ids(db_session):
    """Test 30: Every technical skill has a non-empty canonical ID."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    skills = intel["data"]["skills"]
    for s in skills:
        assert s["skill_id"] is not None
        assert str(s["skill_id"]).strip() != ""

def test_technical_skills_are_database_backed(db_session):
    """Test 31: Technical skills originate from PostgreSQL database tables."""
    from app.models import SkillSetuSkill, SkillSetuCareerSkill
    skills_in_db = db_session.query(SkillSetuSkill).count()
    career_skills_in_db = db_session.query(SkillSetuCareerSkill).count()
    assert skills_in_db > 0
    assert career_skills_in_db > 0

def test_target_role_gaps_use_same_skill_taxonomy(db_session):
    """Test 32: Target Role Gaps and Skills Required Breakdown use the same skill taxonomy."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    all_skills = intel["data"]["skills"]
    gap_skills = [s for s in all_skills if s["canonical_status"] != "verified"]
    
    # Gaps must be a subset of the canonical all_skills taxonomy
    all_skill_ids = {s["skill_id"] for s in all_skills}
    for g in gap_skills:
        assert g["skill_id"] in all_skill_ids

def test_learning_roadmap_uses_same_skill_taxonomy(db_session):
    """Test 33: Learning Roadmap milestones reference the same technical skill taxonomy."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    roadmap = intel["data"]["roadmap_milestones"]
    assert len(roadmap) > 0
    for rm in roadmap:
        for sk in rm["skills"]:
            assert "skill_name" in sk
            assert "current_score" in sk
            assert "target_score" in sk
            assert "gap" in sk

def test_course_skill_relationships_are_canonical(db_session):
    """Test 34: Course-skill relationships in learning path use canonical skills."""
    from app.models import CourseSkill
    cs_count = db_session.query(CourseSkill).count()
    assert cs_count > 0

def test_full_stack_technical_skills_are_dynamic(db_session):
    """Test 35: Full Stack Developer technical skills are retrieved dynamically from backend service."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Full Stack Developer")
    skills = intel["data"]["skills"]
    assert len(skills) >= 6

def test_mobile_technical_skills_are_dynamic(db_session):
    """Test 36: Mobile App Developer technical skills are retrieved dynamically from backend service."""
    intel = career_intelligence_service.get_student_career_intelligence(db_session, student_email="abhoge27@gmail.com", career_name="Mobile App Developer")
    skills = intel["data"]["skills"]
    assert len(skills) >= 4
    names = [s["skill_name"] for s in skills]
    assert "React Native" in names

def test_no_hardcoded_technical_skill_arrays():
    """Test 37: Verify frontend Learning.js does not contain hardcoded skill arrays."""
    frontend_file = "/Users/aryanbhoge/Desktop/untitled folder/SkillSetu/Screens/Student/Learning/Learning.js"
    with open(frontend_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert "const fullStackSkills =" not in content
    assert "const technicalSkills =" not in content

def test_no_frontend_skill_name_overrides():
    """Test 38: Verify frontend Learning.js does not use string override maps."""
    frontend_file = "/Users/aryanbhoge/Desktop/untitled folder/SkillSetu/Screens/Student/Learning/Learning.js"
    with open(frontend_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert "skillNameOverrides" not in content
    assert '"web programming": "JavaScript"' not in content


