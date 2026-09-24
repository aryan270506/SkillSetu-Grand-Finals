"""create_student_skill_evidence_table

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-09-23 22:43:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'student_skill_evidence',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('esco_skill_id', sa.Integer(), sa.ForeignKey('esco_skills.id', ondelete='SET NULL'), nullable=True),
        sa.Column('skill_name', sa.String(length=255), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_id', sa.String(length=255), nullable=True),
        sa.Column('evidence_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('confidence_score', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('evidence_metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('student_id', 'skill_name', 'source_type', 'source_id', name='uq_student_skill_source')
    )
    op.create_index('ix_student_skill_evidence_student_id', 'student_skill_evidence', ['student_id'], unique=False)
    op.create_index('ix_student_skill_evidence_esco_skill_id', 'student_skill_evidence', ['esco_skill_id'], unique=False)
    op.create_index('ix_student_skill_evidence_skill_name', 'student_skill_evidence', ['skill_name'], unique=False)
    op.create_index('ix_student_skill_evidence_source_type', 'student_skill_evidence', ['source_type'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_student_skill_evidence_source_type', table_name='student_skill_evidence')
    op.drop_index('ix_student_skill_evidence_skill_name', table_name='student_skill_evidence')
    op.drop_index('ix_student_skill_evidence_esco_skill_id', table_name='student_skill_evidence')
    op.drop_index('ix_student_skill_evidence_student_id', table_name='student_skill_evidence')
    op.drop_table('student_skill_evidence')
