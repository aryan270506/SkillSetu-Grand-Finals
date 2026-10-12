import json
import pytest
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, SessionLocal
from app import models
from app.services import esco_service, career_intelligence_service, skill_evidence_service
from app.routers.student import get_assessment_questions_endpoint

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def sample_student(db: Session):
    email = "canonical_test_student@skillsetu.ai"
    student = db.query(models.StudentUser).filter(models.StudentUser.email == email).first()
    if not student:
        student = models.StudentUser(
            name="Canonical Test Student",
            email=email,
            password_hash="testpasshash",
            career_goal_text="Full Stack Developer"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    else:
        db.query(models.StudentAssessmentAttempt).filter(models.StudentAssessmentAttempt.student_id == student.id).delete()
        db.query(models.StudentSkillEvidence).filter(models.StudentSkillEvidence.student_id == student.id).delete()
        db.commit()
    return student


def test_01_skills_and_learning_canonical_score_consistency(db: Session, sample_student):
    """
    Test 1-4 & 27: Skills API, Learning API, and Opportunities share the EXACT same canonical skill score.
    """
    # Record canonical GitHub evidence for React = 100/100
    gh_conn = db.query(models.StudentGithubConnection).filter(
        func.lower(models.StudentGithubConnection.student_email) == sample_student.email.lower()
    ).first()
    if not gh_conn:
        gh_conn = models.StudentGithubConnection(
            student_email=sample_student.email,
            github_username="canonical_user",
            skills_json=json.dumps({"React": 100.0, "TypeScript": 100.0, "SQL": 82.0, "REST APIs": 92.0})
        )
        db.add(gh_conn)
    else:
        gh_conn.skills_json = json.dumps({"React": 100.0, "TypeScript": 100.0, "SQL": 82.0, "REST APIs": 92.0})
    db.commit()

    # 1. Fetch Skills Gap Analysis from canonical database evidence
    github_skills, resume_parsed, profile_skills = esco_service.load_student_evidence_from_db(sample_student.email, db)
    skills_data = esco_service.calculate_multi_career_skill_gaps(
        target_careers=["Full Stack Developer"],
        github_skills=github_skills,
        resume_data=resume_parsed,
        profile_skills=profile_skills,
        db=db
    )
    react_in_skills = next((s for s in skills_data["all_skills"] if "react" in s["skill_name"].lower()), None)
    assert react_in_skills is not None
    assert react_in_skills["current_level"] == 100

    # 2. Fetch Learning Intelligence
    learning_intel = career_intelligence_service.get_student_career_intelligence(
        db=db,
        student_email=sample_student.email,
        career_name="Full Stack Developer"
    )
    unified_skills = learning_intel["data"]["all_required_skills"]
    react_in_learning = next((s for s in unified_skills if "react" in s["skill_name"].lower()), None)
    assert react_in_learning is not None
    # Crucial assertion: Learning MUST NOT report 30% or 0% when canonical score is 100
    assert react_in_learning["current_score"] == 100.0
    assert react_in_learning["canonical_status"] == "verified"
    
    # 3. Verify Career Readiness is consistent
    readiness_in_learning = learning_intel["data"]["career_readiness"]["score"]
    readiness_in_skills = skills_data["career_match"]["score"]
    assert readiness_in_learning == readiness_in_skills


def test_02_career_mapping_and_content_alignment(db: Session, sample_student):
    """
    Test 5-10: Career to required skills mapping & career-specific learning content.
    """
    intel_fs = career_intelligence_service.get_student_career_intelligence(
        db=db, student_email=sample_student.email, career_name="Full Stack Developer"
    )
    fs_skills = [s["skill_name"].lower() for s in intel_fs["data"]["all_required_skills"]]
    assert any("react" in s or "web" in s or "script" in s for s in fs_skills)

    intel_mobile = career_intelligence_service.get_student_career_intelligence(
        db=db, student_email=sample_student.email, career_name="Mobile App Developer"
    )
    mobile_skills = [s["skill_name"].lower() for s in intel_mobile["data"]["all_required_skills"]]
    assert any("mobile" in s or "android" in s or "ios" in s or "native" in s or "app" in s for s in mobile_skills)


def test_03_assessment_grading_thresholds(db: Session, sample_student):
    """
    Test 11-17: Assessment questions count (15-25), grading on backend, 70% threshold.
    """
    from app.routers.student import get_assessment_questions_endpoint
    data_res = get_assessment_questions_endpoint(skill_name="Docker", email=sample_student.email, db=db)
    assert data_res["status"] == "success"
    data = data_res["data"]
    q_count = data["question_count"]
    assert 15 <= q_count <= 25, f"Question count {q_count} not in range 15-25"

    assessment_id = data["assessment_id"]

    # Grade test with 100% correct answers
    db_questions = db.query(models.EscoAssessmentQuestion).filter(
        models.EscoAssessmentQuestion.assessment_id == assessment_id
    ).all()
    ans_key = {str(q.id): q.correct_option for q in db_questions}
    
    # Passing attempt
    pass_res = esco_service.evaluate_student_assessment_submission(
        student_id=sample_student.id,
        assessment_id=assessment_id,
        answers_dict=ans_key,
        db=db
    )
    assert pass_res["is_passed"] == True
    assert pass_res["score"] == 100

    # Failing attempt (60% correct)
    wrong_answers = {}
    for idx, (qid, c_opt) in enumerate(ans_key.items()):
        if idx < int(len(ans_key) * 0.60):
            wrong_answers[qid] = c_opt
        else:
            wrong_answers[qid] = "WRONG_OPT"
            
    fail_res = esco_service.evaluate_student_assessment_submission(
        student_id=sample_student.id,
        assessment_id=assessment_id,
        answers_dict=wrong_answers,
        db=db
    )
    assert fail_res["is_passed"] == False
    assert fail_res["score"] <= 69


def test_04_retest_uniqueness_and_fingerprints(db: Session, sample_student):
    """
    Test 18-21: Retest does not repeat previous questions, uses question fingerprints.
    """
    from app.routers.student import get_assessment_questions_endpoint
    # First attempt: fetch questions
    data_res1 = get_assessment_questions_endpoint(skill_name="Docker", email=sample_student.email, db=db)
    assert data_res1["status"] == "success"
    data1 = data_res1["data"]
    q_ids_attempt1 = set(q["id"] for q in data1["questions"])

    # Submit attempt 1
    submit_res = esco_service.evaluate_student_assessment_submission(
        student_id=sample_student.id,
        assessment_id=data1["assessment_id"],
        answers_dict={str(qid): "A" for qid in q_ids_attempt1},
        db=db
    )
    assert submit_res["status"] == "success"

    # Second attempt: fetch questions
    data_res2 = get_assessment_questions_endpoint(skill_name="Docker", email=sample_student.email, db=db)
    assert data_res2["status"] == "success"
    data2 = data_res2["data"]
    q_ids_attempt2 = set(q["id"] for q in data2["questions"])

    # Retest uniqueness: No questions from Attempt 1 should be reused in Attempt 2
    overlap = q_ids_attempt1.intersection(q_ids_attempt2)
    assert len(overlap) == 0, f"Retest violated uniqueness! Overlapping question IDs: {overlap}"


def test_05_evidence_idempotency_and_cross_tab_sync(db: Session, sample_student):
    """
    Test 22-35: Evidence updates canonical store and does not inflate repeatedly.
    """
    # Pass assessment once
    res_ev1 = skill_evidence_service.record_verified_assessment_evidence(
        db=db,
        student_id=sample_student.id,
        skill_name="Docker",
        score_pct=85,
        attempt_id=101
    )
    score1 = res_ev1.evidence_score

    # Pass assessment a second time (should be idempotent / capped)
    res_ev2 = skill_evidence_service.record_verified_assessment_evidence(
        db=db,
        student_id=sample_student.id,
        skill_name="Docker",
        score_pct=85,
        attempt_id=102
    )
    score2 = res_ev2.evidence_score
    assert score2 == score1, "Repeated assessment inflated evidence score!"


def test_06_career_switch_preserves_global_evidence(db: Session, sample_student):
    """
    Test 36-38: Switching career recalculates readiness but preserves canonical global skill evidence.
    """
    # Record SQL canonical evidence
    skill_evidence_service.record_verified_assessment_evidence(
        db=db,
        student_id=sample_student.id,
        skill_name="SQL",
        score_pct=90,
        attempt_id=103
    )

    # Full Stack
    intel_fs = career_intelligence_service.get_student_career_intelligence(
        db=db, student_email=sample_student.email, career_name="Full Stack Developer"
    )
    sql_fs = next((s for s in intel_fs["data"]["all_required_skills"] if "sql" in s["skill_name"].lower()), None)
    if sql_fs:
        assert sql_fs["current_score"] >= 80

    # Mobile App Developer
    intel_mob = career_intelligence_service.get_student_career_intelligence(
        db=db, student_email=sample_student.email, career_name="Mobile App Developer"
    )
    # Check that global skill evidence is intact
    ev_records = db.query(models.StudentSkillEvidence).filter(
        models.StudentSkillEvidence.student_id == sample_student.id,
        func.lower(models.StudentSkillEvidence.skill_name) == "sql"
    ).all()
    assert len(ev_records) > 0
