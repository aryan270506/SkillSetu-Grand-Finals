from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, func, ForeignKey, Numeric, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base

PortableJSON = JSON().with_variant(JSONB(), "postgresql")

class StudentUser(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    headline = Column(String, nullable=True)
    location = Column(String, nullable=True)
    years_of_experience = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    university = Column(String, nullable=True)
    start_year = Column(String, nullable=True)
    graduation_year = Column(String, nullable=True)
    cgpa_or_percentage = Column(String, nullable=True)
    marksheet_url = Column(String, nullable=True)
    target_careers = Column(String, nullable=True)  # JSON or comma-separated string of career IDs
    target_industries = Column(String, nullable=True)  # JSON or comma-separated string of industry IDs
    skill_ids = Column(String, nullable=True)  # JSON or comma-separated string of skill IDs
    preferred_locations = Column(String, nullable=True)  # JSON or comma-separated string of location IDs
    opportunity_types = Column(String, nullable=True)  # JSON or comma-separated string
    work_preferences = Column(String, nullable=True)  # JSON or comma-separated string
    timeline = Column(String, nullable=True)
    career_goal_text = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)  # Stored resume file URL or base64
    resume_data = Column(String, nullable=True)  # JSON string of structured resume analysis
    resume_score = Column(Integer, nullable=True)  # Calculated score (0-100)
    linkedin_url = Column(String, nullable=True)  # LinkedIn Profile Link
    portfolio_url = Column(String, nullable=True)  # Personal Portfolio Link
    github_user_id = Column(String, nullable=True)  # Associated GitHub User ID
    is_verified = Column(Boolean, default=True)
    annual_family_income = Column(Numeric(12, 2), nullable=True)
    social_category = Column(String, nullable=True)  # General, OBC, SC, ST, EWS
    domicile_state = Column(String, nullable=True)  # e.g. Maharashtra, Karnataka
    gender = Column(String, nullable=True)  # female, male, other, prefer_not_to_say
    is_pwd = Column(Boolean, default=False)
    disability_percentage = Column(Float, nullable=True)
    is_minority = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    saved_internships = relationship("SavedInternship", back_populates="student", cascade="all, delete-orphan")
    internship_applications = relationship("InternshipApplication", back_populates="student", cascade="all, delete-orphan")
    saved_scholarships = relationship("SavedScholarship", back_populates="student", cascade="all, delete-orphan")
    scholarship_applications = relationship("ScholarshipApplication", back_populates="student", cascade="all, delete-orphan")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin", nullable=False)
    status = Column(String, default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    logo_url = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    company_type = Column(String, default="Private Ltd")
    company_size = Column(String, default="500-1,000 employees")
    founded_year = Column(String, default="2015")
    website = Column(String, nullable=True)
    email = Column(String, nullable=True)
    headquarters = Column(String, default="Pune, Maharashtra")
    description = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)
    vision = Column(Text, nullable=True)
    culture_tags = Column(Text, nullable=True)  # JSON array string
    perks = Column(Text, nullable=True)  # JSON array string
    preferred_domains = Column(Text, nullable=True)  # JSON array string
    preferred_skills = Column(Text, nullable=True)  # JSON array string
    preferred_work_mode = Column(String, default="Hybrid")
    preferred_duration = Column(String, default="3-6 Months")
    social_links = Column(Text, nullable=True)  # JSON dict string
    is_email_verified = Column(Boolean, default=True)
    is_website_verified = Column(Boolean, default=True)
    is_business_verified = Column(Boolean, default=True)
    is_recruiter_verified = Column(Boolean, default=True)
    profile_completed = Column(Boolean, default=False, index=True)
    completion_percentage = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    locations = relationship("CompanyLocation", back_populates="company", cascade="all, delete-orphan")
    hiring_stages = relationship("CompanyHiringStage", back_populates="company", cascade="all, delete-orphan", order_by="CompanyHiringStage.order")
    recruiters = relationship("RecruiterUser", back_populates="company")
    postings = relationship("InternshipPosting", back_populates="company", cascade="all, delete-orphan")
    interviews = relationship("RecruiterInterview", back_populates="company", cascade="all, delete-orphan")


class CompanyLocation(Base):
    __tablename__ = "company_locations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)  # e.g. "Pune, Maharashtra"
    sub = Column(String, nullable=True)  # e.g. "Hinjawadi Phase 3, Tech Park"
    badge = Column(String, default="Branch")  # "HQ", "R&D Center", "Branch"
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="locations")


class CompanyHiringStage(Base):
    __tablename__ = "company_hiring_stages"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    order = Column(Integer, default=1)
    stage_id = Column(String, nullable=True)  # e.g. "01", "02"
    title = Column(String, nullable=False)  # e.g. "Application", "Technical Interview"
    desc = Column(String, nullable=True)  # e.g. "Via platform", "System design & live coding"
    stage_type = Column(String, default="interview")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="hiring_stages")


class RecruiterUser(Base):
    __tablename__ = "recruiters"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company_name = Column(String, nullable=False)
    company_website = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    is_verified = Column(Boolean, default=True)
    status = Column(String, default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(Integer, ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(Integer, ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="recruiters")


class RecruiterInterview(Base):
    __tablename__ = "recruiter_interviews"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("recruiters.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id", ondelete="SET NULL"), nullable=True, index=True)
    candidate_name = Column(String, nullable=False)
    candidate_college = Column(String, nullable=True)
    role_title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    round_name = Column(String, default="Technical Interview")
    interview_date = Column(DateTime(timezone=True), nullable=True)
    interview_time = Column(String, nullable=True)  # e.g. "10:30 AM"
    mode = Column(String, default="📹 Meet + Sandbox")
    status = Column(String, default="Scheduled")  # Scheduled, Completed, Cancelled
    match_pct = Column(String, default="90%")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="interviews")
    recruiter = relationship("RecruiterUser")


