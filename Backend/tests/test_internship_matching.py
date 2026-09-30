import pytest
from app.services.internship_matching_service import InternshipMatchingService
from app.models import InternshipListing, InternshipRequiredSkill, StudentUser, StudentSkillEvidence

def test_hard_eligibility_cgpa_failure():
    """Test that a student with lower CGPA than required is marked NOT_ELIGIBLE with score 0."""
    service = InternshipMatchingService()
    
    # Student with 6.5 CGPA
    student = StudentUser(
        id=101,
        name="CGPA Low",
        email="test_cgpa@test.com",
        password_hash="hash",
        cgpa_or_percentage="6.5",
        target_careers="Backend Developer",
        work_preferences="Remote"
    )
    
    # Internship requiring 8.0 CGPA
    listing = InternshipListing(
        id=201,
        title="Software Engineer Intern",
        company_name="TechCorp",
        min_cgpa=8.0,
        work_preference="remote",
        is_active=True
    )
    
    result = service.evaluate_match(student, listing, required_skills=[])
    
    assert result["eligibility_status"] == "NOT_ELIGIBLE"
    assert result["match_score"] == 0.0
    assert any("CGPA" in reason for reason in result["eligibility_reasons"])


def test_hard_eligibility_cgpa_success_and_matching():
    """Test that a student meeting CGPA requirement is evaluated for soft score components."""
    service = InternshipMatchingService()
    
    # Student with 8.5 CGPA
    student = StudentUser(
        id=102,
        name="CGPA Pass",
        email="test_cgpa_pass@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.5",
        target_careers="Backend Developer",
        work_preferences="Remote",
        preferred_locations="Bangalore"
    )
    
    listing = InternshipListing(
        id=202,
        title="Backend Developer Intern",
        company_name="TechNova",
        min_cgpa=7.5,
        work_preference="remote",
        location_name="Bangalore",
        is_active=True
    )
    
    req_skills = [
        InternshipRequiredSkill(skill_id="skill_python", skill_name="Python", is_mandatory=True),
        InternshipRequiredSkill(skill_id="skill_fastapi", skill_name="FastAPI", is_mandatory=True)
    ]
    
    evidence = [
        StudentSkillEvidence(skill_name="Python", evidence_score=0.85, source_type="assessment"),
        StudentSkillEvidence(skill_name="FastAPI", evidence_score=0.90, source_type="project")
    ]
    
    result = service.evaluate_match(student, listing, required_skills=req_skills, student_evidence=evidence)
    
    assert result["eligibility_status"] == "ELIGIBLE"
    assert result["match_score"] > 80.0
    assert "Python" in result["matched_skills"]
    assert "FastAPI" in result["matched_skills"]
    assert result["breakdown"]["work_mode_fit"] == 100.0
    assert result["breakdown"]["location_fit"] == 100.0


def test_remote_internship_gives_full_location_fit():
    """Test that remote internship gives 100% location fit even if student's city is different."""
    service = InternshipMatchingService()
    
    student = StudentUser(
        id=103,
        name="Remote Student",
        email="test_remote@test.com",
        password_hash="hash",
        preferred_locations="Pune",
        work_preferences="Remote"
    )
    
    listing = InternshipListing(
        id=203,
        title="Frontend Intern",
        company_name="Global Web",
        location_name="Bangalore",
        work_preference="remote",
        is_active=True
    )
    
    result = service.evaluate_match(student, listing, required_skills=[])
    
    assert result["breakdown"]["location_fit"] == 100.0
    assert result["breakdown"]["work_mode_fit"] == 100.0


def test_missing_skills_identification():
    """Test that skills not possessed by the student are correctly categorized as missing_skills."""
    service = InternshipMatchingService()
    
    student = StudentUser(
        id=104,
        name="Missing Skills Student",
        email="test_missing_skills@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.0"
    )
    
    listing = InternshipListing(
        id=204,
        title="Full Stack Intern",
        company_name="DevHub",
        is_active=True
    )
    
    req_skills = [
        InternshipRequiredSkill(skill_id="skill_react", skill_name="React", is_mandatory=True),
        InternshipRequiredSkill(skill_id="skill_docker", skill_name="Docker", is_mandatory=True),
        InternshipRequiredSkill(skill_id="skill_kubernetes", skill_name="Kubernetes", is_mandatory=False)
    ]
    
    # Student only has React
    evidence = [
        StudentSkillEvidence(skill_name="React", evidence_score=0.80, source_type="assignment")
    ]
    
    result = service.evaluate_match(student, listing, required_skills=req_skills, student_evidence=evidence)
    
    assert "React" in result["matched_skills"]
    assert "Docker" in result["missing_skills"]
    assert "Kubernetes" in result["missing_skills"]
