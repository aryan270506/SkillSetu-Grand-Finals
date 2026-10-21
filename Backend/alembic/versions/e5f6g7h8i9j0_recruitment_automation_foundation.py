"""recruitment_automation_foundation

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-10-19 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Helper for JSONB / JSON type
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    # 1. Create recruitment_pipeline_versions
    if 'recruitment_pipeline_versions' not in existing_tables:
        op.create_table(
            'recruitment_pipeline_versions',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('internship_id', sa.Integer(), sa.ForeignKey('internship_postings.id', ondelete='CASCADE'), nullable=False),
            sa.Column('version_number', sa.Integer(), nullable=False, default=1),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='DRAFT'),
            sa.Column('content_hash', sa.String(length=64), nullable=False),
            sa.Column('pipeline_config', json_type, nullable=False),
            sa.Column('evaluation_rubrics', json_type, nullable=False),
            sa.Column('eligibility_rules', json_type, nullable=False),
            sa.Column('scoring_weights', json_type, nullable=False),
            sa.Column('automation_policy', json_type, nullable=False),
            sa.Column('published_by_id', sa.Integer(), sa.ForeignKey('recruiters.id', ondelete='SET NULL'), nullable=True),
            sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.UniqueConstraint('internship_id', 'version_number', name='uq_internship_pipeline_version'),
        )
        op.create_index('ix_recruitment_pipeline_versions_internship_id', 'recruitment_pipeline_versions', ['internship_id'])
        op.create_index('ix_recruitment_pipeline_versions_status', 'recruitment_pipeline_versions', ['status'])

    # 2. Create recruitment_job_queue
    if 'recruitment_job_queue' not in existing_tables:
        op.create_table(
            'recruitment_job_queue',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('job_type', sa.String(length=64), nullable=False),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='QUEUED'),
            sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('idempotency_key', sa.String(length=128), unique=True, nullable=True),
            sa.Column('payload', json_type, nullable=False),
            sa.Column('result', json_type, nullable=True),
            sa.Column('error_log', sa.Text(), nullable=True),
            sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('max_retries', sa.Integer(), nullable=False, server_default='5'),
            sa.Column('next_run_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('locked_by', sa.String(length=64), nullable=True),
            sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_recruitment_job_queue_type', 'recruitment_job_queue', ['job_type'])
        op.create_index('ix_recruitment_job_queue_claim', 'recruitment_job_queue', ['status', 'next_run_at', 'priority'])
        op.create_index('ix_recruitment_job_queue_idempotency', 'recruitment_job_queue', ['idempotency_key'])

    # 3. Create recruiter_decision_overrides
    if 'recruiter_decision_overrides' not in existing_tables:
        op.create_table(
            'recruiter_decision_overrides',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('application_id', sa.Integer(), sa.ForeignKey('internship_applications.id', ondelete='CASCADE'), nullable=False),
            sa.Column('recruiter_id', sa.Integer(), sa.ForeignKey('recruiters.id', ondelete='SET NULL'), nullable=True),
            sa.Column('override_type', sa.String(length=64), nullable=False),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='ACTIVE'),
            sa.Column('previous_state', json_type, nullable=False),
            sa.Column('new_state', json_type, nullable=False),
            sa.Column('reason_code', sa.String(length=64), nullable=False),
            sa.Column('justification', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('revoked_by_id', sa.Integer(), sa.ForeignKey('recruiters.id', ondelete='SET NULL'), nullable=True),
        )
        op.create_index('ix_recruiter_decision_overrides_application_id', 'recruiter_decision_overrides', ['application_id'])
        op.create_index('ix_recruiter_decision_overrides_status', 'recruiter_decision_overrides', ['status'])

    # 4. Create assessment_callback_events
    if 'assessment_callback_events' not in existing_tables:
        op.create_table(
            'assessment_callback_events',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('idempotency_key', sa.String(length=128), unique=True, nullable=False),
            sa.Column('session_id', sa.String(length=128), sa.ForeignKey('candidate_assessment_sessions.id', ondelete='CASCADE'), nullable=False),
            sa.Column('event_type', sa.String(length=64), nullable=False, server_default='ROUND_COMPLETED'),
            sa.Column('source_service', sa.String(length=64), nullable=False, server_default='Archive2'),
            sa.Column('payload_hash', sa.String(length=64), nullable=False),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='PROCESSED'),
            sa.Column('response_payload', json_type, nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('processed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_assessment_callback_events_idempotency', 'assessment_callback_events', ['idempotency_key'])
        op.create_index('ix_assessment_callback_events_session', 'assessment_callback_events', ['session_id'])

    # 5. Create ai_invocation_telemetry
    if 'ai_invocation_telemetry' not in existing_tables:
        op.create_table(
            'ai_invocation_telemetry',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('feature', sa.String(length=64), nullable=False),
            sa.Column('model', sa.String(length=64), nullable=False),
            sa.Column('latency_ms', sa.Integer(), nullable=False),
            sa.Column('prompt_tokens', sa.Integer(), nullable=True),
            sa.Column('completion_tokens', sa.Integer(), nullable=True),
            sa.Column('total_tokens', sa.Integer(), nullable=True),
            sa.Column('estimated_cost_usd', sa.Numeric(10, 6), nullable=True),
            sa.Column('status', sa.String(length=32), nullable=False),
            sa.Column('error_detail', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_ai_invocation_telemetry_feature', 'ai_invocation_telemetry', ['feature'])
        op.create_index('ix_ai_invocation_telemetry_created_at', 'ai_invocation_telemetry', ['created_at'])

    # 6. Alter internship_postings
    posting_cols = [c['name'] for c in inspector.get_columns('internship_postings')]
    if 'active_pipeline_version_id' not in posting_cols:
        op.add_column('internship_postings', sa.Column('active_pipeline_version_id', sa.Integer(), sa.ForeignKey('recruitment_pipeline_versions.id', ondelete='SET NULL'), nullable=True))
    if 'draft_pipeline_version_id' not in posting_cols:
        op.add_column('internship_postings', sa.Column('draft_pipeline_version_id', sa.Integer(), sa.ForeignKey('recruitment_pipeline_versions.id', ondelete='SET NULL'), nullable=True))
    if 'automation_enabled' not in posting_cols:
        op.add_column('internship_postings', sa.Column('automation_enabled', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    if 'automation_paused' not in posting_cols:
        op.add_column('internship_postings', sa.Column('automation_paused', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    if 'automation_mode' not in posting_cols:
        op.add_column('internship_postings', sa.Column('automation_mode', sa.String(length=32), server_default='REVIEW_GATED', nullable=False))

    # 7. Alter internship_applications
    app_cols = [c['name'] for c in inspector.get_columns('internship_applications')]
    if 'pipeline_version_id' not in app_cols:
        op.add_column('internship_applications', sa.Column('pipeline_version_id', sa.Integer(), sa.ForeignKey('recruitment_pipeline_versions.id', ondelete='SET NULL'), nullable=True))
    if 'is_manually_overridden' not in app_cols:
        op.add_column('internship_applications', sa.Column('is_manually_overridden', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    if 'active_override_id' not in app_cols:
        op.add_column('internship_applications', sa.Column('active_override_id', sa.Integer(), sa.ForeignKey('recruiter_decision_overrides.id', ondelete='SET NULL'), nullable=True))
    if 'eligibility_status' not in app_cols:
        op.add_column('internship_applications', sa.Column('eligibility_status', sa.String(length=32), server_default='PENDING', nullable=False))
    if 'eligibility_breakdown' not in app_cols:
        op.add_column('internship_applications', sa.Column('eligibility_breakdown', json_type, nullable=True))

    # 8. Alter candidate_assessment_sessions
    sess_cols = [c['name'] for c in inspector.get_columns('candidate_assessment_sessions')]
    if 'pipeline_version_id' not in sess_cols:
        op.add_column('candidate_assessment_sessions', sa.Column('pipeline_version_id', sa.Integer(), sa.ForeignKey('recruitment_pipeline_versions.id', ondelete='SET NULL'), nullable=True))
    if 'execution_status' not in sess_cols:
        op.add_column('candidate_assessment_sessions', sa.Column('execution_status', sa.String(length=32), server_default='PENDING', nullable=False))
    if 'client_telemetry_digest' not in sess_cols:
        op.add_column('candidate_assessment_sessions', sa.Column('client_telemetry_digest', json_type, nullable=True))

    # 9. Alter application_status_audits
    audit_cols = [c['name'] for c in inspector.get_columns('application_status_audits')]
    if 'actor_type' not in audit_cols:
        op.add_column('application_status_audits', sa.Column('actor_type', sa.String(length=32), server_default='SYSTEM', nullable=False))
    if 'override_id' not in audit_cols:
        op.add_column('application_status_audits', sa.Column('override_id', sa.Integer(), sa.ForeignKey('recruiter_decision_overrides.id', ondelete='SET NULL'), nullable=True))
    if 'metadata_json' not in audit_cols:
        op.add_column('application_status_audits', sa.Column('metadata_json', json_type, nullable=True))


def downgrade() -> None:
    # Reverse alterations in reverse dependency order
    op.drop_column('application_status_audits', 'metadata_json')
    op.drop_column('application_status_audits', 'override_id')
    op.drop_column('application_status_audits', 'actor_type')

    op.drop_column('candidate_assessment_sessions', 'client_telemetry_digest')
    op.drop_column('candidate_assessment_sessions', 'execution_status')
    op.drop_column('candidate_assessment_sessions', 'pipeline_version_id')

    op.drop_column('internship_applications', 'eligibility_breakdown')
    op.drop_column('internship_applications', 'eligibility_status')
    op.drop_column('internship_applications', 'active_override_id')
    op.drop_column('internship_applications', 'is_manually_overridden')
    op.drop_column('internship_applications', 'pipeline_version_id')

    op.drop_column('internship_postings', 'automation_mode')
    op.drop_column('internship_postings', 'automation_paused')
    op.drop_column('internship_postings', 'automation_enabled')
    op.drop_column('internship_postings', 'draft_pipeline_version_id')
    op.drop_column('internship_postings', 'active_pipeline_version_id')

    op.drop_table('ai_invocation_telemetry')
    op.drop_table('assessment_callback_events')
    op.drop_table('recruiter_decision_overrides')
    op.drop_table('recruitment_job_queue')
    op.drop_table('recruitment_pipeline_versions')
