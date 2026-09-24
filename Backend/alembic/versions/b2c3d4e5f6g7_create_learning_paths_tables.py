"""create_learning_paths_tables

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-23 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'learning_paths',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('target_careers', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='active', nullable=False),
        sa.Column('progress_percent', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_learning_paths_student_id', 'learning_paths', ['student_id'], unique=False)
    op.create_index('ix_learning_paths_status', 'learning_paths', ['status'], unique=False)

    op.create_table(
        'learning_path_items',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('learning_path_id', sa.Integer(), sa.ForeignKey('learning_paths.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', sa.Integer(), sa.ForeignKey('esco_skills.id', ondelete='SET NULL'), nullable=True),
        sa.Column('skill_name', sa.String(length=255), nullable=False),
        sa.Column('stage', sa.String(length=50), server_default='Intermediate', nullable=False),
        sa.Column('sequence_order', sa.Integer(), server_default='1', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='not_started', nullable=False),
        sa.Column('progress_percent', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('learning_path_id', 'course_id', 'skill_name', name='uq_path_course_skill')
    )
    op.create_index('ix_learning_path_items_learning_path_id', 'learning_path_items', ['learning_path_id'], unique=False)
    op.create_index('ix_learning_path_items_course_id', 'learning_path_items', ['course_id'], unique=False)
    op.create_index('ix_learning_path_items_skill_id', 'learning_path_items', ['skill_id'], unique=False)
    op.create_index('ix_learning_path_items_skill_name', 'learning_path_items', ['skill_name'], unique=False)
    op.create_index('ix_learning_path_items_stage', 'learning_path_items', ['stage'], unique=False)
    op.create_index('ix_learning_path_items_sequence_order', 'learning_path_items', ['sequence_order'], unique=False)
    op.create_index('ix_learning_path_items_status', 'learning_path_items', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_learning_path_items_status', table_name='learning_path_items')
    op.drop_index('ix_learning_path_items_sequence_order', table_name='learning_path_items')
    op.drop_index('ix_learning_path_items_stage', table_name='learning_path_items')
    op.drop_index('ix_learning_path_items_skill_name', table_name='learning_path_items')
    op.drop_index('ix_learning_path_items_skill_id', table_name='learning_path_items')
    op.drop_index('ix_learning_path_items_course_id', table_name='learning_path_items')
    op.drop_index('ix_learning_path_items_learning_path_id', table_name='learning_path_items')
    op.drop_table('learning_path_items')

    op.drop_index('ix_learning_paths_status', table_name='learning_paths')
    op.drop_index('ix_learning_paths_student_id', table_name='learning_paths')
    op.drop_table('learning_paths')
