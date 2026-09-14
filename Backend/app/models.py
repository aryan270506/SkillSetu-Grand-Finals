from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func, ForeignKey
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