class StudentGithubConnection(Base):
    __tablename__ = "student_github_connections"

    id = Column(Integer, primary_key=True, index=True)
    student_email = Column(String, index=True, nullable=False, unique=True)
    github_user_id = Column(String, nullable=True)
    github_username = Column(String, index=True, nullable=False)
    github_profile_url = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    access_token = Column(String, nullable=True)  # Securely stored access token on backend
    scope = Column(String, nullable=True)  # Granted OAuth scopes
    connection_status = Column(String, default="CONNECTED")  # CONNECTED, EXPIRED, DISCONNECTED
    repos_json = Column(Text, nullable=True)  # All fetched public & accessible repos
    selected_repo_ids = Column(Text, nullable=True)  # JSON list of selected repo IDs/names
    skills_json = Column(Text, nullable=True)  # Generated skill evidence JSON
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class PendingOTP(Base):
    __tablename__ = "pending_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    otp = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# 1. ESCO REFERENCE TABLES
# ==========================================
class EscoOccupation(Base):
    __tablename__ = "esco_occupations"

    id = Column(Integer, primary_key=True, index=True)
    concept_uri = Column(String, unique=True, index=True, nullable=False)
    isco_code = Column(String, nullable=True)
    preferred_label = Column(String, index=True, nullable=False)
    alt_labels = Column(String, nullable=True)
    description = Column(String, nullable=True)


class EscoSkill(Base):
    __tablename__ = "esco_skills"

    id = Column(Integer, primary_key=True, index=True)
    concept_uri = Column(String, unique=True, index=True, nullable=False)
    skill_type = Column(String, nullable=True)
    reuse_level = Column(String, nullable=True)
    preferred_label = Column(String, index=True, nullable=False)
    alt_labels = Column(String, nullable=True)
    description = Column(String, nullable=True)


class EscoOccupationSkill(Base):
    __tablename__ = "esco_occupation_skills"

    id = Column(Integer, primary_key=True, index=True)
    occupation_uri = Column(String, index=True, nullable=False)
    skill_uri = Column(String, index=True, nullable=False)
    relation_type = Column(String, nullable=True)
    skill_type = Column(String, nullable=True)


# ==========================================
# 2. SKILLSETU CANONICAL TAXONOMY TABLES
# ==========================================
class SkillSetuCareer(Base):
    __tablename__ = "skillsetu_careers"

    id = Column(String, primary_key=True, index=True)  # e.g. 'car_frontend_developer'
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)  # e.g. 'Software Engineering'
    esco_uri = Column(String, nullable=True)
    description = Column(String, nullable=True)
    popularity_score = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)


class SkillSetuSkill(Base):
    __tablename__ = "skillsetu_skills"

    id = Column(String, primary_key=True, index=True)  # e.g. 'skill_react'
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)  # e.g. 'Web Development'
    skill_type = Column(String, default="technical")
    esco_uri = Column(String, nullable=True)
    description = Column(String, nullable=True)
    popularity_score = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)


class SkillSetuSkillAlias(Base):
    __tablename__ = "skillsetu_skill_aliases"

    id = Column(Integer, primary_key=True, index=True)
    alias_name = Column(String, unique=True, index=True, nullable=False)
    canonical_skill_id = Column(String, nullable=False, index=True)


class SkillSetuCareerSkill(Base):
    __tablename__ = "skillsetu_career_skills"

    id = Column(Integer, primary_key=True, index=True)
    career_id = Column(String, nullable=False, index=True)
    skill_id = Column(String, nullable=False, index=True)
    relation_type = Column(String, default="essential")
    weight = Column(Integer, default=1)


class SkillSetuIndustry(Base):
    __tablename__ = "skillsetu_industries"

    id = Column(String, primary_key=True, index=True)  # e.g. 'ind_fintech'
    name = Column(String, nullable=False, index=True)
    parent_category = Column(String, nullable=False, index=True)  # e.g. 'Technology'
    is_visible = Column(Boolean, default=True)


class SkillSetuLocation(Base):
    __tablename__ = "skillsetu_locations"

    id = Column(String, primary_key=True, index=True)  # e.g. 'loc_in_mh_pune'
    name = Column(String, nullable=False, index=True)  # e.g. 'Pune'
    type = Column(String, nullable=False, index=True)  # 'country', 'state', 'city'
    city = Column(String, nullable=True, index=True)
    district = Column(String, nullable=True, index=True)
    state = Column(String, nullable=True, index=True)
    country = Column(String, nullable=False, index=True)
    country_code = Column(String, nullable=True, index=True)
    is_popular = Column(Boolean, default=False)
    popularity_score = Column(Integer, default=0)


# ==========================================
# 3. STUDENT ACTIVITY & PROGRESS MODELS
# ==========================================
class StudentAssessmentAttempt(Base):
    __tablename__ = "student_assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True)
    test_title = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    status = Column(String, nullable=False)  # 'VERIFIED' or 'NEEDS_WORK'
    used_question_ids = Column(Text, nullable=True)  # JSON list of question IDs used in attempt
    answers_json = Column(Text, nullable=True)  # JSON map of user answers
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    challenge_id = Column(String, nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True)
    repository_url = Column(String, nullable=False)
    analysis_status = Column(String, default="PENDING")
    analysis_result = Column(Text, nullable=True) # JSON string of skills found
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    analyzed_at = Column(DateTime(timezone=True), nullable=True)


