"""add_recruiter_status_and_admin_table

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-09-25 15:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create admin_users table
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='admin', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_admin_users_id', 'admin_users', ['id'], unique=False)
    op.create_index('ix_admin_users_email', 'admin_users', ['email'], unique=True)

    # 2. Add approval status and metadata columns to recruiters table
    op.add_column('recruiters', sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=False))
    op.add_column('recruiters', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('recruiters', sa.Column('approved_by', sa.Integer(), sa.ForeignKey('admin_users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('recruiters', sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('recruiters', sa.Column('rejected_by', sa.Integer(), sa.ForeignKey('admin_users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('recruiters', sa.Column('rejection_reason', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('recruiters', 'rejection_reason')
    op.drop_column('recruiters', 'rejected_by')
    op.drop_column('recruiters', 'rejected_at')
    op.drop_column('recruiters', 'approved_by')
    op.drop_column('recruiters', 'approved_at')
    op.drop_column('recruiters', 'status')
    
    op.drop_index('ix_admin_users_email', table_name='admin_users')
    op.drop_index('ix_admin_users_id', table_name='admin_users')
    op.drop_table('admin_users')
