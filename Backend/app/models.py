from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, func, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin", nullable=False)
    status = Column(String, default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RecruiterUser(Base):
    __tablename__ = "recruiters"

    id = Column(Integer, primary_key=True, index=True)
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
    completed_at = Column(DateTime(timezone=True), server_default=func.now())


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