class StudentPracticeAttempt(Base):
    __tablename__ = "student_practice_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    challenge_id = Column(String, nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True)
    progress_step = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StudentLearningProgress(Base):
    __tablename__ = "student_learning_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    step_title = Column(String, nullable=False)
    status = Column(String, default="LOCKED")  # 'COMPLETED', 'ACTIVE', 'LOCKED'
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StudentSkillHistory(Base):
    __tablename__ = "student_skill_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    career_name = Column(String, nullable=False, index=True)
    career_match_score = Column(Integer, nullable=False)
    technical_score = Column(Integer, nullable=False)
    practical_score = Column(Integer, nullable=False)
    evidence_score = Column(Integer, nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# 4. ASSESSMENT, COURSE & CHALLENGE DATASETS
# ==========================================
class EscoAssessment(Base):
    __tablename__ = "esco_assessments"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    pass_score = Column(Integer, default=70)


class EscoAssessmentQuestion(Base):
    __tablename__ = "esco_assessment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("esco_assessments.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON string {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_option = Column(String, nullable=False)  # e.g. "A"
    explanation = Column(Text, nullable=True)
    question_fingerprint = Column(String, nullable=True, index=True)


class SkillCourseResource(Base):
    __tablename__ = "skill_course_resources"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    provider = Column(String, default="SkillSetu / SWAYAM")
    description = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    difficulty = Column(String, default="Intermediate")
    duration = Column(String, default="45 mins")


class SkillPracticeChallenge(Base):
    __tablename__ = "skill_practice_challenges"

    id = Column(String, primary_key=True, index=True)  # e.g. 'ch_docker_01'
    skill_name = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String, default="Intermediate")
    tags_json = Column(Text, nullable=True)  # JSON list ["DOCKER", "DEV-OPS"]
    total_steps = Column(Integer, default=3)


class AdaptiveCodingChallenge(Base):
    __tablename__ = "adaptive_coding_challenges"

    id = Column(String, primary_key=True, index=True)  # e.g. 'ch_sql_opt_9482'
    skill_name = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    difficulty = Column(String, default="intermediate")  # 'beginner', 'intermediate', 'advanced'
    language = Column(String, default="python")  # 'sql', 'python', 'javascript', 'go', 'java'
    concepts_json = Column(Text, nullable=True)  # JSON list ["Indexing", "JOINs"]
    why_this_challenge = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    constraints_json = Column(Text, nullable=True)  # JSON list
    examples_json = Column(Text, nullable=True)  # JSON list of {input, output, explanation}
    starter_code = Column(Text, nullable=False)
    test_cases_json = Column(Text, nullable=False)  # JSON list of {input, expected_output, is_hidden, description}
    schema_sql = Column(Text, nullable=True)  # SQL schema fixture for database questions
    hints_json = Column(Text, nullable=True)  # JSON list of progressive hints
    xp_reward = Column(Integer, default=30)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AdaptiveCodingAttempt(Base):
    __tablename__ = "adaptive_coding_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    challenge_id = Column(String, nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True)
    language = Column(String, default="python")
    code_submitted = Column(Text, nullable=False)
    passed = Column(Boolean, default=False)
    passed_tests = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    test_results_json = Column(Text, nullable=True)
    compile_error = Column(Text, nullable=True)
    runtime_error = Column(Text, nullable=True)
    execution_time_ms = Column(Float, default=0.0)
    attempt_number = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AdaptiveCodingProgress(Base):
    __tablename__ = "adaptive_coding_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, unique=True, index=True)
    current_challenge_id = Column(String, nullable=True)
    current_skill_name = Column(String, nullable=True)
    current_difficulty = Column(String, default="intermediate")
    completed_challenges_count = Column(Integer, default=0)
    completed_challenge_ids_json = Column(Text, default="[]")
    failed_challenge_ids_json = Column(Text, default="[]")
    weak_concepts_json = Column(Text, default="[]")
    mastered_concepts_json = Column(Text, default="[]")
    consecutive_successes = Column(Integer, default=0)
    consecutive_failures = Column(Integer, default=0)
    total_xp_earned = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CareerBenchmark(Base):
    __tablename__ = "career_benchmarks"

    id = Column(String, primary_key=True, index=True)  # e.g. 'bm_full_stack_developer'
    career_id = Column(String, nullable=False, index=True)  # e.g. 'car_full_stack_developer'
    career_name = Column(String, nullable=False, index=True)  # e.g. 'Full Stack Developer'
    name = Column(String, nullable=False)  # e.g. 'Tier-1 Production Benchmark: Full Stack Systems'
    tier = Column(String, default="Tier-1")  # 'Tier-1', 'Tier-2', 'Industry Standard'
    description = Column(Text, nullable=False)  # Role-specific calibration description
    threshold = Column(Integer, default=80)  # e.g. 80, 85, 75
    baseline_score = Column(Integer, default=58)  # Average entry/market baseline
    qualification_standard = Column(String, default="NSQF Level 7 (Software Engineer)")
    is_nsqf_compliant = Column(Boolean, default=True)
    domains_config_json = Column(Text, nullable=True)  # Domain definitions & skill mappings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CareerOccupationMapping(Base):
    __tablename__ = "career_occupation_mappings"

    id = Column(Integer, primary_key=True, index=True)
    career_id = Column(String, nullable=False, unique=True, index=True)  # e.g. 'car_senior_frontend_engineer'
    esco_occupation_uri = Column(String, nullable=False, index=True)
    confidence_score = Column(Float, nullable=False, default=0.0)
    mapping_status = Column(String, nullable=False, default="validated")  # 'validated', 'needs_review', 'pending', 'rejected'
    mapping_method = Column(String, nullable=False, default="groq_validated")  # 'groq_validated', 'manual', 'existing_mapping'
    groq_model = Column(String, nullable=True)
    reasoning_summary = Column(Text, nullable=True)
    validated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
class EscoSkillEvidenceMapping(Base):
    __tablename__ = "esco_skill_evidence_mappings"

    id = Column(Integer, primary_key=True, index=True)
    student_skill_name = Column(String, nullable=False, index=True)  # e.g. 'React', 'JavaScript', 'Git'
    esco_skill_concept_uri = Column(String, nullable=False, index=True) # e.g. 'http://data.europa.eu/esco/skill/...'
    esco_skill_title = Column(String, nullable=False, index=True)  # e.g. 'computer programming'
    mapping_method = Column(String, default="taxonomy_alias") # 'exact_identity', 'taxonomy_alias', 'domain_hierarchy', 'semantic'
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StudentCareerSkillRelationship(Base):
    __tablename__ = "student_career_skill_relationships"

    id = Column(Integer, primary_key=True, index=True)
    student_email = Column(String, index=True, nullable=False)
    career_name = Column(String, index=True, nullable=False)
    student_skill_name = Column(String, nullable=False, index=True)
    esco_skill_name = Column(String, nullable=False, index=True)

    relationship_type = Column(String, nullable=False, default="NONE")  # DIRECT, STRONG_RELATED, SUPPORTING, NONE
    confidence = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)

    student_level = Column(Float, default=0.0)
    contribution_level = Column(Float, default=0.0)

    evidence_sources = Column(Text, nullable=True)  # JSON string or comma-separated list
    evidence_summary = Column(Text, nullable=True)

    groq_model = Column(String, nullable=True)
    mapping_version = Column(String, default="v3_semantic_groq")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CareerMarketSkill(Base):
    __tablename__ = "career_market_skills"

    id = Column(Integer, primary_key=True, index=True)
    career_id = Column(String, index=True, nullable=False)
    career_name = Column(String, index=True, nullable=False)
    skill_name = Column(String, nullable=False, index=True)
    canonical_skill_name = Column(String, nullable=False, index=True)

    importance_tier = Column(String, nullable=False, default="IMPORTANT")  # CORE, IMPORTANT, ADVANTAGE
    demand_score = Column(Float, default=80.0)  # 0 to 100 relative demand score
    posting_frequency = Column(Integer, default=1)
    source_count = Column(Integer, default=1)

    region = Column(String, default="Global/India")
    market_period = Column(String, default="2026-Q3")
    source = Column(String, default="SkillSetu Job Market Engine")

    confidence = Column(Float, default=1.0)
    groq_normalized = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ==========================================
