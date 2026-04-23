"""scene draft versions

Revision ID: 0004_scene_draft_versions
Revises: 0003_expand_scene_context_fields
Create Date: 2026-04-22 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_scene_draft_versions"
down_revision = "0003_expand_scene_context_fields"
branch_labels = None
depends_on = None


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "scene_draft_versions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scene_id", sa.String(length=36), sa.ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=60), nullable=False),
        sa.Column("source_label", sa.String(length=255), nullable=False),
        sa.Column("draft_markdown", sa.Text(), nullable=False),
        sa.Column("change_summary", sa.JSON(), nullable=False),
        sa.Column("editorial_rationale", sa.Text(), nullable=True),
        sa.Column("based_on_version_id", sa.String(length=36), sa.ForeignKey("scene_draft_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
    )
    op.create_index("ix_scene_draft_versions_scene_version", "scene_draft_versions", ["scene_id", "version_no"], unique=True)
    op.create_index("ix_scene_draft_versions_scene_active", "scene_draft_versions", ["scene_id", "is_active"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_scene_draft_versions_scene_active", table_name="scene_draft_versions")
    op.drop_index("ix_scene_draft_versions_scene_version", table_name="scene_draft_versions")
    op.drop_table("scene_draft_versions")
