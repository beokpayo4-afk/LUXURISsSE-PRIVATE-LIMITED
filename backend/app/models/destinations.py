"""Geo hierarchy and destinations."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import PublishStatus


class Country(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    iso_code: Mapped[Optional[str]] = mapped_column(String(3), unique=True, nullable=True)
    phone_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    states: Mapped[list[State]] = relationship(back_populates="country")


class State(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "states"
    __table_args__ = (UniqueConstraint("country_id", "name", name="uq_state_country_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    country: Mapped[Country] = relationship(back_populates="states")
    cities: Mapped[list[City]] = relationship(back_populates="state")


class City(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("state_id", "name", name="uq_city_state_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    state_id: Mapped[int] = mapped_column(ForeignKey("states.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    state: Mapped[State] = relationship(back_populates="cities")
    destinations: Mapped[list[Destination]] = relationship(back_populates="city")


class Destination(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("cities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    country: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    city_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    best_time_to_visit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    travel_information: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    # Kept for backward compatibility with earlier list UIs / seeds.
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus, name="publish_status", values_callable=lambda x: [e.value for e in x]),
        default=PublishStatus.DRAFT,
        index=True,
    )

    city: Mapped[Optional[City]] = relationship(back_populates="destinations")
    attractions: Mapped[list[Attraction]] = relationship(
        back_populates="destination",
        cascade="all, delete-orphan",
        order_by="Attraction.sort_order",
    )
    images: Mapped[list[DestinationImage]] = relationship(
        back_populates="destination",
        cascade="all, delete-orphan",
        order_by="DestinationImage.sort_order",
    )


class Attraction(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "attractions"

    id: Mapped[int] = mapped_column(primary_key=True)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    entry_information: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="attraction_publish_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=PublishStatus.PUBLISHED,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    destination: Mapped[Destination] = relationship(back_populates="attractions")


class DestinationImage(Base, TimestampMixin):
    __tablename__ = "destination_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"),
        index=True,
    )
    image_url: Mapped[str] = mapped_column(String(500))
    alt_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)

    destination: Mapped[Destination] = relationship(back_populates="images")