# 5. COURSE AGGREGATION FOUNDATION MODELS
# ==========================================
class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=True)  # e.g., 'mooc', 'video_platform', 'university'
    base_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    courses = relationship("Course", back_populates="provider", cascade="all, delete-orphan")
    sync_logs = relationship("CourseSyncLog", back_populates="provider", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=False)
    instructor = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    language = Column(String, nullable=True)
    level = Column(String, nullable=True)  # Beginner, Intermediate, Advanced, All Levels
    duration = Column(Float, nullable=True)
    duration_unit = Column(String, nullable=True)  # hours, weeks, minutes
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String, nullable=True)
    certificate_available = Column(Boolean, default=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)
    embedding_content_hash = Column(String, nullable=True, index=True)
    embedding_model = Column(String, nullable=True)
    embedding_indexed_at = Column(DateTime(timezone=True), nullable=True)
    embedding_status = Column(String, default="pending", nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("provider_id", "external_id", name="uq_provider_external_id"),
    )

    # Relationships
    provider = relationship("Provider", back_populates="courses")
    skills = relationship("CourseSkill", back_populates="course", cascade="all, delete-orphan")
    careers = relationship("CourseCareer", back_populates="course", cascade="all, delete-orphan")


class CourseSkill(Base):
    __tablename__ = "course_skills"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    esco_skill_id = Column(Integer, ForeignKey("esco_skills.id", ondelete="SET NULL"), nullable=True, index=True)
    skill_name = Column(String, nullable=False, index=True)
    confidence = Column(Float, default=1.0)  # 0.0 to 1.0
    source = Column(String, default="provider")  # llm, rule, keyword, manual, provider
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("course_id", "esco_skill_id", name="uq_course_esco_skill"),
    )

    # Relationships
    course = relationship("Course", back_populates="skills")
    esco_skill = relationship("EscoSkill")


class CourseCareer(Base):
    __tablename__ = "course_careers"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    career_id = Column(String, ForeignKey("skillsetu_careers.id", ondelete="CASCADE"), nullable=False, index=True)
    relevance_score = Column(Float, default=1.0)  # 0.0 to 1.0
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("course_id", "career_id", name="uq_course_career"),
    )

    # Relationships
    course = relationship("Course", back_populates="careers")
    career = relationship("SkillSetuCareer")


class CourseSyncLog(Base):
    __tablename__ = "course_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    courses_found = Column(Integer, default=0)
    courses_created = Column(Integer, default=0)
    courses_updated = Column(Integer, default=0)
    courses_deactivated = Column(Integer, default=0)
    courses_failed = Column(Integer, default=0)
    status = Column(String, default="running", index=True)  # running, completed, partial, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    provider = relationship("Provider", back_populates="sync_logs")


# ==========================================
# 6. LEARNING PATH & PROGRESS TRACKING TABLES
# ==========================================
class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    target_careers = Column(Text, nullable=True)  # JSON string of target careers
    status = Column(String, default="active", index=True)  # active, completed, archived
    progress_percent = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("StudentUser")
    items = relationship("LearningPathItem", back_populates="learning_path", cascade="all, delete-orphan", order_by="LearningPathItem.sequence_order")


