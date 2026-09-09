"""Bookings, travellers, and line items."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import BookingItemType, BookingStatus, Gender

Money = Numeric(14, 2)


class Booking(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tour_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tours.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    booking_code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    travel_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    travelers: Mapped[int] = mapped_column(Integer, default=1)
    subtotal_amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    discount_amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    tax_amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    total_amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status", values_callable=lambda x: [e.value for e in x]),
        default=BookingStatus.PENDING,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    travellers: Mapped[list[BookingTraveller]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    items: Mapped[list[BookingItem]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )


class BookingTraveller(Base, TimestampMixin):
    __tablename__ = "booking_travellers"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(200))
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Gender] = mapped_column(
        Enum(Gender, name="gender", values_callable=lambda x: [e.value for e in x]),
        default=Gender.UNSPECIFIED,
    )
    passport_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_proof_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_proof_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    booking: Mapped[Booking] = relationship(back_populates="travellers")


class BookingItem(Base, TimestampMixin):
    __tablename__ = "booking_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    item_type: Mapped[BookingItemType] = mapped_column(
        Enum(BookingItemType, name="booking_item_type", values_callable=lambda x: [e.value for e in x]),
        default=BookingItemType.TOUR,
        index=True,
    )
    reference_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    line_total: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)

    booking: Mapped[Booking] = relationship(back_populates="items")
