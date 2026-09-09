"""Tour package fields: code/SKU, pricing, featured, itinerary extras.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tours", sa.Column("code", sa.String(length=64), nullable=True))
    op.add_column("tours", sa.Column("highlights", sa.Text(), nullable=True))
    op.add_column("tours", sa.Column("hotel_information", sa.Text(), nullable=True))
    op.add_column("tours", sa.Column("meal_plan", sa.String(length=120), nullable=True))
    op.add_column("tours", sa.Column("transportation", sa.Text(), nullable=True))
    op.add_column("tours", sa.Column("activities", sa.Text(), nullable=True))
    op.add_column("tours", sa.Column("starting_price", sa.Numeric(14, 2), nullable=True))
    op.add_column("tours", sa.Column("mrp", sa.Numeric(14, 2), nullable=True))
    op.add_column("tours", sa.Column("discount", sa.Numeric(14, 2), nullable=True))
    op.add_column("tours", sa.Column("max_travellers", sa.Integer(), nullable=True))
    op.add_column(
        "tours",
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "tours",
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )

    # Backfill unique codes for any existing rows before enforcing NOT NULL / unique.
    op.execute(
        """
        UPDATE tours
        SET code = 'TOUR-' || id::text
        WHERE code IS NULL OR code = ''
        """
    )
    # Sync published flag from status where applicable.
    op.execute(
        """
        UPDATE tours
        SET is_published = TRUE
        WHERE status = 'published'
        """
    )

    op.alter_column("tours", "code", nullable=False)
    op.create_index("ix_tours_code", "tours", ["code"], unique=True)
    op.create_index("ix_tours_is_featured", "tours", ["is_featured"])
    op.create_index("ix_tours_is_published", "tours", ["is_published"])

    # Tighten FKs for category/destination to required when data allows.
    # Keep nullable=False only if no null rows; otherwise leave nullable and app validates.
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM tours WHERE category_id IS NULL) THEN
            ALTER TABLE tours ALTER COLUMN category_id SET NOT NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM tours WHERE destination_id IS NULL) THEN
            ALTER TABLE tours ALTER COLUMN destination_id SET NOT NULL;
          END IF;
        END $$;
        """
    )

    op.add_column("tour_itineraries", sa.Column("meals", sa.String(length=255), nullable=True))
    op.add_column("tour_itineraries", sa.Column("hotel", sa.String(length=255), nullable=True))
    op.add_column("tour_itineraries", sa.Column("activities", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tour_itineraries", "activities")
    op.drop_column("tour_itineraries", "hotel")
    op.drop_column("tour_itineraries", "meals")

    op.drop_index("ix_tours_is_published", table_name="tours")
    op.drop_index("ix_tours_is_featured", table_name="tours")
    op.drop_index("ix_tours_code", table_name="tours")
    op.drop_column("tours", "is_published")
    op.drop_column("tours", "is_featured")
    op.drop_column("tours", "max_travellers")
    op.drop_column("tours", "discount")
    op.drop_column("tours", "mrp")
    op.drop_column("tours", "starting_price")
    op.drop_column("tours", "activities")
    op.drop_column("tours", "transportation")
    op.drop_column("tours", "meal_plan")
    op.drop_column("tours", "hotel_information")
    op.drop_column("tours", "highlights")
    op.drop_column("tours", "code")
