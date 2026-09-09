"""Vehicles and transport services."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin

Money = Numeric(14, 2)


class Vehicle(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    vehicle_type: Mapped[str] = mapped_column(String(100), index=True)
    registration_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    services: Mapped[list[TransportService]] = relationship(back_populates="vehicle")


class TransportService(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "transport_services"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), index=True)
    service_type: Mapped[str] = mapped_column(String(100), default="transfer")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Nullable until rates are confirmed.
    price_per_day: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    price_per_trip: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    vehicle: Mapped[Optional[Vehicle]] = relationship(back_populates="services")


# Alias for foundation API that previously used Transport.
Transport = TransportService
