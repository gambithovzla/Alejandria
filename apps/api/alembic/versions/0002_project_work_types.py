"""add project work type and structure mode

Revision ID: 0002_project_work_types
Revises: 0001_initial_schema
Create Date: 2026-04-22 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_project_work_types"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("work_type", sa.String(length=60), nullable=True))
    op.add_column("projects", sa.Column("structure_mode", sa.String(length=60), nullable=True))

    op.execute("UPDATE projects SET work_type = 'novel' WHERE work_type IS NULL")
    op.execute("UPDATE projects SET structure_mode = 'scene' WHERE structure_mode IS NULL")

    op.alter_column("projects", "work_type", existing_type=sa.String(length=60), nullable=False)
    op.alter_column("projects", "structure_mode", existing_type=sa.String(length=60), nullable=False)


def downgrade() -> None:
    op.drop_column("projects", "structure_mode")
    op.drop_column("projects", "work_type")
