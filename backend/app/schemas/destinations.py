"""Pydantic schemas for destination management."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import PublishStatus


class DestinationImageIn(BaseModel):
    image_url: str = Field(min_length=1, max_length=500)
    alt_text: Optional[str] = Field(default=None, max_length=255)
    sort_order: int = 0
    is_cover: bool = False


class DestinationImageRead(DestinationImageIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class AttractionIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=500)
    location: Optional[str] = Field(default=None, max_length=255)
    entry_information: Optional[str] = None
    status: PublishStatus = PublishStatus.PUBLISHED
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Attraction name is required")
        return cleaned


class AttractionRead(AttractionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class LinkedTourSummary(BaseModel):
    id: int
    title: str
    code: str
    status: PublishStatus
    is_published: bool


class DestinationWrite(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: Optional[str] = Field(default=None, max_length=220)
    country: Optional[str] = Field(default=None, max_length=120)
    state: Optional[str] = Field(default=None, max_length=120)
    city_name: Optional[str] = Field(default=None, max_length=120)
    city_id: Optional[int] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    travel_information: Optional[str] = None
    is_featured: bool = False
    is_published: bool = False
    is_popular: bool = False
    status: PublishStatus = PublishStatus.DRAFT
    images: list[DestinationImageIn] = Field(default_factory=list)
    attractions: list[AttractionIn] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Destination name is required")
        return cleaned

    @model_validator(mode="after")
    def sync_publish_flags(self) -> DestinationWrite:
        if self.is_published and self.status == PublishStatus.DRAFT:
            self.status = PublishStatus.PUBLISHED
        if self.status == PublishStatus.PUBLISHED:
            self.is_published = True
        if self.status == PublishStatus.ARCHIVED:
            self.is_published = False
        if self.is_featured:
            self.is_popular = True
        if self.is_popular:
            self.is_featured = True
        return self


class DestinationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    country: Optional[str] = None
    state: Optional[str] = None
    city_name: Optional[str] = None
    summary: Optional[str] = None
    is_featured: bool
    is_published: bool
    is_popular: bool
    status: PublishStatus
    cover_image_url: Optional[str] = None
    attraction_count: int = 0
    tour_count: int = 0
    created_at: datetime
    updated_at: datetime


class DestinationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    country: Optional[str] = None
    state: Optional[str] = None
    city_name: Optional[str] = None
    city_id: Optional[int] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    travel_information: Optional[str] = None
    is_featured: bool
    is_published: bool
    is_popular: bool
    status: PublishStatus
    images: list[DestinationImageRead] = Field(default_factory=list)
    attractions: list[AttractionRead] = Field(default_factory=list)
    linked_tours: list[LinkedTourSummary] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class DestinationFeaturedUpdate(BaseModel):
    is_featured: bool


# Legacy aliases for older domain imports
DestinationCreate = DestinationWrite
DestinationRead = DestinationListItem
