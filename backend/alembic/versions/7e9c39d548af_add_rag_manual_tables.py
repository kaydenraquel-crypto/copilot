"""add_rag_manual_tables

Revision ID: 7e9c39d548af
Revises: 5ca399203a67
Create Date: 2026-02-11 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "7e9c39d548af"
down_revision: Union[str, None] = "5ca399203a67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "manuals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("equipment_type", sa.String(length=100), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column(
            "indexing_status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("indexing_error", sa.Text(), nullable=True),
        sa.Column("indexed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_manuals_brand", "manuals", ["brand"], unique=False)
    op.create_index("ix_manuals_model", "manuals", ["model"], unique=False)
    op.create_index("ix_manuals_brand_model", "manuals", ["brand", "model"], unique=False)

    op.create_table(
        "manual_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("manual_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("section", sa.String(length=255), nullable=True),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["manual_id"], ["manuals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("ALTER TABLE manual_chunks ADD COLUMN embedding vector(1536)")
    op.create_index("ix_manual_chunks_manual_id", "manual_chunks", ["manual_id"], unique=False)
    op.create_index("ix_manual_chunks_page_number", "manual_chunks", ["page_number"], unique=False)
    op.execute(
        "CREATE INDEX ix_manual_chunks_embedding_ivfflat "
        "ON manual_chunks USING ivfflat (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_manual_chunks_embedding_ivfflat")
    op.drop_index("ix_manual_chunks_page_number", table_name="manual_chunks")
    op.drop_index("ix_manual_chunks_manual_id", table_name="manual_chunks")
    op.drop_table("manual_chunks")
    op.drop_index("ix_manuals_brand_model", table_name="manuals")
    op.drop_index("ix_manuals_model", table_name="manuals")
    op.drop_index("ix_manuals_brand", table_name="manuals")
    op.drop_table("manuals")
