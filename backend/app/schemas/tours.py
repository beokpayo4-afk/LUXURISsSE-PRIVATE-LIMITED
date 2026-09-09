"""Pydantic schemas for tour package management."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import PublishStatus


class TourImageIn(BaseModel):
    image_url: str = Field(min_length=1, max_length=500)
    alt_text: Optional[str] = Field(default=None, max_length=255)
    sort_order: int = 0
    is_cover: bool = False


class TourImageRead(TourImageIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TourItineraryIn(BaseModel):
    day_number: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    meals: Optional[str] = Field(default=None, max_length=255)
    hotel: Optional[str] = Field(default=None, max_length=255)
    activities: Optional[str] = None


class TourItineraryRead(TourItineraryIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TourInclusionIn(BaseModel):
    item: str = Field(min_length=1, max_length=500)
    sort_order: int = 0


class TourInclusionRead(TourInclusionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TourExclusionIn(BaseModel):
    item: str = Field(min_length=1, max_length=500)
    sort_order: int = 0


class TourExclusionRead(TourExclusionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TourPricingIn(BaseModel):
    label: str = Field(default="Standard", min_length=1, max_length=120)
    currency: str = Field(default="INR", min_length=1, max_length=10)
    adult_price: Optional[Decimal] = Field(default=None, ge=0)
    child_price: Optional[Decimal] = Field(default=None, ge=0)
    infant_price: Optional[Decimal] = Field(default=None, ge=0)
    is_active: bool = True


class TourPricingRead(TourPricingIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TourDepartureIn(BaseModel):
    departure_date: date
    seats_total: Optional[int] = Field(default=None, ge=0)
    seats_available: Optional[int] = Field(default=None, ge=0)
    is_active: bool = True

    @model_validator(mode="after")
    def seats_consistency(self) -> TourDepartureIn:
        if (
            self.seats_total is not None
            and self.seats_available is not None
            and self.seats_available > self.seats_total
        ):
            raise ValueError("seats_available cannot exceed seats_total")
        return self


class TourDepartureRead(TourDepartureIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TourWrite(BaseModel):
    title: str = Field(min_length=1, max_length=250)
    code: str = Field(min_length=1, max_length=64)
    slug: Optional[str] = Field(default=None, max_length=270)
    category_id: int
    destination_id: int
    duration_days: Optional[int] = Field(default=None, ge=1)
    duration_nights: Optional[int] = Field(default=None, ge=0)
    starting_price: Optional[Decimal] = Field(default=None, ge=0)
    mrp: Optional[Decimal] = Field(default=None, ge=0)
    discount: Optional[Decimal] = Field(default=None, ge=0)
    max_travellers: Optional[int] = Field(default=None, ge=1)
    summary: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[str] = None
    hotel_information: Optional[str] = None
    meal_plan: Optional[str] = Field(default=None, max_length=120)
    transportation: Optional[str] = None
    activities: Optional[str] = None
    is_featured: bool = False
    is_published: bool = False
    status: PublishStatus = PublishStatus.DRAFT

    images: list[TourImageIn] = Field(default_factory=list)
    itineraries: list[TourItineraryIn] = Field(default_factory=list)
    inclusions: list[TourInclusionIn] = Field(default_factory=list)
    exclusions: list[TourExclusionIn] = Field(default_factory=list)
    pricing: list[TourPricingIn] = Field(default_factory=list)
    departure_dates: list[TourDepartureIn] = Field(default_factory=list)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if not cleaned:
            raise ValueError("Tour code/SKU is required")
        return cleaned

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Tour name is required")
        return cleaned

    @model_validator(mode="after")
    def sync_publish_status(self) -> TourWrite:
        if self.is_published and self.status == PublishStatus.DRAFT:
            self.status = PublishStatus.PUBLISHED
        if self.status == PublishStatus.PUBLISHED:
            self.is_published = True
        if self.status == PublishStatus.ARCHIVED:
            self.is_published = False
        if self.mrp is not None and self.starting_price is not None and self.mrp < self.starting_price:
            raise ValueError("MRP cannot be less than starting price")
        days = {d.day_number for d in self.itineraries}
        if len(days) != len(self.itineraries):
            raise ValueError("Itinerary day numbers must be unique")
        dates = {d.departure_date for d in self.departure_dates}
        if len(dates) != len(self.departure_dates):
            raise ValueError("Departure dates must be unique")
        return self


class TourListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    code: str
    slug: str
    category_id: int
    destination_id: int
    category_name: Optional[str] = None
    destination_name: Optional[str] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    starting_price: Optional[Decimal] = None
    mrp: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    is_featured: bool
    is_published: bool
    status: PublishStatus
    cover_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TourDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    code: str
    slug: str
    category_id: int
    destination_id: int
    category_name: Optional[str] = None
    destination_name: Optional[str] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    starting_price: Optional[Decimal] = None
    mrp: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    max_travellers: Optional[int] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[str] = None
    hotel_information: Optional[str] = None
    meal_plan: Optional[str] = None
    transportation: Optional[str] = None
    activities: Optional[str] = None
    is_featured: bool
    is_published: bool
    status: PublishStatus
    images: list[TourImageRead] = Field(default_factory=list)
    itineraries: list[TourItineraryRead] = Field(default_factory=list)
    inclusions: list[TourInclusionRead] = Field(default_factory=list)
    exclusions: list[TourExclusionRead] = Field(default_factory=list)
    pricing: list[TourPricingRead] = Field(default_factory=list)
    departure_dates: list[TourDepartureRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class TourFeaturedUpdate(BaseModel):
    is_featured: bool


class TourPricingUpdate(BaseModel):
    """Quick price update from the tours list (no full package rewrite)."""

    starting_price: Optional[Decimal] = Field(default=None, ge=0)
    mrp: Optional[Decimal] = Field(default=None, ge=0)
    discount: Optional[Decimal] = Field(default=None, ge=0)
    adult_price: Optional[Decimal] = Field(default=None, ge=0)
    child_price: Optional[Decimal] = Field(default=None, ge=0)
    infant_price: Optional[Decimal] = Field(default=None, ge=0)
    currency: str = Field(default="INR", min_length=1, max_length=10)
    label: str = Field(default="Standard", min_length=1, max_length=120)

    @model_validator(mode="after")
    def check_mrp(self) -> TourPricingUpdate:
        if self.mrp is not None and self.starting_price is not None and self.mrp < self.starting_price:
            raise ValueError("MRP cannot be less than starting price")
        return self


# Legacy aliases used by older domain imports / public list fallbacks
TourPackageCreate = TourWrite
TourPackageRead = TourListItem
