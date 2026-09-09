"""Simple transport tickets."""

from __future__ import annotations

from datetime import date, time
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

Money = Numeric(14, 2)

TICKET_TYPES = ("Local Bus", "Tempo", "E-Rickshaw", "Other")
TICKET_STATUSES = ("Active", "Inactive")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    type: Mapped[str] = mapped_column(String(50), index=True)
    state: Mapped[str] = mapped_column(String(120), index=True)
    from_location: Mapped[str] = mapped_column(String(200), index=True)
    to_location: Mapped[str] = mapped_column(String(200), index=True)
    pickup: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    drop: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[time] = mapped_column(Time)
    price: Mapped[Decimal] = mapped_column(Money)
    status: Mapped[str] = mapped_column(String(20), default="Active", index=True)
