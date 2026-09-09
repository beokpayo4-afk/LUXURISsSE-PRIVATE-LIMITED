"""Add gallery category, album, and featured flags."""

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("galleries", sa.Column("category", sa.String(length=80), nullable=True))
    op.add_column("galleries", sa.Column("album", sa.String(length=120), nullable=True))
    op.add_column(
        "galleries",
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_galleries_category", "galleries", ["category"])
    op.create_index("ix_galleries_album", "galleries", ["album"])
    op.create_index("ix_galleries_is_featured", "galleries", ["is_featured"])


def downgrade() -> None:
    op.drop_index("ix_galleries_is_featured", table_name="galleries")
    op.drop_index("ix_galleries_album", table_name="galleries")
    op.drop_index("ix_galleries_category", table_name="galleries")
    op.drop_column("galleries", "is_featured")
    op.drop_column("galleries", "album")
    op.drop_column("galleries", "category")
