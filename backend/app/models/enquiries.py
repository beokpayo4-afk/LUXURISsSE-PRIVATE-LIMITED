"""Enquiries and quotations."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import EnquiryStatus, QuotationStatus

Money = Numeric(14, 2)


class Enquiry(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    preferred_destination: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    travel_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[EnquiryStatus] = mapped_column(
        Enum(EnquiryStatus, name="enquiry_status", values_callable=lambda x: [e.value for e in x]),
        default=EnquiryStatus.NEW,
        index=True,
    )

    quotations: Mapped[list[Quotation]] = relationship(back_populates="enquiry")


class Quotation(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True)
    enquiry_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("enquiries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    quotation_code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(250))
    amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    tax_amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    total_amount: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, name="quotation_status", values_callable=lambda x: [e.value for e in x]),
        default=QuotationStatus.DRAFT,
        index=True,
    )

    enquiry: Mapped[Optional[Enquiry]] = relationship(back_populates="quotations")
    items: Mapped[list[QuotationItem]] = relationship(
        back_populates="quotation",
        cascade="all, delete-orphan",
    )


class QuotationItem(Base, TimestampMixin):
    __tablename__ = "quotation_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id", ondelete="CASCADE"),
        index=True,
    )
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)
    line_total: Mapped[Optional[Decimal]] = mapped_column(Money, nullable=True)

    quotation: Mapped[Quotation] = relationship(back_populates="items")