class LearningPathItem(Base):
    __tablename__ = "learning_path_items"

    id = Column(Integer, primary_key=True, index=True)
    learning_path_id = Column(Integer, ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("esco_skills.id", ondelete="SET NULL"), nullable=True, index=True)
    skill_name = Column(String, nullable=False, index=True)
    stage = Column(String, default="Intermediate", nullable=False, index=True)  # Foundation, Intermediate, Advanced
    sequence_order = Column(Integer, default=1, index=True)
    status = Column(String, default="not_started", index=True)  # not_started, in_progress, completed, skipped
    progress_percent = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("learning_path_id", "course_id", "skill_name", name="uq_path_course_skill"),
    )

    # Relationships
    learning_path = relationship("LearningPath", back_populates="items")
    course = relationship("Course")
    esco_skill = relationship("EscoSkill")


# ==========================================
# 7. UNIFIED STUDENT SKILL EVIDENCE TABLE
# ==========================================
class StudentSkillEvidence(Base):
    __tablename__ = "student_skill_evidence"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    esco_skill_id = Column(Integer, ForeignKey("esco_skills.id", ondelete="SET NULL"), nullable=True, index=True)
    skill_name = Column(String, nullable=False, index=True)
    source_type = Column(String, nullable=False, index=True)  # github, resume, profile, course_completion, learning_progress
    source_id = Column(String, nullable=True)  # e.g. course:133, repo:123, resume_proj:1
    evidence_score = Column(Float, default=0.0)  # 0.0 to 1.0
    confidence_score = Column(Float, default=1.0)  # 0.0 to 1.0
    evidence_metadata = Column(Text, nullable=True)  # JSON string of source metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "skill_name", "source_type", "source_id", name="uq_student_skill_source"),
    )

    # Relationships
    student = relationship("StudentUser")
    esco_skill = relationship("EscoSkill")


# ==========================================
# 8. INTERNSHIP, SCHOLARSHIP & OPPORTUNITY MODELS
# ==========================================
class InternshipPosting(Base):
    __tablename__ = "internship_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("recruiters.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    required_skills = Column(String, nullable=True)  # JSON or comma-separated
    location = Column(String, nullable=True)
    work_mode = Column(String, default="Remote") # Remote, Hybrid, On-site
    stipend = Column(String, nullable=True)
    duration = Column(String, default="6 Months")
    openings = Column(Integer, default=1)
    application_threshold = Column(Integer, default=80, nullable=False)  # Configurable minimum match % to apply directly (50-100)
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="Active") # Active, Draft, Closed, Paused
    active_pipeline_version_id = Column(Integer, ForeignKey("recruitment_pipeline_versions.id", ondelete="SET NULL", use_alter=True, name="fk_posting_active_pipeline_version"), nullable=True)
    draft_pipeline_version_id = Column(Integer, ForeignKey("recruitment_pipeline_versions.id", ondelete="SET NULL", use_alter=True, name="fk_posting_draft_pipeline_version"), nullable=True)
    automation_enabled = Column(Boolean, default=False, nullable=False)
    automation_paused = Column(Boolean, default=False, nullable=False)
    automation_mode = Column(String, default="REVIEW_GATED", nullable=False)  # FULL_AUTOMATION, REVIEW_GATED, MANUAL_ONLY
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="postings")
    recruiter = relationship("RecruiterUser")
    active_pipeline_version = relationship("RecruitmentPipelineVersion", foreign_keys=[active_pipeline_version_id], post_update=True)
    draft_pipeline_version = relationship("RecruitmentPipelineVersion", foreign_keys=[draft_pipeline_version_id], post_update=True)
    pipeline_versions = relationship("RecruitmentPipelineVersion", foreign_keys="RecruitmentPipelineVersion.internship_id", back_populates="internship", cascade="all, delete-orphan")


class InternshipListing(Base):
    __tablename__ = "internship_listings"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, default="curated", nullable=False, index=True)  # 'jobicy', 'arbeitnow', 'aicte', 'curated'
    source_id = Column(String, nullable=True, index=True)
    source_url = Column(String, nullable=True)
    title = Column(String, nullable=False, index=True)
    company_name = Column(String, nullable=False, index=True)
    company_logo = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    career_id = Column(String, ForeignKey("skillsetu_careers.id", ondelete="SET NULL"), nullable=True, index=True)
    industry_id = Column(String, nullable=True, index=True)
    location_id = Column(String, nullable=True, index=True)
    location_name = Column(String, default="Pune, India")
    stipend = Column(String, default="₹15,000 - ₹30,000 / month")
    stipend_min = Column(Numeric(12, 2), nullable=True)
    stipend_max = Column(Numeric(12, 2), nullable=True)
    currency = Column(String, default="INR")
    duration = Column(String, default="3 - 6 Months")
    opportunity_type = Column(String, default="internship")  # internship, full-time, contract
    work_preference = Column(String, default="remote")  # remote, hybrid, on-site
    min_cgpa = Column(Float, default=0.0)
    openings = Column(Integer, default=1)
    application_threshold = Column(Integer, default=80, nullable=False)  # Configurable minimum match % to apply directly (50-100)
    batch_eligible = Column(String, nullable=True)
    education_requirements = Column(String, nullable=True)
    branch_requirements = Column(String, nullable=True)
    apply_url = Column(String, nullable=True)
    application_deadline = Column(DateTime(timezone=True), nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    verified = Column(Boolean, default=True)
    content_hash = Column(String, nullable=True, index=True)
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now())
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_internship_source_id"),
    )

    # Relationships
    career = relationship("SkillSetuCareer")
    required_skills = relationship("InternshipRequiredSkill", back_populates="internship", cascade="all, delete-orphan")


