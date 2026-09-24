"""add_course_embedding_columns

Revision ID: a1b2c3d4e5f6
Revises: cfd14bc78017
Create Date: 2026-09-23 19:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'cfd14bc78017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('courses', sa.Column('embedding_content_hash', sa.String(length=64), nullable=True))
    op.add_column('courses', sa.Column('embedding_model', sa.String(length=100), nullable=True))
    op.add_column('courses', sa.Column('embedding_indexed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('courses', sa.Column('embedding_status', sa.String(length=50), server_default='pending', nullable=True))
    
    op.create_index('ix_courses_embedding_content_hash', 'courses', ['embedding_content_hash'], unique=False)
    op.create_index('ix_courses_embedding_status', 'courses', ['embedding_status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_courses_embedding_status', table_name='courses')
    op.drop_index('ix_courses_embedding_content_hash', table_name='courses')
    
    op.drop_column('courses', 'embedding_status')
    op.drop_column('courses', 'embedding_indexed_at')
    op.drop_column('courses', 'embedding_model')
    op.drop_column('courses', 'embedding_content_hash')
