import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import RecruiterUser, Company, CompanyLocation, CompanyHiringStage
from app.services.recruiter_profile_service import (
    calculate_company_profile_completion,
    get_canonical_skill_names
)

def populate_catalyst_coders_profile():
    print("=" * 70)
    print("STARTING IDEMPOTENT POPULATION FOR CATALYST CODERS (COMPANY ID: 3)")
    print("=" * 70)

    db: Session = SessionLocal()
    try:
        # 1. Locate existing Catalyst Coders company record
        company = db.query(Company).filter(Company.id == 3).first()
        if not company:
            # Fallback by name check
            company = db.query(Company).filter(Company.name.ilike("Catalyst Coders")).first()

        if not company:
            raise Exception("Existing Catalyst Coders company record not found in PostgreSQL!")

        print(f"✓ Found existing Catalyst Coders company record with ID: {company.id}")
        assert company.name == "Catalyst Coders", f"Expected 'Catalyst Coders', found '{company.name}'"

        # 2. Update company core identity & about fields
        company.industry = "Information Technology & Software Development"
        company.company_type = "Software Development / Technology Company"
        company.company_size = "Small / Growing Technology Team"
        company.headquarters = "Wardha, Maharashtra, India"
        company.description = (
            "Catalyst Coders is a technology and software development company focused on building "
            "practical digital products, AI-powered solutions, education technology platforms, and "
            "custom software for organizations and businesses. The company focuses on solving "
            "real-world problems through modern software engineering, intelligent automation, and "
            "scalable digital experiences."
        )
        company.mission = (
            "To build practical, scalable, and intelligent technology solutions that solve real-world "
            "problems while creating meaningful opportunities for students and emerging technology "
            "professionals."
        )
        company.vision = (
            "To build a technology-driven ecosystem where innovative software, artificial intelligence, "
            "and skilled young developers come together to create impactful digital products."
        )

        # 3. Culture tags & Benefits
        culture_tags = [
            "Collaborative",
            "Innovation-driven",
            "Learning-focused",
            "Growth-oriented",
            "Problem-solving",
            "Inclusive",
            "Flexible"
        ]
        company.culture_tags = json.dumps(culture_tags)

        perks = [
            "Flexible Working",
            "Learning & Training",
            "Mentorship",
            "Internship Certificate",
            "Project-based Experience",
            "Real-world Development Experience",
            "Opportunity to Work on Production-oriented Projects"
        ]
        company.perks = json.dumps(perks)

        # 4. Preferred Domains & Canonical Skills
        preferred_domains = [
            "Software Development",
            "Web Development",
            "Mobile App Development",
            "Artificial Intelligence / Machine Learning",
            "Data Science",
            "Cloud & Backend Development"
        ]
        company.preferred_domains = json.dumps(preferred_domains)

        raw_skills = [
            "React",
            "React Native",
            "Node.js",
            "Python",
            "JavaScript",
            "TypeScript",
            "PostgreSQL",
            "MongoDB",
            "FastAPI",
            "REST APIs",
            "Artificial Intelligence",
            "Machine Learning",
            "Git",
            "GitHub"
        ]
        canonical_skills = get_canonical_skill_names(db, raw_skills)
        company.preferred_skills = json.dumps(canonical_skills)

        company.preferred_work_mode = "Hybrid"
        company.preferred_duration = "3-6 Months"

        # 5. Social Links (Preserve existing valid links, avoid fake URLs)
        existing_social = {}
        if company.social_links:
            try:
                existing_social = json.loads(company.social_links)
            except Exception:
                existing_social = {}

        social_payload = {
            "website": company.website or existing_social.get("website", ""),
            "linkedin": existing_social.get("linkedin", ""),
            "github": existing_social.get("github", ""),
            "instagram": existing_social.get("instagram", ""),
            "twitter": existing_social.get("twitter", "")
        }
        company.social_links = json.dumps(social_payload)

        # 6. Idempotent Location Management
        existing_locations = db.query(CompanyLocation).filter(CompanyLocation.company_id == company.id).all()
        has_primary = any(l.is_primary for l in existing_locations)
        if not existing_locations:
            primary_loc = CompanyLocation(
                company_id=company.id,
                title="Wardha, Maharashtra, India",
                sub="Technology Operations Hub",
                badge="HQ",
                is_primary=True
            )
            db.add(primary_loc)
            print("✓ Added primary HQ location: Wardha, Maharashtra, India")
        else:
            # Update primary location if needed
            for loc in existing_locations:
                if loc.is_primary or len(existing_locations) == 1:
                    loc.title = "Wardha, Maharashtra, India"
                    loc.badge = "HQ"
                    loc.is_primary = True
            print(f"✓ Updated existing location(s) for Catalyst Coders: {len(existing_locations)} location(s)")

        # 7. Idempotent Hiring Stages Management
        hiring_stages_data = [
            {
                "order": 1,
                "stage_id": "01",
                "title": "Application Review",
                "desc": "Initial review of the student's application and internship interest.",
                "stage_type": "screening"
            },
            {
                "order": 2,
                "stage_id": "02",
                "title": "Resume & Profile Screening",
                "desc": "Review academic background, resume, verified skills, projects and relevant experience.",
                "stage_type": "screening"
            },
            {
                "order": 3,
                "stage_id": "03",
                "title": "Online Assessment",
                "desc": "Skill-specific assessment used to evaluate technical fundamentals.",
                "stage_type": "assessment"
            },
            {
                "order": 4,
                "stage_id": "04",
                "title": "Technical Evaluation",
                "desc": "Evaluation of practical development knowledge and project experience.",
                "stage_type": "assessment"
            },
            {
                "order": 5,
                "stage_id": "05",
                "title": "Technical Interview",
                "desc": "Technical discussion covering problem solving, engineering fundamentals and role-specific skills.",
                "stage_type": "interview"
            },
            {
                "order": 6,
                "stage_id": "06",
                "title": "HR / Culture Discussion",
                "desc": "Discussion covering communication, learning mindset, collaboration and expectations.",
                "stage_type": "interview"
            },
            {
                "order": 7,
                "stage_id": "07",
                "title": "Final Selection",
                "desc": "Final evaluation and internship selection decision.",
                "stage_type": "offer"
            }
        ]

        # Cleanly replace stages for this company ID only
        db.query(CompanyHiringStage).filter(CompanyHiringStage.company_id == company.id).delete()
        for stage_info in hiring_stages_data:
            stage_obj = CompanyHiringStage(
                company_id=company.id,
                order=stage_info["order"],
                stage_id=stage_info["stage_id"],
                title=stage_info["title"],
                desc=stage_info["desc"],
                stage_type=stage_info["stage_type"],
                is_active=True
            )
            db.add(stage_obj)
        print("✓ Persisted 7 standardized hiring process stages for Catalyst Coders.")

        # 8. Sync RecruiterUser association
        recruiter = db.query(RecruiterUser).filter(RecruiterUser.company_name == "Catalyst Coders").first()
        if recruiter:
            recruiter.company_id = company.id
            recruiter.industry = company.industry
            recruiter.company_size = company.company_size
            recruiter.status = "APPROVED"
            recruiter.is_verified = True
            db.add(recruiter)
            print(f"✓ Associated Recruiter {recruiter.name} ({recruiter.email}) with Company ID {company.id}")

        # 9. Calculate completion using authoritative backend completion service
        db.flush()
        completion_result = calculate_company_profile_completion(company, db)

        db.commit()
        db.refresh(company)

        print("\n" + "-" * 50)
        print("CATALYST CODERS POPULATION RESULTS:")
        print(f"  Company Name: {company.name}")
        print(f"  Company ID: {company.id}")
        print(f"  Completion Percentage: {company.completion_percentage}%")
        print(f"  Profile Completed Flag: {company.profile_completed}")
        print(f"  Missing Required Sections: {completion_result['missing_required_sections']}")
        print(f"  Section Breakdown: {completion_result['breakdown']}")
        print("-" * 50)

        assert company.completion_percentage == 100, f"Expected 100%, got {company.completion_percentage}%"
        assert company.profile_completed is True, "Expected profile_completed to be True"
        assert len(completion_result["missing_required_sections"]) == 0, f"Unexpected missing sections: {completion_result['missing_required_sections']}"
        print("\n[SUCCESS] Catalyst Coders profile is 100% complete and verified in PostgreSQL!")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Failed to populate Catalyst Coders profile: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    populate_catalyst_coders_profile()
