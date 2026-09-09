"""System settings and notifications.

GST identifiers (GSTIN etc.) are nullable and must only be filled with verified values.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import NotificationChannel


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(
            NotificationChannel,
            name="notification_channel",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=NotificationChannel.IN_APP,
        index=True,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class GstSetting(Base, TimestampMixin):
    __tablename__ = "gst_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    # Leave empty until a verified GSTIN is provided by the company.
    gstin: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    cgst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    sgst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    igst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CompanySetting(Base, TimestampMixin):
    __tablename__ = "company_settings"
    __table_args__ = (UniqueConstraint("key", name="uq_company_setting_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), index=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)


class WebsiteSetting(Base, TimestampMixin):
    __tablename__ = "website_settings"
    __table_args__ = (UniqueConstraint("key", name="uq_website_setting_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), index=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
