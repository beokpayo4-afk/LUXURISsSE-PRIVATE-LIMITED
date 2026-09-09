"""Tours and related pricing / itinerary tables."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import PublishStatus

Money = Numeric(14, 2)


class TourCategory(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tour_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tours: Mapped[list[Tour]] = relationship(back_populates="category")


class Tour(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tours"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("tour_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(250), index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(270), unique=True, index=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlights: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hotel_information: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    meal_plan: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    transportation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_nights: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    starting_price: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    mrp: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    discount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    max_travellers: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="tour_publish_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=PublishStatus.DRAFT,
        index=True,
    )

    category: Mapped[TourCategory] = relationship(back_populates="tours")
    images: Mapped[list[TourImage]] = relationship(
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourImage.sort_order",
    )
    itineraries: Mapped[list[TourItinerary]] = relationship(
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourItinerary.day_number",
    )
    inclusions: Mapped[list[TourInclusion]] = relationship(
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourInclusion.sort_order",
    )
    exclusions: Mapped[list[TourExclusion]] = relationship(
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourExclusion.sort_order",
    )
    pricing: Mapped[list[TourPricing]] = relationship(
        back_populates="tour",
        cascade="all, delete-orphan",
    )
    departure_dates: Mapped[list[TourDepartureDate]] = relationship(
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourDepartureDate.departure_date",
    )


class TourImage(Base, TimestampMixin):
    __tablename__ = "tour_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(500))
    alt_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)

    tour: Mapped[Tour] = relationship(back_populates="images")


class TourItinerary(Base, TimestampMixin):
    __tablename__ = "tour_itineraries"
    __table_args__ = (UniqueConstraint("tour_id", "day_number", name="uq_tour_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    day_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    meals: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hotel: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    activities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    tour: Mapped[Tour] = relationship(back_populates="itineraries")


class TourInclusion(Base, TimestampMixin):
    __tablename__ = "tour_inclusions"

    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    item: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    tour: Mapped[Tour] = relationship(back_populates="inclusions")


class TourExclusion(Base, TimestampMixin):
    __tablename__ = "tour_exclusions"

    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    item: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    tour: Mapped[Tour] = relationship(back_populates="exclusions")


class TourPricing(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tour_pricing"

    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(120), default="Standard")
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    # Nullable until business confirms real package prices.
    adult_price: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    child_price: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    infant_price: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tour: Mapped[Tour] = relationship(back_populates="pricing")


class TourDepartureDate(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tour_departure_dates"
    __table_args__ = (UniqueConstraint("tour_id", "departure_date", name="uq_tour_departure"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    departure_date: Mapped[date] = mapped_column(Date, index=True)
    seats_total: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    seats_available: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tour: Mapped[Tour] = relationship(back_populates="departure_dates")


# Backward-compatible alias used by older foundation imports.
TourPackage = Tour
