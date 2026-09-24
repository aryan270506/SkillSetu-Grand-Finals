"""create_course_aggregation_tables

Revision ID: cfd14bc78017
Revises: 
Create Date: 2026-09-23 18:40:18.976419

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cfd14bc78017'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create providers table
    op.create_table(
        'providers',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('base_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('slug', name='uq_providers_slug'),
    )
    op.create_index('ix_providers_id', 'providers', ['id'])
    op.create_index('ix_providers_slug', 'providers', ['slug'], unique=True)

    # 2. Create courses table
    op.create_table(
        'courses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('provider_id', sa.Integer(), sa.ForeignKey('providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('external_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('instructor', sa.String(), nullable=True),
        sa.Column('institution', sa.String(), nullable=True),
        sa.Column('language', sa.String(), nullable=True),
        sa.Column('level', sa.String(), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('duration_unit', sa.String(), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('certificate_available', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=True),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('content_hash', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('provider_id', 'external_id', name='uq_provider_external_id'),
    )
    op.create_index('ix_courses_id', 'courses', ['id'])
    op.create_index('ix_courses_provider_id', 'courses', ['provider_id'])
    op.create_index('ix_courses_external_id', 'courses', ['external_id'])
    op.create_index('ix_courses_title', 'courses', ['title'])
    op.create_index('ix_courses_is_active', 'courses', ['is_active'])
    op.create_index('ix_courses_last_synced_at', 'courses', ['last_synced_at'])

    # 3. Create course_skills table
    op.create_table(
        'course_skills',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('esco_skill_id', sa.Integer(), sa.ForeignKey('esco_skills.id', ondelete='SET NULL'), nullable=True),
        sa.Column('skill_name', sa.String(), nullable=False),
        sa.Column('confidence', sa.Float(), server_default=sa.text('1.0'), nullable=False),
        sa.Column('source', sa.String(), server_default=sa.text("'provider'"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('course_id', 'esco_skill_id', name='uq_course_esco_skill'),
    )
    op.create_index('ix_course_skills_id', 'course_skills', ['id'])
    op.create_index('ix_course_skills_course_id', 'course_skills', ['course_id'])
    op.create_index('ix_course_skills_esco_skill_id', 'course_skills', ['esco_skill_id'])
    op.create_index('ix_course_skills_skill_name', 'course_skills', ['skill_name'])

    # 4. Create course_careers table
    op.create_table(
        'course_careers',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('career_id', sa.String(), sa.ForeignKey('skillsetu_careers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('relevance_score', sa.Float(), server_default=sa.text('1.0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('course_id', 'career_id', name='uq_course_career'),
    )
    op.create_index('ix_course_careers_id', 'course_careers', ['id'])
    op.create_index('ix_course_careers_course_id', 'course_careers', ['course_id'])
    op.create_index('ix_course_careers_career_id', 'course_careers', ['career_id'])

    # 5. Create course_sync_logs table
    op.create_table(
        'course_sync_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('provider_id', sa.Integer(), sa.ForeignKey('providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('courses_found', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('courses_created', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('courses_updated', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('courses_deactivated', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('courses_failed', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('status', sa.String(), server_default=sa.text("'running'"), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_course_sync_logs_id', 'course_sync_logs', ['id'])
    op.create_index('ix_course_sync_logs_provider_id', 'course_sync_logs', ['provider_id'])
    op.create_index('ix_course_sync_logs_started_at', 'course_sync_logs', ['started_at'])
    op.create_index('ix_course_sync_logs_status', 'course_sync_logs', ['status'])


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table('course_sync_logs')
    op.drop_table('course_careers')
    op.drop_table('course_skills')
    op.drop_table('courses')
    op.drop_table('providers')
