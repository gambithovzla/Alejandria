"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-21 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("premise", sa.Text(), nullable=False),
        sa.Column("genre", sa.String(length=120), nullable=False),
        sa.Column("audience", sa.String(length=120), nullable=False),
        sa.Column("theme", sa.String(length=255), nullable=True),
        sa.Column("narrative_pov", sa.String(length=120), nullable=True),
        sa.Column("tense", sa.String(length=60), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("target_length_words", sa.Integer(), nullable=True),
        sa.Column("style_dna", sa.JSON(), nullable=False),
        sa.Column("editorial_judgment", sa.JSON(), nullable=False),
        sa.Column("anti_patterns", sa.JSON(), nullable=False),
        *timestamp_columns(),
    )

    op.create_table(
        "scenes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("chapter_label", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("brief", sa.Text(), nullable=False),
        sa.Column("pov_character", sa.String(length=120), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("planning_payload", sa.JSON(), nullable=True),
        sa.Column("necessity_assessment", sa.JSON(), nullable=True),
        sa.Column("draft_markdown", sa.Text(), nullable=True),
        *timestamp_columns(),
    )
    op.create_index("ix_scenes_project_sequence", "scenes", ["project_id", "sequence_no"], unique=True)

    op.create_table(
        "project_memories",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_scene_id", sa.String(length=36), sa.ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        *timestamp_columns(),
    )
    op.create_index("ix_project_memories_project_kind", "project_memories", ["project_id", "kind"], unique=False)

    op.create_table(
        "audits",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("scene_id", sa.String(length=36), sa.ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("audit_type", sa.String(length=40), nullable=False),
        sa.Column("decision", sa.String(length=40), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("findings", sa.JSON(), nullable=False),
        sa.Column("next_steps", sa.JSON(), nullable=False),
        sa.Column("human_review_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        *timestamp_columns(),
    )
    op.create_index("ix_audits_scene_type", "audits", ["scene_id", "audit_type"], unique=False)

    op.create_table(
        "pipeline_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scene_id", sa.String(length=36), sa.ForeignKey("scenes.id", ondelete="CASCADE"), nullable=True),
        sa.Column("pipeline_type", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("input_payload", sa.JSON(), nullable=False),
        sa.Column("output_payload", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        *timestamp_columns(),
    )
    op.create_index("ix_pipeline_runs_project_scene", "pipeline_runs", ["project_id", "scene_id"], unique=False)

    op.create_table(
        "approvals",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("target_type", sa.String(length=40), nullable=False),
        sa.Column("target_id", sa.String(length=36), nullable=False),
        sa.Column("decision", sa.String(length=40), nullable=False),
        sa.Column("reviewer", sa.String(length=120), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        *timestamp_columns(),
    )
    op.create_index("ix_approvals_target", "approvals", ["target_type", "target_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_approvals_target", table_name="approvals")
    op.drop_table("approvals")
    op.drop_index("ix_pipeline_runs_project_scene", table_name="pipeline_runs")
    op.drop_table("pipeline_runs")
    op.drop_index("ix_audits_scene_type", table_name="audits")
    op.drop_table("audits")
    op.drop_index("ix_project_memories_project_kind", table_name="project_memories")
    op.drop_table("project_memories")
    op.drop_index("ix_scenes_project_sequence", table_name="scenes")
    op.drop_table("scenes")
    op.drop_table("projects")
