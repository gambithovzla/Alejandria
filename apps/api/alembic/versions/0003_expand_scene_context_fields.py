"""expand scene context fields

Revision ID: 0003_expand_scene_context_fields
Revises: 0002_project_work_types
Create Date: 2026-04-22 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_expand_scene_context_fields"
down_revision = "0002_project_work_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("scenes", "pov_character", existing_type=sa.String(length=120), type_=sa.Text(), existing_nullable=True)
    op.alter_column("scenes", "location", existing_type=sa.String(length=120), type_=sa.Text(), existing_nullable=True)


def downgrade() -> None:
    op.alter_column("scenes", "location", existing_type=sa.Text(), type_=sa.String(length=120), existing_nullable=True)
    op.alter_column("scenes", "pov_character", existing_type=sa.Text(), type_=sa.String(length=120), existing_nullable=True)
