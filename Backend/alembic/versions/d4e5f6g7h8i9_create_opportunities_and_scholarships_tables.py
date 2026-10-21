"""create_opportunities_and_scholarships_tables

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-09-30 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add demographic and eligibility columns to students table if not existing
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_student_cols = [c['name'] for c in inspector.get_columns('students')]
    
    if 'annual_family_income' not in existing_student_cols:
        op.add_column('students', sa.Column('annual_family_income', sa.Numeric(12, 2), nullable=True))
    if 'social_category' not in existing_student_cols:
        op.add_column('students', sa.Column('social_category', sa.String(), nullable=True))
    if 'domicile_state' not in existing_student_cols:
        op.add_column('students', sa.Column('domicile_state', sa.String(), nullable=True))
    if 'gender' not in existing_student_cols:
        op.add_column('students', sa.Column('gender', sa.String(), nullable=True))
    if 'is_pwd' not in existing_student_cols:
        op.add_column('students', sa.Column('is_pwd', sa.Boolean(), server_default='false', nullable=True))
    if 'disability_percentage' not in existing_student_cols:
        op.add_column('students', sa.Column('disability_percentage', sa.Float(), nullable=True))
    if 'is_minority' not in existing_student_cols:
        op.add_column('students', sa.Column('is_minority', sa.Boolean(), server_default='false', nullable=True))

    # 2. Expand internship_listings table with production columns
    existing_intern_cols = [c['name'] for c in inspector.get_columns('internship_listings')] if 'internship_listings' in inspector.get_table_names() else []
    
    if 'internship_listings' in inspector.get_table_names():
        if 'source' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('source', sa.String(), server_default='curated', nullable=False))
            op.create_index('ix_internship_listings_source', 'internship_listings', ['source'])
        if 'source_id' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('source_id', sa.String(), nullable=True))
            op.create_index('ix_internship_listings_source_id', 'internship_listings', ['source_id'])
        if 'source_url' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('source_url', sa.String(), nullable=True))
        if 'stipend_min' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('stipend_min', sa.Numeric(12, 2), nullable=True))
        if 'stipend_max' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('stipend_max', sa.Numeric(12, 2), nullable=True))
        if 'currency' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('currency', sa.String(), server_default='INR', nullable=True))
        if 'min_cgpa' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('min_cgpa', sa.Float(), server_default='0.0', nullable=True))
        if 'openings' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('openings', sa.Integer(), server_default='1', nullable=True))
        if 'batch_eligible' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('batch_eligible', sa.String(), nullable=True))
        if 'education_requirements' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('education_requirements', sa.String(), nullable=True))
        if 'branch_requirements' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('branch_requirements', sa.String(), nullable=True))
        if 'application_deadline' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('application_deadline', sa.DateTime(timezone=True), nullable=True))
            op.create_index('ix_internship_listings_application_deadline', 'internship_listings', ['application_deadline'])
        if 'verified' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('verified', sa.Boolean(), server_default='true', nullable=True))
        if 'content_hash' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('content_hash', sa.String(), nullable=True))
            op.create_index('ix_internship_listings_content_hash', 'internship_listings', ['content_hash'])
        if 'first_seen_at' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('first_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
        if 'last_seen_at' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
        if 'last_verified_at' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('last_verified_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
        if 'updated_at' not in existing_intern_cols:
            op.add_column('internship_listings', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    
    # 3. Add esco_skill_id to internship_required_skills if not present
    if 'internship_required_skills' in inspector.get_table_names():
        existing_req_cols = [c['name'] for c in inspector.get_columns('internship_required_skills')]
        if 'esco_skill_id' not in existing_req_cols:
            op.add_column('internship_required_skills', sa.Column('esco_skill_id', sa.Integer(), sa.ForeignKey('esco_skills.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_internship_required_skills_esco_skill_id', 'internship_required_skills', ['esco_skill_id'])

    # 4. Create saved_internships table
    if 'saved_internships' not in inspector.get_table_names():
        op.create_table(
            'saved_internships',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
            sa.Column('internship_id', sa.Integer(), sa.ForeignKey('internship_listings.id', ondelete='CASCADE'), nullable=False),
            sa.Column('saved_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('student_id', 'internship_id', name='uq_student_saved_internship')
        )
        op.create_index('ix_saved_internships_student_id', 'saved_internships', ['student_id'])
        op.create_index('ix_saved_internships_internship_id', 'saved_internships', ['internship_id'])

    # 5. Create scholarships table
    if 'scholarships' not in inspector.get_table_names():
        op.create_table(
            'scholarships',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('source', sa.String(), server_default='verified_portal', nullable=False),
            sa.Column('source_id', sa.String(), nullable=False),
            sa.Column('source_url', sa.String(), nullable=True),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('provider', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('academic_year', sa.String(), server_default='2026-27', nullable=False),
            sa.Column('scholarship_type', sa.String(), server_default='Merit & Need-based', nullable=False),
            sa.Column('award_amount', sa.Numeric(12, 2), nullable=True),
            sa.Column('award_frequency', sa.String(), server_default='per year', nullable=False),
            sa.Column('award_description', sa.String(), nullable=True),
            sa.Column('application_open', sa.DateTime(timezone=True), nullable=True),
            sa.Column('application_deadline', sa.DateTime(timezone=True), nullable=True),
            sa.Column('application_url', sa.String(), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('verified', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('content_hash', sa.String(), nullable=True),
            sa.Column('first_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('last_verified_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('source', 'source_id', name='uq_scholarship_source_id')
        )
        op.create_index('ix_scholarships_source', 'scholarships', ['source'])
        op.create_index('ix_scholarships_source_id', 'scholarships', ['source_id'])
        op.create_index('ix_scholarships_name', 'scholarships', ['name'])
        op.create_index('ix_scholarships_provider', 'scholarships', ['provider'])
        op.create_index('ix_scholarships_academic_year', 'scholarships', ['academic_year'])
        op.create_index('ix_scholarships_application_deadline', 'scholarships', ['application_deadline'])
        op.create_index('ix_scholarships_is_active', 'scholarships', ['is_active'])
        op.create_index('ix_scholarships_content_hash', 'scholarships', ['content_hash'])

    # 6. Create scholarship_eligibility_rules table
    if 'scholarship_eligibility_rules' not in inspector.get_table_names():
        op.create_table(
            'scholarship_eligibility_rules',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('scholarship_id', sa.Integer(), sa.ForeignKey('scholarships.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('min_cgpa', sa.Float(), nullable=True),
            sa.Column('min_percentage_12th', sa.Float(), nullable=True),
            sa.Column('max_annual_family_income', sa.Numeric(12, 2), nullable=True),
            sa.Column('eligible_states', sa.Text(), nullable=True),
            sa.Column('eligible_categories', sa.Text(), nullable=True),
            sa.Column('eligible_genders', sa.Text(), nullable=True),
            sa.Column('eligible_degrees', sa.Text(), nullable=True),
            sa.Column('eligible_branches', sa.Text(), nullable=True),
            sa.Column('eligible_years', sa.Text(), nullable=True),
            sa.Column('requires_pwd', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('requires_minority', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('other_conditions', sa.Text(), nullable=True)
        )
        op.create_index('ix_scholarship_eligibility_rules_scholarship_id', 'scholarship_eligibility_rules', ['scholarship_id'])

    # 7. Create saved_scholarships table
    if 'saved_scholarships' not in inspector.get_table_names():
        op.create_table(
            'saved_scholarships',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
            sa.Column('scholarship_id', sa.Integer(), sa.ForeignKey('scholarships.id', ondelete='CASCADE'), nullable=False),
            sa.Column('saved_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('student_id', 'scholarship_id', name='uq_student_saved_scholarship')
        )
        op.create_index('ix_saved_scholarships_student_id', 'saved_scholarships', ['student_id'])
        op.create_index('ix_saved_scholarships_scholarship_id', 'saved_scholarships', ['scholarship_id'])

    # 8. Create scholarship_applications table
    if 'scholarship_applications' not in inspector.get_table_names():
        op.create_table(
            'scholarship_applications',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
            sa.Column('scholarship_id', sa.Integer(), sa.ForeignKey('scholarships.id', ondelete='CASCADE'), nullable=False),
            sa.Column('status', sa.String(), server_default='APPLIED', nullable=False),
            sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.UniqueConstraint('student_id', 'scholarship_id', name='uq_student_scholarship_app')
        )
        op.create_index('ix_scholarship_applications_student_id', 'scholarship_applications', ['student_id'])
        op.create_index('ix_scholarship_applications_scholarship_id', 'scholarship_applications', ['scholarship_id'])
        op.create_index('ix_scholarship_applications_status', 'scholarship_applications', ['status'])

    # 9. Create ingestion_run_logs table
    if 'ingestion_run_logs' not in inspector.get_table_names():
        op.create_table(
            'ingestion_run_logs',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('source_type', sa.String(), nullable=False),
            sa.Column('source_name', sa.String(), nullable=False),
            sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('records_found', sa.Integer(), server_default='0', nullable=False),
            sa.Column('records_created', sa.Integer(), server_default='0', nullable=False),
            sa.Column('records_updated', sa.Integer(), server_default='0', nullable=False),
            sa.Column('records_deactivated', sa.Integer(), server_default='0', nullable=False),
            sa.Column('errors_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('status', sa.String(), server_default='RUNNING', nullable=False),
            sa.Column('error_log', sa.Text(), nullable=True)
        )
        op.create_index('ix_ingestion_run_logs_source_type', 'ingestion_run_logs', ['source_type'])
        op.create_index('ix_ingestion_run_logs_source_name', 'ingestion_run_logs', ['source_name'])
        op.create_index('ix_ingestion_run_logs_status', 'ingestion_run_logs', ['status'])


def downgrade() -> None:
    op.drop_table('ingestion_run_logs')
    op.drop_table('scholarship_applications')
    op.drop_table('saved_scholarships')
    op.drop_table('scholarship_eligibility_rules')
    op.drop_table('scholarships')
    op.drop_table('saved_internships')
