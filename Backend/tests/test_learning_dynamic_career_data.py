import pytest
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import (
    StudentUser,
    LearningPath,
    LearningPathItem,
    Course,
    CourseSkill,
    EscoAssessment,
    SkillPracticeChallenge,
    StudentSkillEvidence,
    StudentAssessmentAttempt,
    ProjectSubmission
)
from app.services import (
    career_intelligence_service,
    learning_path_service,
    esco_service
)

TEST_EMAIL_A = "dynamic_career_student_a@skillsetu.com"
TEST_EMAIL_B = "dynamic_career_student_b@skillsetu.com"


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    esco_service.seed_default_datasets_if_needed(db)
    yield db
    db.close()


@pytest.fixture(autouse=True)
def clean_students(db_session: Session):
    for email in [TEST_EMAIL_A, TEST_EMAIL_B]:
        st = db_session.query(StudentUser).filter(StudentUser.email == email).first()
        if st:
            lps = db_session.query(LearningPath).filter(LearningPath.student_id == st.id).all()
            for lp in lps:
                db_session.query(LearningPathItem).filter(LearningPathItem.learning_path_id == lp.id).delete()
                db_session.delete(lp)
            db_session.query(StudentSkillEvidence).filter(StudentSkillEvidence.student_id == st.id).delete()
            db_session.query(StudentAssessmentAttempt).filter(StudentAssessmentAttempt.student_id == st.id).delete()
            db_session.query(ProjectSubmission).filter(ProjectSubmission.student_id == st.id).delete()
            db_session.delete(st)
    db_session.commit()

    student_a = StudentUser(
        email=TEST_EMAIL_A,
        name="Student Alpha",
        password_hash="hashed_pw_123",
        target_careers='["Mobile App Developer", "Full Stack Developer"]'
    )
    student_b = StudentUser(
        email=TEST_EMAIL_B,
        name="Student Beta",
        password_hash="hashed_pw_123",
        target_careers='["Mobile App Developer", "Full Stack Developer"]'
    )
    db_session.add_all([student_a, student_b])
    db_session.commit()

    yield

    for email in [TEST_EMAIL_A, TEST_EMAIL_B]:
        st = db_session.query(StudentUser).filter(StudentUser.email == email).first()
        if st:
            lps = db_session.query(LearningPath).filter(LearningPath.student_id == st.id).all()
            for lp in lps:
                db_session.query(LearningPathItem).filter(LearningPathItem.learning_path_id == lp.id).delete()
                db_session.delete(lp)
            db_session.query(StudentSkillEvidence).filter(StudentSkillEvidence.student_id == st.id).delete()
            db_session.query(StudentAssessmentAttempt).filter(StudentAssessmentAttempt.student_id == st.id).delete()
            db_session.query(ProjectSubmission).filter(ProjectSubmission.student_id == st.id).delete()
            db_session.delete(st)
    db_session.commit()


def test_career_switch_dynamic_content(db_session: Session):
    """
    Switching from Mobile App Developer to Full Stack Developer dynamically updates:
    - Courses
    - Assessments
    - Assignments
    - Capstone Projects
    - Roadmaps
    """
    # 1. Load Mobile App Developer
    mobile_intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_EMAIL_A,
        career_name="Mobile App Developer"
    )
    data_m = mobile_intel["data"]
    assert data_m["active_career"]["name"] == "Mobile App Developer"
    mobile_skills = [s["skill_name"] for s in data_m["all_required_skills"]]
    assert "React Native" in mobile_skills
    assert "Node.js" not in mobile_skills

    # Diagnostic Test
    assert "Mobile" in data_m["mock_tests"][0]["title"]
    # Capstone
    assert "Mobile" in data_m["capstone_projects"][0]["title"]
    assert "Mobile" in data_m["capstone_projects"][1]["title"]

    # 2. Switch to Full Stack Developer
    fs_intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_EMAIL_A,
        career_name="Full Stack Developer"
    )
    data_fs = fs_intel["data"]
    assert data_fs["active_career"]["name"] == "Full Stack Developer"
    fs_skills = [s["skill_name"] for s in data_fs["all_required_skills"]]
    assert "Node.js" in fs_skills
    assert "SQL" in fs_skills
    assert "PostgreSQL" in fs_skills
    assert "React Native" not in fs_skills

    # Diagnostic Test
    assert "Full Stack" in data_fs["mock_tests"][0]["title"]
    # Capstone
    assert "Full Stack" in data_fs["capstone_projects"][0]["title"]

    # 3. Switch back to Mobile App Developer - Zero Stale Content
    mobile_intel_2 = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_EMAIL_A,
        career_name="Mobile App Developer"
    )
    data_m2 = mobile_intel_2["data"]
    assert data_m2["active_career"]["name"] == "Mobile App Developer"
    assert "React Native" in [s["skill_name"] for s in data_m2["all_required_skills"]]
    assert "Node.js" not in [s["skill_name"] for s in data_m2["all_required_skills"]]


def test_verified_skill_not_recommended_as_missing_gap(db_session: Session):
    """
    When a skill has completed course, test >= 70, and assignment (Verified),
    it is marked VERIFIED and not prioritized as a missing gap.
    """
    student = db_session.query(StudentUser).filter(StudentUser.email == TEST_EMAIL_A).first()
    
    # 1. Initial State: JavaScript is a gap
    initial_intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_EMAIL_A,
        career_name="Full Stack Developer"
    )
    js_skill_initial = next(s for s in initial_intel["data"]["all_required_skills"] if s["skill_name"] == "JavaScript")
    assert js_skill_initial["canonical_status"] != "verified"

    # 2. Add complete evidence for JavaScript:
    # Course completion in learning path
    lp = db_session.query(LearningPath).filter(LearningPath.student_id == student.id).first()
    for itm in lp.items:
        if itm.skill_name and itm.skill_name.lower() == "javascript":
            itm.progress_percent = 100.0
            itm.status = "completed"
    
    # Assessment passed
    db_session.add(StudentAssessmentAttempt(
        student_id=student.id,
        skill_name="JavaScript",
        test_title="JavaScript Core & Advanced Architecture Assessment",
        score=85,
        status="VERIFIED"
    ))
    
    # Assignment completed
    db_session.add(ProjectSubmission(
        student_id=student.id,
        challenge_id="ch_javascript_01",
        skill_name="JavaScript",
        repository_url="https://github.com/student/js-portfolio",
        analysis_status="ANALYZED"
    ))
    db_session.commit()

    # 3. Re-query Career Intelligence
    updated_intel = career_intelligence_service.get_student_career_intelligence(
        db=db_session,
        student_email=TEST_EMAIL_A,
        career_name="Full Stack Developer"
    )
    
    js_skill_updated = next(s for s in updated_intel["data"]["all_required_skills"] if s["skill_name"] == "JavaScript")
    assert js_skill_updated["canonical_status"] == "verified"
    assert js_skill_updated["course_completed"] is True
    assert js_skill_updated["test_passed"] is True
    assert js_skill_updated["assignment_completed"] is True
    assert js_skill_updated["is_verified"] is True
    
    # Ensure JavaScript is not in gap_skills
    gap_names = [s["skill_name"] for s in updated_intel["data"]["skill_gaps"]]
    assert "JavaScript" not in gap_names
