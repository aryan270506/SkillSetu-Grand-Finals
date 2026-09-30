import pytest
from app.services.scholarship_eligibility_service import ScholarshipEligibilityService
from app.models import Scholarship, ScholarshipEligibilityRule, StudentUser

def test_scholarship_missing_income_returns_possibly_eligible():
    """Test that when a scholarship has income ceiling and student income is None, it returns POSSIBLY_ELIGIBLE."""
    service = ScholarshipEligibilityService()
    
    student = StudentUser(
        id=301,
        name="No Income Student",
        email="student_no_income@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.5",
        annual_family_income=None
    )
    
    scholarship = Scholarship(
        id=401,
        name="Need Based Grant",
        provider="Trust Foundation",
        is_active=True
    )
    
    rule = ScholarshipEligibilityRule(
        scholarship_id=401,
        min_cgpa=7.0,
        max_annual_family_income=600000.0
    )
    
    result = service.evaluate_student_eligibility(student, scholarship, rule)
    
    assert result["eligibility_status"] == "POSSIBLY_ELIGIBLE"
    assert "annual_family_income" in result["missing_profile_fields"]
    assert any(cp["criterion"] == "Annual Family Income" and cp["status"] == "UNKNOWN" for cp in result["evaluation_checkpoints"])


def test_scholarship_income_exceeded_returns_not_eligible():
    """Test that when student income exceeds max income ceiling, it returns NOT_ELIGIBLE."""
    service = ScholarshipEligibilityService()
    
    student = StudentUser(
        id=302,
        name="High Income Student",
        email="student_high_income@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.5",
        annual_family_income=850000.0
    )
    
    scholarship = Scholarship(
        id=402,
        name="EWS Engineering Scholarship",
        is_active=True
    )
    
    rule = ScholarshipEligibilityRule(
        scholarship_id=402,
        max_annual_family_income=600000.0
    )
    
    result = service.evaluate_student_eligibility(student, scholarship, rule)
    
    assert result["eligibility_status"] == "NOT_ELIGIBLE"
    assert any(cp["criterion"] == "Annual Family Income" and cp["passed"] is False for cp in result["evaluation_checkpoints"])


def test_scholarship_gender_restriction():
    """Test female-only scholarship returns NOT_ELIGIBLE for male student."""
    service = ScholarshipEligibilityService()
    
    student = StudentUser(
        id=303,
        name="Male Student",
        email="male_student@test.com",
        password_hash="hash",
        gender="Male",
        cgpa_or_percentage="9.0"
    )
    
    scholarship = Scholarship(
        id=403,
        name="Women in Tech Grant",
        is_active=True
    )
    
    rule = ScholarshipEligibilityRule(
        scholarship_id=403,
        eligible_genders=["Female"]
    )
    
    result = service.evaluate_student_eligibility(student, scholarship, rule)
    
    assert result["eligibility_status"] == "NOT_ELIGIBLE"
    assert any(cp["criterion"] == "Eligible Gender" and cp["passed"] is False for cp in result["evaluation_checkpoints"])


def test_scholarship_all_criteria_met():
    """Test that a student satisfying all criteria gets ELIGIBLE."""
    service = ScholarshipEligibilityService()
    
    student = StudentUser(
        id=304,
        name="Eligible Student",
        email="eligible_student@test.com",
        password_hash="hash",
        cgpa_or_percentage="8.8",
        annual_family_income=300000.0,
        social_category="OBC",
        domicile_state="Karnataka",
        gender="Female"
    )
    
    scholarship = Scholarship(
        id=404,
        name="State Merit Scholarship",
        is_active=True
    )
    
    rule = ScholarshipEligibilityRule(
        scholarship_id=404,
        min_cgpa=7.5,
        max_annual_family_income=500000.0,
        eligible_states=["Karnataka", "Maharashtra"],
        eligible_genders=["Female", "Any"]
    )
    
    result = service.evaluate_student_eligibility(student, scholarship, rule)
    
    assert result["eligibility_status"] == "ELIGIBLE"
    assert len(result["missing_profile_fields"]) == 0
    assert all(cp["passed"] is True for cp in result["evaluation_checkpoints"])
