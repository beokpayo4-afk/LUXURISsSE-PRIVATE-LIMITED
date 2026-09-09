"""Pydantic schemas for core travel domains (foundation API)."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import (
    BookingStatus,
    EnquiryStatus,
    PaymentStatus,
    PublishStatus,
    QuotationStatus,
)


class BookingCreate(BaseModel):
    tour_package_id: Optional[int] = None
    tour_id: Optional[int] = None
    travel_date: Optional[date] = None
    travelers: int = Field(default=1, ge=1)
    notes: Optional[str] = None
    total_amount: Optional[Decimal] = None


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    tour_id: Optional[int] = None
    booking_code: str
    travel_date: Optional[date]
    travelers: int
    total_amount: Optional[Decimal]
    status: BookingStatus
    notes: Optional[str]
    created_at: datetime

    @property
    def tour_package_id(self) -> Optional[int]:
        return self.tour_id


class EnquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str


class EnquiryRead(EnquiryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int]
    status: EnquiryStatus
    created_at: datetime


class QuotationCreate(BaseModel):
    enquiry_id: Optional[int] = None
    user_id: Optional[int] = None
    title: str
    amount: Optional[Decimal] = None
    currency: str = "INR"
    valid_until: Optional[date] = None
    details: Optional[str] = None
    status: QuotationStatus = QuotationStatus.DRAFT


class QuotationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enquiry_id: Optional[int] = None
    user_id: Optional[int] = None
    quotation_code: str
    title: str
    amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    currency: str
    valid_until: Optional[date] = None
    details: Optional[str] = None
    status: QuotationStatus
    created_at: datetime


class PaymentCreate(BaseModel):
    booking_id: Optional[int] = None
    amount: Decimal
    currency: str = "INR"
    method: Optional[str] = None
    transaction_ref: Optional[str] = None


class PaymentRead(PaymentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    status: PaymentStatus
    created_at: datetime


class HotelCreate(BaseModel):
    name: str
    city: str
    address: Optional[str] = None
    star_rating: Optional[int] = Field(default=None, ge=1, le=5)
    price_per_night: Optional[Decimal] = None
    amenities: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_active: bool = True


class HotelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    city: str
    address: Optional[str] = None
    star_rating: Optional[int] = None
    amenities: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_active: bool


class TransportCreate(BaseModel):
    name: str
    vehicle_type: str = "sedan"
    service_type: str = "transfer"
    capacity: Optional[int] = None
    registration_number: Optional[str] = None
    price_per_day: Optional[Decimal] = None
    price_per_trip: Optional[Decimal] = None
    description: Optional[str] = None
    is_active: bool = True


class TransportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    service_type: str
    vehicle_type: Optional[str] = None
    capacity: Optional[int] = None
    registration_number: Optional[str] = None
    price_per_day: Optional[Decimal] = None
    price_per_trip: Optional[Decimal] = None
    description: Optional[str] = None
    is_active: bool
    vehicle_id: Optional[int] = None


class TransportPricingUpdate(BaseModel):
    price_per_day: Optional[Decimal] = Field(default=None, ge=0)
    price_per_trip: Optional[Decimal] = Field(default=None, ge=0)
class OfferCreate(BaseModel):
    code: Optional[str] = None
    title: str
    description: Optional[str] = None
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    is_active: bool = True


class OfferRead(OfferCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ReviewCreate(BaseModel):
    tour_package_id: Optional[int] = None
    tour_id: Optional[int] = None
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    tour_id: Optional[int] = None
    rating: int
    comment: Optional[str] = None
    is_approved: bool
    created_at: datetime


class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    body: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: PublishStatus = PublishStatus.DRAFT
    category_id: Optional[int] = None


class BlogPostRead(BlogPostCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    author_id: Optional[int]
    created_at: datetime


class WebsiteSettingUpsert(BaseModel):
    key: str
    value: Optional[str] = None
    label: Optional[str] = None


class WebsiteSettingRead(WebsiteSettingUpsert):
    model_config = ConfigDict(from_attributes=True)
    id: int
