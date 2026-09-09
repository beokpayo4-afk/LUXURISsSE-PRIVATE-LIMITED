"""Create simplified tickets table."""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("from_location", sa.String(length=200), nullable=False),
        sa.Column("to_location", sa.String(length=200), nullable=False),
        sa.Column("pickup", sa.String(length=200), nullable=True),
        sa.Column("drop", sa.String(length=200), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time", sa.Time(), nullable=False),
        sa.Column("price", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Active"),
    )
    op.create_index("ix_tickets_name", "tickets", ["name"])
    op.create_index("ix_tickets_type", "tickets", ["type"])
    op.create_index("ix_tickets_from_location", "tickets", ["from_location"])
    op.create_index("ix_tickets_to_location", "tickets", ["to_location"])
    op.create_index("ix_tickets_date", "tickets", ["date"])
    op.create_index("ix_tickets_status", "tickets", ["status"])


def downgrade() -> None:
    op.drop_index("ix_tickets_status", table_name="tickets")
    op.drop_index("ix_tickets_date", table_name="tickets")
    op.drop_index("ix_tickets_to_location", table_name="tickets")
    op.drop_index("ix_tickets_from_location", table_name="tickets")
    op.drop_index("ix_tickets_type", table_name="tickets")
    op.drop_index("ix_tickets_name", table_name="tickets")
    op.drop_table("tickets")
