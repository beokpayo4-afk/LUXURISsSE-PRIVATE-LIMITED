"""Add state column to tickets for local routes by state."""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tickets",
        sa.Column("state", sa.String(length=120), nullable=False, server_default="India"),
    )
    op.create_index("ix_tickets_state", "tickets", ["state"])
    op.execute(
        """
        UPDATE tickets
        SET state = CASE
            WHEN lower(name) LIKE '%delhi%' OR lower(from_location) LIKE '%delhi%' OR lower(to_location) LIKE '%delhi%'
                THEN 'Delhi'
            WHEN lower(name) LIKE '%raipur%' OR lower(from_location) LIKE '%raipur%' OR lower(to_location) LIKE '%chhattisgarh%'
                THEN 'Chhattisgarh'
            ELSE state
        END
        """
    )
    op.alter_column("tickets", "state", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_tickets_state", table_name="tickets")
    op.drop_column("tickets", "state")