class InternshipRequiredSkill(Base):
    __tablename__ = "internship_required_skills"

    id = Column(Integer, primary_key=True, index=True)
    internship_id = Column(Integer, ForeignKey("internship_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    esco_skill_id = Column(Integer, ForeignKey("esco_skills.id", ondelete="SET NULL"), nullable=True, index=True)
    skill_id = Column(String, nullable=False, index=True)  # e.g. 'skill_react' or canonical skill identifier
    skill_name = Column(String, nullable=False, index=True)
    is_mandatory = Column(Boolean, default=True)

    # Relationships
    internship = relationship("InternshipListing", back_populates="required_skills")
    esco_skill = relationship("EscoSkill")


class SavedInternship(Base):
    __tablename__ = "saved_internships"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String, default="external", nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    title_snapshot = Column(String, nullable=True)
    organization_snapshot = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    application_url = Column(String, nullable=True)
    internship_id = Column(Integer, nullable=True, index=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "source", "source_id", name="uq_student_saved_internship_ext"),
    )

    # Relationships
    student = relationship("StudentUser", back_populates="saved_internships")


class InternshipApplication(Base):
    __tablename__ = "internship_applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    source = Column(String, default="external", nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    title_snapshot = Column(String, nullable=True)
    company_snapshot = Column(String, nullable=True)
    source_url_snapshot = Column(String, nullable=True)
    application_url_snapshot = Column(String, nullable=True)
    match_score_at_apply = Column(Float, nullable=True)
    application_threshold_at_apply = Column(Integer, default=80, nullable=True)
    eligibility_snapshot = Column(String, nullable=True)
    status = Column(String, default="APPLIED", index=True)  # APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, REJECTED, WITHDRAWN
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    feedback = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    internship_id = Column(Integer, nullable=True, index=True)
    pipeline_version_id = Column(Integer, ForeignKey("recruitment_pipeline_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    is_manually_overridden = Column(Boolean, default=False, nullable=False)
    active_override_id = Column(Integer, ForeignKey("recruiter_decision_overrides.id", ondelete="SET NULL", use_alter=True, name="fk_application_active_override"), nullable=True)
    eligibility_status = Column(String, default="PENDING", nullable=False)  # PENDING, ELIGIBLE, INELIGIBLE, AWAITING_MANUAL_REVIEW
    eligibility_breakdown = Column(PortableJSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "source", "source_id", name="uq_student_internship_app_ext"),
    )

    # Relationships
    student = relationship("StudentUser", back_populates="internship_applications")
    pipeline_version = relationship("RecruitmentPipelineVersion", foreign_keys=[pipeline_version_id])
    active_override = relationship("RecruiterDecisionOverride", foreign_keys=[active_override_id], post_update=True)
    overrides = relationship("RecruiterDecisionOverride", foreign_keys="RecruiterDecisionOverride.application_id", back_populates="application", cascade="all, delete-orphan")


class InternshipAssessmentConfig(Base):
    __tablename__ = "internship_assessment_configs"

    id = Column(Integer, primary_key=True, index=True)
    internship_id = Column(Integer, ForeignKey("internship_postings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("recruiters.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    pipeline_config = Column(Text, nullable=False)  # JSON string: rounds, question counts, durations, difficulty, coding languages, etc.
    scoring_weights = Column(Text, nullable=True)  # JSON string: aptitude, technical, interview, gd weights, passing threshold
    integrity_config = Column(Text, nullable=True)  # JSON string: proctoring settings (camera, mic, recording, telemetry)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    internship = relationship("InternshipPosting")
    company = relationship("Company")
    recruiter = relationship("RecruiterUser")


class CandidateAssessmentSession(Base):
    __tablename__ = "candidate_assessment_sessions"

    id = Column(String, primary_key=True, index=True)  # UUID string
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id", ondelete="CASCADE"), nullable=True, index=True)
    internship_id = Column(Integer, ForeignKey("internship_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, default="CREATED", index=True)  # CREATED, IN_PROGRESS, COMPLETED, FLAGGED, TERMINATED, EXPIRED
    current_round = Column(String, default="aptitude")
    overall_score = Column(Float, nullable=True)
    integrity_status = Column(String, default="VERIFIED", index=True)  # VERIFIED, WARNING_ISSUED, FLAGGED, HIGH_RISK, FAILED
    warning_count = Column(Integer, default=0)
    round_results = Column(Text, nullable=True)  # JSON string of all round results (aptitude, technical, interview, gd, integrity)
    evaluation = Column(Text, nullable=True)  # JSON string of synthesized final evaluation dossier
    assessment_url = Column(String, nullable=True)
    pipeline_version_id = Column(Integer, ForeignKey("recruitment_pipeline_versions.id", ondelete="SET NULL"), nullable=True)
    execution_status = Column(String, default="PENDING", nullable=False)  # PASS, FAIL, PENDING, INCOMPLETE, INVALID_SUBMISSION, EVALUATION_ERROR, AWAITING_MANUAL_REVIEW, MANUALLY_OVERRIDDEN
    client_telemetry_digest = Column(PortableJSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("StudentUser")
    application = relationship("InternshipApplication")
    internship = relationship("InternshipPosting")
    company = relationship("Company")
    pipeline_version = relationship("RecruitmentPipelineVersion", foreign_keys=[pipeline_version_id])


class Scholarship(Base):
    __tablename__ = "scholarships"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, default="verified_portal", nullable=False, index=True)  # 'nsp', 'aicte', 'corporate', 'state_gov'
    source_id = Column(String, nullable=False, index=True)
    source_url = Column(String, nullable=True)
    name = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    academic_year = Column(String, default="2026-27", index=True)
    scholarship_type = Column(String, default="Merit & Need-based")
    award_amount = Column(Numeric(12, 2), nullable=True)
    award_frequency = Column(String, default="per year")  # per year, one-time, full tuition
    award_description = Column(String, nullable=True)
    application_open = Column(DateTime(timezone=True), nullable=True)
    application_deadline = Column(DateTime(timezone=True), nullable=True, index=True)
    application_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    verified = Column(Boolean, default=True)
    content_hash = Column(String, nullable=True, index=True)
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_scholarship_source_id"),
    )

    # Relationships
    eligibility_rules = relationship("ScholarshipEligibilityRule", back_populates="scholarship", cascade="all, delete-orphan", uselist=False)


class ScholarshipEligibilityRule(Base):
    __tablename__ = "scholarship_eligibility_rules"

    id = Column(Integer, primary_key=True, index=True)
    scholarship_id = Column(Integer, ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    min_cgpa = Column(Float, nullable=True)
    min_percentage_12th = Column(Float, nullable=True)
    max_annual_family_income = Column(Numeric(12, 2), nullable=True)
    eligible_states = Column(Text, nullable=True)  # JSON array e.g. ["All"] or ["Maharashtra", "Karnataka"]
    eligible_categories = Column(Text, nullable=True)  # JSON array e.g. ["All"], ["SC", "ST", "OBC", "EWS"]
    eligible_genders = Column(Text, nullable=True)  # JSON array e.g. ["All"] or ["female"]
    eligible_degrees = Column(Text, nullable=True)  # JSON array e.g. ["B.Tech", "B.E.", "Diploma"]
    eligible_branches = Column(Text, nullable=True)  # JSON array e.g. ["All"] or ["Computer Science", "IT"]
    eligible_years = Column(Text, nullable=True)  # JSON array e.g. ["1st Year", "2nd Year", "All"]
    requires_pwd = Column(Boolean, default=False)
    requires_minority = Column(Boolean, default=False)
    other_conditions = Column(Text, nullable=True)

    # Relationships
    scholarship = relationship("Scholarship", back_populates="eligibility_rules")


class SavedScholarship(Base):
    __tablename__ = "saved_scholarships"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String, default="external", nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    name_snapshot = Column(String, nullable=True)
    provider_snapshot = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    application_url = Column(String, nullable=True)
    scholarship_id = Column(Integer, nullable=True, index=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "source", "source_id", name="uq_student_saved_scholarship_ext"),
    )

    # Relationships
    student = relationship("StudentUser", back_populates="saved_scholarships")


class ScholarshipApplication(Base):
    __tablename__ = "scholarship_applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String, default="external", nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    name_snapshot = Column(String, nullable=True)
    provider_snapshot = Column(String, nullable=True)
    source_url_snapshot = Column(String, nullable=True)
    application_url_snapshot = Column(String, nullable=True)
    eligibility_status_at_apply = Column(String, default="ELIGIBLE", nullable=True)
    status = Column(String, default="APPLIED", index=True)  # APPLIED, UNDER_REVIEW, ACCEPTED, REJECTED, WITHDRAWN
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    scholarship_id = Column(Integer, nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("student_id", "source", "source_id", name="uq_student_scholarship_app_ext"),
    )

    # Relationships
    student = relationship("StudentUser", back_populates="scholarship_applications")


class IngestionRunLog(Base):
    __tablename__ = "ingestion_run_logs"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String, nullable=False, index=True)  # 'internships' or 'scholarships'
    source_name = Column(String, nullable=False, index=True)  # 'jobicy', 'arbeitnow', 'nsp', 'aicte', 'corporate'
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    records_found = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_deactivated = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    status = Column(String, default="RUNNING", index=True)  # 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'
    error_log = Column(Text, nullable=True)


# ==========================================
# 9. PERSONAL AI CAREER MENTOR MODELS
# ==========================================
class MentorConversation(Base):
    __tablename__ = "mentor_conversations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, default="Career Guidance Session")
    summary = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("StudentUser")
    messages = relationship("MentorMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="MentorMessage.id")


class MentorMessage(Base):
    __tablename__ = "mentor_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("mentor_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String, nullable=False, index=True)  # 'user', 'ai', 'system', 'tool'
    content = Column(Text, nullable=False)
    tool_calls_json = Column(Text, nullable=True)  # JSON representation of tool calls made
    tool_results_json = Column(Text, nullable=True)  # JSON representation of tool execution outputs
    rich_content_json = Column(Text, nullable=True)  # Structured JSON for cards / action buttons
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("MentorConversation", back_populates="messages")


# ==========================================
# 10. RECRUITER APPLICATION AUDIT & EMAIL LOGS
# ==========================================
class ApplicationStatusAudit(Base):
    __tablename__ = "application_status_audits"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by_recruiter_id = Column(Integer, ForeignKey("recruiters.id", ondelete="SET NULL"), nullable=True)
    actor_type = Column(String, default="SYSTEM", nullable=False)  # SYSTEM, RECRUITER, ADMIN
    override_id = Column(Integer, ForeignKey("recruiter_decision_overrides.id", ondelete="SET NULL"), nullable=True)
    metadata_json = Column(PortableJSON, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    override = relationship("RecruiterDecisionOverride", foreign_keys=[override_id])


class ApplicationEmailLog(Base):
    __tablename__ = "application_email_logs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    email_type = Column(String, nullable=False, index=True)  # SHORTLISTED_EMAIL, UNSHORTLISTED_EMAIL
    recipient_email = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    status = Column(String, default="SENT", nullable=False)  # SENT, FAILED
# ==========================================
# 11. STUDENT AI PRACTICE ATTEMPTS & EVALUATION LOGS
# ==========================================
class StudentInterviewPracticeSubmission(Base):
    __tablename__ = "student_interview_practice_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, nullable=False, index=True)
    target_role = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True, index=True)
    skill = Column(String, nullable=True)
    question_text = Column(Text, nullable=False)
    student_answer = Column(Text, nullable=False)
    score = Column(Float, nullable=False, default=0.0)
    verdict = Column(String, nullable=True)
    answered_question = Column(Boolean, default=False)
    evaluation_json = Column(Text, nullable=True)  # Full structured JSON string from Groq
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    student = relationship("StudentUser")


# ==========================================
# 12. RECRUITMENT AUTOMATION & DURABLE ENGINE MODELS
# ==========================================

class RecruitmentPipelineVersion(Base):
    __tablename__ = "recruitment_pipeline_versions"

    id = Column(Integer, primary_key=True, index=True)
    internship_id = Column(Integer, ForeignKey("internship_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="DRAFT", index=True)  # DRAFT, PUBLISHED, SUPERSEDED, ARCHIVED
    content_hash = Column(String, nullable=False)  # SHA-256 fingerprint of the pipeline configuration
    
    # Validated structured configurations
    pipeline_config = Column(PortableJSON, nullable=False)       # Rounds, sequences, durations, sandbox params
    evaluation_rubrics = Column(PortableJSON, nullable=False)    # Detailed scoring rubrics per round
    eligibility_rules = Column(PortableJSON, nullable=False)     # Whitelisted degrees, min CGPA, passing years
    scoring_weights = Column(PortableJSON, nullable=False)       # Weights per round, pass thresholds, overall threshold
    automation_policy = Column(PortableJSON, nullable=False)     # Auto-screen, auto-progress, auto-select flags, batch/immediate
    
    published_by_id = Column(Integer, ForeignKey("recruiters.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("internship_id", "version_number", name="uq_internship_pipeline_version"),
    )

    internship = relationship("InternshipPosting", foreign_keys=[internship_id], back_populates="pipeline_versions")
    published_by = relationship("RecruiterUser", foreign_keys=[published_by_id])


class RecruitmentJob(Base):
    __tablename__ = "recruitment_job_queue"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False, index=True)  # SCREEN_APPLICANT, PROGRESS_ROUND, SYNTHESIZE_RESULTS, SEND_NOTIFICATION, SWEEP_DEADLINES
    status = Column(String, nullable=False, default="QUEUED", index=True)  # QUEUED, PROCESSING, COMPLETED, FAILED, DEAD_LETTER
    priority = Column(Integer, default=0, nullable=False, index=True)
    idempotency_key = Column(String, unique=True, nullable=True, index=True)
    
    payload = Column(PortableJSON, nullable=False)
    result = Column(PortableJSON, nullable=True)
    error_log = Column(Text, nullable=True)
    
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=5, nullable=False)
    next_run_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    locked_by = Column(String, nullable=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AssessmentCallbackEvent(Base):
    __tablename__ = "assessment_callback_events"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, nullable=False, index=True)
    session_id = Column(String, ForeignKey("candidate_assessment_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String, nullable=False, default="ROUND_COMPLETED")
    source_service = Column(String, nullable=False, default="Archive2")
    payload_hash = Column(String, nullable=False)
    status = Column(String, default="PROCESSED", nullable=False)  # RECEIVED, PROCESSING, PROCESSED, FAILED
    response_payload = Column(PortableJSON, nullable=True)
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("CandidateAssessmentSession")


class RecruiterDecisionOverride(Base):
    __tablename__ = "recruiter_decision_overrides"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("recruiters.id", ondelete="SET NULL"), nullable=True, index=True)
    
    override_type = Column(String, nullable=False)  # FORCE_ADVANCE_ROUND, REVERT_ROUND, MANUAL_SHORTLIST, MANUAL_REJECT, MANUAL_SCORE_REVISE, MANUAL_FINAL_SELECT, PUT_ON_HOLD
    status = Column(String, default="ACTIVE", nullable=False, index=True)  # ACTIVE, SUPERSEDED, REVOKED
    
    previous_state = Column(PortableJSON, nullable=False)
    new_state = Column(PortableJSON, nullable=False)
    
    reason_code = Column(String, nullable=False)   # EXCEPTIONAL_PORTFOLIO, AI_EVAL_MISMATCH, PROCTOR_FALSE_POSITIVE, etc.
    justification = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by_id = Column(Integer, ForeignKey("recruiters.id", ondelete="SET NULL"), nullable=True)

    application = relationship("InternshipApplication", foreign_keys=[application_id], back_populates="overrides")
    recruiter = relationship("RecruiterUser", foreign_keys=[recruiter_id])
    revoked_by = relationship("RecruiterUser", foreign_keys=[revoked_by_id])


class AIInvocationTelemetry(Base):
    __tablename__ = "ai_invocation_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    feature = Column(String, nullable=False, index=True)  # JD_ANALYSIS, RUBRIC_EVAL, INTERVIEW_SYNTHESIS
    model = Column(String, nullable=False, index=True)    # e.g., gemini-3.5-flash-lite
    latency_ms = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(Numeric(10, 6), nullable=True)
    status = Column(String, nullable=False)  # SUCCESS, TIMEOUT, SCHEMA_PARSE_ERROR, API_ERROR
    error_detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


