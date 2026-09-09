"""Destination management fields, attractions extras, featured/published flags.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("destinations", sa.Column("country", sa.String(length=120), nullable=True))
    op.add_column("destinations", sa.Column("state", sa.String(length=120), nullable=True))
    op.add_column("destinations", sa.Column("city_name", sa.String(length=120), nullable=True))
    op.add_column("destinations", sa.Column("best_time_to_visit", sa.Text(), nullable=True))
    op.add_column("destinations", sa.Column("travel_information", sa.Text(), nullable=True))
    op.add_column(
        "destinations",
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "destinations",
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index("ix_destinations_country", "destinations", ["country"])
    op.create_index("ix_destinations_state", "destinations", ["state"])
    op.create_index("ix_destinations_city_name", "destinations", ["city_name"])
    op.create_index("ix_destinations_is_featured", "destinations", ["is_featured"])
    op.create_index("ix_destinations_is_published", "destinations", ["is_published"])

    op.execute(
        """
        UPDATE destinations
        SET is_published = TRUE, is_featured = COALESCE(is_popular, FALSE)
        WHERE status = 'published'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET is_featured = TRUE
        WHERE is_popular = TRUE
        """
    )

    attraction_status = sa.Enum(
        "draft",
        "published",
        "archived",
        name="attraction_publish_status",
    )
    attraction_status.create(op.get_bind(), checkfirst=True)

    op.add_column("attractions", sa.Column("image_url", sa.String(length=500), nullable=True))
    op.add_column("attractions", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column("attractions", sa.Column("entry_information", sa.Text(), nullable=True))
    op.add_column(
        "attractions",
        sa.Column(
            "status",
            attraction_status,
            server_default="published",
            nullable=False,
        ),
    )
    op.create_index("ix_attractions_status", "attractions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_attractions_status", table_name="attractions")
    op.drop_column("attractions", "status")
    op.drop_column("attractions", "entry_information")
    op.drop_column("attractions", "location")
    op.drop_column("attractions", "image_url")
    sa.Enum(name="attraction_publish_status").drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_destinations_is_published", table_name="destinations")
    op.drop_index("ix_destinations_is_featured", table_name="destinations")
    op.drop_index("ix_destinations_city_name", table_name="destinations")
    op.drop_index("ix_destinations_state", table_name="destinations")
    op.drop_index("ix_destinations_country", table_name="destinations")
    op.drop_column("destinations", "is_published")
    op.drop_column("destinations", "is_featured")
    op.drop_column("destinations", "travel_information")
    op.drop_column("destinations", "best_time_to_visit")
    op.drop_column("destinations", "city_name")
    op.drop_column("destinations", "state")
    op.drop_column("destinations", "country")
