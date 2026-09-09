"""Hotels and rooms."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin

Money = Numeric(14, 2)


class Hotel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "hotels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    star_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    amenities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    rooms: Mapped[list[HotelRoom]] = relationship(
        back_populates="hotel",
        cascade="all, delete-orphan",
    )


class HotelRoom(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "hotel_rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    hotel_id: Mapped[int] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    room_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    max_occupancy: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Nullable until real rates are confirmed.
    price_per_night: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    amenities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    hotel: Mapped[Hotel] = relationship(back_populates="rooms")
