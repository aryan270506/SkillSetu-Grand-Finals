import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from app.database import get_db, SessionLocal
from app import models
from app.services.student_context_service import StudentContextBuilder

client = TestClient(app)


def get_test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_student_rounds_complete_scenarios(db_session: Session):
    created_student_ids = []
    created_posting_ids = []

    try:
        # 1. Setup Student
        student = db_session.query(models.StudentUser).filter(models.StudentUser.email == "test_rounds_student@skillsetu.com").first()
        if not student:
            student = models.StudentUser(
                name="Aryan Assessment Student",
                email="test_rounds_student@skillsetu.com",
                password_hash="mock_hash"
            )
            db_session.add(student)
            db_session.commit()
            db_session.refresh(student)
        created_student_ids.append(student.id)

        # Add student github connection with repo projects
        gh = db_session.query(models.StudentGithubConnection).filter(models.StudentGithubConnection.student_email == student.email).first()
        if not gh:
            gh = models.StudentGithubConnection(
                student_email=student.email,
                github_username="aryan-assessment",
                connection_status="CONNECTED",
                repos_json=json.dumps([
                    {"name": "Distributed Microservice Platform", "description": "Built using Python, FastAPI, PostgreSQL, and Docker containerization.", "language": "Python"},
                    {"name": "React Dashboard UI", "description": "Interactive React dashboard with TypeScript and clean state management.", "language": "TypeScript"}
                ])
            )
            db_session.add(gh)
            db_session.commit()

        # 2. Setup Company & Recruiters
        company = db_session.query(models.Company).filter(models.Company.name == "Catalyst Coders").first()
        if not company:
            company = models.Company(name="Catalyst Coders", industry="Technology", location="Bengaluru")
            db_session.add(company)
            db_session.commit()
            db_session.refresh(company)

        recruiter = db_session.query(models.RecruiterUser).filter(models.RecruiterUser.company_id == company.id).first()
        if not recruiter:
            recruiter = models.RecruiterUser(
                company_id=company.id,
                email="recruiter@catalystcoders.com",
                full_name="Catalyst Recruiter",
                password_hash="mockpass"
            )
            db_session.add(recruiter)
            db_session.commit()
            db_session.refresh(recruiter)

        # 3. Setup Internship 1: Backend Developer Intern (Pipeline: Aptitude -> Technical -> Interview -> GD)
        backend_posting = db_session.query(models.InternshipPosting).filter(
            models.InternshipPosting.title == "Backend Developer Intern",
            models.InternshipPosting.company_id == company.id
        ).first()
        if not backend_posting:
            backend_posting = models.InternshipPosting(
                company_id=company.id,
                recruiter_id=recruiter.id,
                title="Backend Developer Intern",
                department="Engineering",
                description="Build scalable backend microservices, SQL databases, and secure APIs.",
                required_skills=json.dumps(["Python", "SQL", "FastAPI", "PostgreSQL"]),
                work_mode="Remote",
                duration="6 Months",
                status="Active"
            )
            db_session.add(backend_posting)
            db_session.commit()
            db_session.refresh(backend_posting)
            created_posting_ids.append(backend_posting.id)

        backend_cfg = db_session.query(models.InternshipAssessmentConfig).filter(
            models.InternshipAssessmentConfig.internship_id == backend_posting.id
        ).first()
        pipeline_data = {
            "round_sequence": ["aptitude", "technical", "interview", "gd"],
            "aptitude": {"enabled": True, "question_count": 10, "duration_min": 25, "difficulty": "Medium", "schedule": {"schedule_mode": "flexible_window"}},
            "technical": {"enabled": True, "theory_enabled": True, "coding_enabled": True, "duration_min": 45, "schedule": {"schedule_mode": "flexible_window"}},
            "interview": {"enabled": True, "duration_min": 20, "schedule": {"schedule_mode": "flexible_window"}},
            "gd": {"enabled": True, "discussion_time_min": 15, "schedule": {"schedule_mode": "flexible_window"}}
        }
        if not backend_cfg:
            backend_cfg = models.InternshipAssessmentConfig(
                internship_id=backend_posting.id,
                is_active=True,
                pipeline_config=json.dumps(pipeline_data)
            )
            db_session.add(backend_cfg)
        else:
            backend_cfg.is_active = True
            backend_cfg.pipeline_config = json.dumps(pipeline_data)
        db_session.commit()

        # Application 1 (Backend - Shortlisted)
        app1 = db_session.query(models.InternshipApplication).filter(
            models.InternshipApplication.internship_id == backend_posting.id,
            models.InternshipApplication.student_id == student.id
        ).first()
        if not app1:
            app1 = models.InternshipApplication(
                student_id=student.id,
                internship_id=backend_posting.id,
                status="SHORTLISTED",
                company_snapshot=company.name,
                title_snapshot=backend_posting.title
            )
            db_session.add(app1)
        else:
            app1.student_id = student.id
            app1.status = "SHORTLISTED"
        db_session.commit()
        db_session.refresh(app1)

        # 4. Setup Internship 2: Frontend Developer Intern (Pipeline: Technical -> Interview)
        frontend_posting = db_session.query(models.InternshipPosting).filter(
            models.InternshipPosting.title == "Frontend Developer Intern",
            models.InternshipPosting.company_id == company.id
        ).first()
        if not frontend_posting:
            frontend_posting = models.InternshipPosting(
                company_id=company.id,
                recruiter_id=recruiter.id,
                title="Frontend Developer Intern",
                department="Engineering",
                description="Build interactive React user interfaces with clean styling and state management.",
                required_skills=json.dumps(["React", "TypeScript", "CSS", "UI Architecture"]),
                work_mode="Remote",
                duration="3 Months",
                status="Active"
            )
            db_session.add(frontend_posting)
            db_session.commit()
            db_session.refresh(frontend_posting)
            created_posting_ids.append(frontend_posting.id)

        frontend_cfg = db_session.query(models.InternshipAssessmentConfig).filter(
            models.InternshipAssessmentConfig.internship_id == frontend_posting.id
        ).first()
        pipeline_data_fe = {
            "round_sequence": ["technical", "interview"],
            "technical": {"enabled": True, "theory_enabled": True, "coding_enabled": True, "duration_min": 40, "schedule": {"schedule_mode": "flexible_window"}},
            "interview": {"enabled": True, "duration_min": 20, "schedule": {"schedule_mode": "flexible_window"}},
            "aptitude": {"enabled": False},
            "gd": {"enabled": False}
        }
        if not frontend_cfg:
            frontend_cfg = models.InternshipAssessmentConfig(
                internship_id=frontend_posting.id,
                is_active=True,
                pipeline_config=json.dumps(pipeline_data_fe)
            )
            db_session.add(frontend_cfg)
        else:
            frontend_cfg.is_active = True
            frontend_cfg.pipeline_config = json.dumps(pipeline_data_fe)
        db_session.commit()

        # Application 2 (Frontend - Shortlisted)
        app2 = db_session.query(models.InternshipApplication).filter(
            models.InternshipApplication.internship_id == frontend_posting.id,
            models.InternshipApplication.student_id == student.id
        ).first()
        if not app2:
            app2 = models.InternshipApplication(
                student_id=student.id,
                internship_id=frontend_posting.id,
                status="SHORTLISTED",
                company_snapshot=company.name,
                title_snapshot=frontend_posting.title
            )
            db_session.add(app2)
        else:
            app2.student_id = student.id
            app2.status = "SHORTLISTED"
        db_session.commit()
        db_session.refresh(app2)

        # 5. TEST: GET /student/rounds returns both distinct cards from PostgreSQL
        res = client.get(f"/api/v1/student/rounds?email={student.email}")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert len(data["data"]) >= 2

        # Check App 1 (Backend)
        backend_app_data = next((a for a in data["data"] if a["application_id"] == app1.id), None)
        assert backend_app_data is not None
        assert backend_app_data["internship_title"] == "Backend Developer Intern"
        assert backend_app_data["company_name"] == "Catalyst Coders"
        assert backend_app_data["has_pipeline"] is True
        assert backend_app_data["progression"]["current_round_name"] == "Aptitude"
        assert "Python" in backend_app_data["required_skills"]

        # Check App 2 (Frontend)
        frontend_app_data = next((a for a in data["data"] if a["application_id"] == app2.id), None)
        assert frontend_app_data is not None
        assert frontend_app_data["internship_title"] == "Frontend Developer Intern"
        assert frontend_app_data["has_pipeline"] is True
        assert frontend_app_data["progression"]["current_round_name"] == "Technical Assessment"
        assert "React" in frontend_app_data["required_skills"]

        # 6. TEST Context Builder Isolation (Test 1, Test 2, Test 3)
        backend_context = StudentContextBuilder.build_assessment_agent_context(
            db=db_session,
            student_identifier=student.email,
            application_id=app1.id,
            internship_id=backend_posting.id,
            target_round_key="aptitude",
            mode="PRACTICE"
        )
        assert backend_context["mode"] == "PRACTICE"
        assert backend_context["internship"]["title"] == "Backend Developer Intern"
        assert "Python" in backend_context["internship"]["requiredSkills"]
        assert backend_context["round"]["type"].lower() == "aptitude"
        assert len(backend_context["student"]["projects"]) >= 1

        frontend_context = StudentContextBuilder.build_assessment_agent_context(
            db=db_session,
            student_identifier=student.email,
            application_id=app2.id,
            internship_id=frontend_posting.id,
            target_round_key="technical",
            mode="PRACTICE"
        )
        assert frontend_context["mode"] == "PRACTICE"
        assert frontend_context["internship"]["title"] == "Frontend Developer Intern"
        assert "React" in frontend_context["internship"]["requiredSkills"]
        assert frontend_context["round"]["type"].lower() == "technical"

        # 7. TEST Practice Endpoint (POST /student/assessment/practice/start)
        prac_res = client.post(
            "/api/v1/student/assessment/practice/start",
            json={
                "application_id": app1.id,
                "internship_id": backend_posting.id,
                "target_round": "aptitude",
                "email": student.email
            }
        )
        if prac_res.status_code != 200:
            pytest.fail(f"PRACTICE ERROR RESPONSE: status={prac_res.status_code}, body={prac_res.text}")
        prac_json = prac_res.json()
        assert prac_json["status"] == "success"
        assert prac_json["mode"] == "PRACTICE"
        assert prac_json["target_round"] == "aptitude"
        assert bool(prac_json["session_id"])
        assert "interview.html" in prac_json["assessment_url"]

        db_session.refresh(app1)
        assert app1.status == "SHORTLISTED"

        # 8. TEST: Student with no resume and no GitHub (Test 4, Test 5)
        student_no_resume = db_session.query(models.StudentUser).filter(models.StudentUser.email == "no_resume_student@skillsetu.com").first()
        if not student_no_resume:
            student_no_resume = models.StudentUser(
                name="No Resume Candidate",
                email="no_resume_student@skillsetu.com",
                password_hash="mock_hash"
            )
            db_session.add(student_no_resume)
            db_session.commit()
            db_session.refresh(student_no_resume)
        created_student_ids.append(student_no_resume.id)

        no_resume_ctx = StudentContextBuilder.build_assessment_agent_context(
            db=db_session,
            student_identifier=student_no_resume.email,
            application_id=app1.id,
            internship_id=backend_posting.id,
            target_round_key="aptitude",
            mode="PRACTICE"
        )
        assert no_resume_ctx["mode"] == "PRACTICE"
        assert no_resume_ctx["student"]["profile"]["name"] == "No Resume Candidate"
        assert isinstance(no_resume_ctx["student"]["githubEvidence"], list)

        # 9. TEST: Internship with NO pipeline configured (Test 8)
        no_pipeline_posting = db_session.query(models.InternshipPosting).filter(
            models.InternshipPosting.title == "Unconfigured Intern Posting",
            models.InternshipPosting.company_id == company.id
        ).first()
        if not no_pipeline_posting:
            no_pipeline_posting = models.InternshipPosting(
                company_id=company.id,
                recruiter_id=recruiter.id,
                title="Unconfigured Intern Posting",
                description="Position without any assessment rounds configured yet.",
                status="Active"
            )
            db_session.add(no_pipeline_posting)
            db_session.commit()
            db_session.refresh(no_pipeline_posting)
            created_posting_ids.append(no_pipeline_posting.id)

        app_no_pipe = db_session.query(models.InternshipApplication).filter(
            models.InternshipApplication.internship_id == no_pipeline_posting.id,
            models.InternshipApplication.student_id == student.id
        ).first()
        if not app_no_pipe:
            app_no_pipe = models.InternshipApplication(
                student_id=student.id,
                internship_id=no_pipeline_posting.id,
                status="APPLIED",
                company_snapshot=company.name,
                title_snapshot=no_pipeline_posting.title
            )
            db_session.add(app_no_pipe)
            db_session.commit()
            db_session.refresh(app_no_pipe)

        rounds_res = client.get(f"/api/v1/student/rounds?email={student.email}")
        assert rounds_res.status_code == 200
        all_rounds_data = rounds_res.json()["data"]
        no_pipe_card = next((a for a in all_rounds_data if a["application_id"] == app_no_pipe.id), None)
        assert no_pipe_card is not None
        assert no_pipe_card["has_pipeline"] is False

        # 10. TEST: Rejected Application (Test 9)
        rejected_app = db_session.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id,
            models.InternshipApplication.status == "REJECTED"
        ).first()
        if not rejected_app:
            rejected_app = models.InternshipApplication(
                student_id=student.id,
                internship_id=backend_posting.id,
                status="REJECTED",
                notes="Position filled by earlier cohort candidate.",
                company_snapshot=company.name,
                title_snapshot="Closed Role"
            )
            db_session.add(rejected_app)
            db_session.commit()
            db_session.refresh(rejected_app)

        start_rej_res = client.post(
            f"/api/v1/student/applications/{rejected_app.id}/assessment/start?email={student.email}"
        )
        assert start_rej_res.status_code in [400, 403, 404]

        # 11. TEST: Selected Application (Test 10)
        selected_app = db_session.query(models.InternshipApplication).filter(
            models.InternshipApplication.student_id == student.id,
            models.InternshipApplication.status == "SELECTED"
        ).first()
        if not selected_app:
            selected_app = models.InternshipApplication(
                student_id=student.id,
                internship_id=backend_posting.id,
                status="SELECTED",
                company_snapshot=company.name,
                title_snapshot="Selected Role"
            )
            db_session.add(selected_app)
            db_session.commit()
            db_session.refresh(selected_app)

        rounds_sel_res = client.get(f"/api/v1/student/rounds?email={student.email}")
        assert rounds_sel_res.status_code == 200
        sel_card = next((a for a in rounds_sel_res.json()["data"] if a["application_id"] == selected_app.id), None)
        assert sel_card is not None
        assert sel_card["application_status"] == "SELECTED"
        assert sel_card["overall_status"] == "COMPLETED"

    finally:
        # CLEANUP: Remove all test-created artifacts and test student accounts so database stays 100% clean
        for s_id in created_student_ids:
            st = db_session.query(models.StudentUser).filter_by(id=s_id).first()
            if st:
                apps = db_session.query(models.InternshipApplication).filter_by(student_id=s_id).all()
                app_ids = [a.id for a in apps]
                if app_ids:
                    db_session.query(models.CandidateAssessmentSession).filter(models.CandidateAssessmentSession.application_id.in_(app_ids)).delete(synchronize_session=False)
                    db_session.query(models.ApplicationStatusAudit).filter(models.ApplicationStatusAudit.application_id.in_(app_ids)).delete(synchronize_session=False)
                    db_session.query(models.ApplicationEmailLog).filter(models.ApplicationEmailLog.application_id.in_(app_ids)).delete(synchronize_session=False)
                    db_session.query(models.InternshipApplication).filter(models.InternshipApplication.id.in_(app_ids)).delete(synchronize_session=False)
                db_session.query(models.StudentSkillEvidence).filter_by(student_id=s_id).delete(synchronize_session=False)
                db_session.query(models.StudentGithubConnection).filter_by(student_email=st.email).delete(synchronize_session=False)
                db_session.query(models.ProjectSubmission).filter_by(student_id=s_id).delete(synchronize_session=False)
                db_session.delete(st)

        for p_id in created_posting_ids:
            p = db_session.query(models.InternshipPosting).filter_by(id=p_id).first()
            if p:
                db_session.query(models.InternshipAssessmentConfig).filter_by(internship_id=p_id).delete(synchronize_session=False)
                db_session.query(models.InternshipRequiredSkill).filter_by(internship_id=p_id).delete(synchronize_session=False)
                db_session.query(models.InternshipApplication).filter_by(internship_id=p_id).delete(synchronize_session=False)
                db_session.delete(p)

        db_session.commit()
