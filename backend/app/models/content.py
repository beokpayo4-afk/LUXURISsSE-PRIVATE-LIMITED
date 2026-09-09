"""Content: blogs, categories, CMS pages."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import PublishStatus


class BlogCategory(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "blog_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    blogs: Mapped[list[Blog]] = relationship(back_populates="category")


class Blog(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "blogs"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("blog_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    author_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(250), index=True)
    slug: Mapped[str] = mapped_column(String(270), unique=True, index=True)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="blog_publish_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=PublishStatus.DRAFT,
        index=True,
    )

    category: Mapped[Optional[BlogCategory]] = relationship(back_populates="blogs")


class Page(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("slug", name="uq_page_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    slug: Mapped[str] = mapped_column(String(270), index=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(
            PublishStatus,
            name="page_publish_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=PublishStatus.DRAFT,
        index=True,
    )


# Alias for foundation API.
BlogPost = Blog
