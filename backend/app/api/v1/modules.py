"""Domain API routers for foundation CRUD and dashboards."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import AdminUser, CurrentUser, StaffUser
from app.core.security import hash_password
from app.crud import base as crud
from app.db.session import get_db
from app.models import (
    BlogPost,
    Booking,
    Enquiry,
    Hotel,
    Offer,
    Payment,
    Quotation,
    Review,
    User,
    WebsiteSetting,
)
from app.models.auth import Role
from app.models.content import Page
from app.models.marketing import Banner, Coupon
from app.models.system import GstSetting, Notification
from app.models.tours import Tour, TourCategory
from app.models.transport import Transport, Vehicle
from app.schemas.domain import (
    BlogPostCreate,
    BlogPostRead,
    BookingCreate,
    BookingRead,
    EnquiryCreate,
    EnquiryRead,
    HotelCreate,
    HotelRead,
    OfferCreate,
    OfferRead,
    PaymentCreate,
    PaymentRead,
    QuotationCreate,
    QuotationRead,
    ReviewCreate,
    ReviewRead,
    TransportCreate,
    TransportPricingUpdate,
    TransportRead,
    WebsiteSettingRead,
    WebsiteSettingUpsert,
)
from app.schemas.reports import DashboardResponse, ReportSummary
from app.schemas.user import UserCreate, UserRead
from app.services.reports_service import build_dashboard, build_report_summary

health_router = APIRouter(tags=["health"])
users_router = APIRouter(prefix="/users", tags=["users"])
bookings_router = APIRouter(prefix="/bookings", tags=["bookings"])
enquiries_router = APIRouter(prefix="/enquiries", tags=["enquiries"])
quotations_router = APIRouter(prefix="/quotations", tags=["quotations"])
payments_router = APIRouter(prefix="/payments", tags=["payments"])
hotels_router = APIRouter(prefix="/hotels", tags=["hotels"])
transport_router = APIRouter(prefix="/transport", tags=["transport"])
offers_router = APIRouter(prefix="/offers", tags=["offers"])
reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])
blog_router = APIRouter(prefix="/blog", tags=["blog"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])
reports_router = APIRouter(prefix="/reports", tags=["reports"])


def _code(prefix: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"{prefix}-{stamp}-{secrets.token_hex(3).upper()}"


@health_router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "LUXURISSE PRIVATE LIMITED API"}


@users_router.get("", response_model=list[UserRead])
def list_users(_: AdminUser, db: Annotated[Session, Depends(get_db)]) -> list[User]:
    return crud.list_all(db, User)


@users_router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    actor: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    from app.models.enums import UserRole

    if payload.role == UserRole.SUPER_ADMIN and actor.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admin can create super admins")
    if payload.role == UserRole.CUSTOMER:
        # Prefer /auth/register for customers
        pass
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@bookings_router.get("/my", response_model=list[BookingRead])
def my_bookings(user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> list[Booking]:
    return list(db.scalars(select(Booking).where(Booking.user_id == user.id)).all())


@bookings_router.get("", response_model=list[BookingRead])
def list_bookings(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[Booking]:
    return crud.list_all(db, Booking)


@bookings_router.post("", response_model=BookingRead, status_code=201)
def create_booking(
    payload: BookingCreate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Booking:
    tour_id = payload.tour_id or payload.tour_package_id
    total = payload.total_amount
    if total is None and tour_id:
        tour = db.get(Tour, tour_id)
        if tour is None or tour.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Invalid tour_id")
        if tour.starting_price is not None:
            total = tour.starting_price * payload.travelers
    data = {
        "user_id": user.id,
        "tour_id": tour_id,
        "travel_date": payload.travel_date,
        "travelers": payload.travelers,
        "notes": payload.notes,
        "booking_code": _code("BK"),
        "subtotal_amount": total,
        "total_amount": total,
    }
    return crud.create_row(db, Booking, data)


@enquiries_router.post("", response_model=EnquiryRead, status_code=201)
def create_enquiry(
    payload: EnquiryCreate,
    db: Annotated[Session, Depends(get_db)],
) -> Enquiry:
    return crud.create_row(db, Enquiry, payload.model_dump())


@enquiries_router.get("", response_model=list[EnquiryRead])
def list_enquiries(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[Enquiry]:
    return crud.list_all(db, Enquiry)


@quotations_router.get("", response_model=list[QuotationRead])
def list_quotations(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[Quotation]:
    return crud.list_all(db, Quotation)


@quotations_router.post("", response_model=QuotationRead, status_code=201)
def create_quotation(
    payload: QuotationCreate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Quotation:
    data = payload.model_dump()
    data["quotation_code"] = _code("QT")
    return crud.create_row(db, Quotation, data)


@payments_router.get("", response_model=list[PaymentRead])
def list_payments(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[Payment]:
    return crud.list_all(db, Payment)


@payments_router.post("", response_model=PaymentRead, status_code=201)
def create_payment(
    payload: PaymentCreate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Payment:
    data = payload.model_dump()
    data["user_id"] = user.id
    return crud.create_row(db, Payment, data)


@hotels_router.get("", response_model=list[HotelRead])
def list_hotels(db: Annotated[Session, Depends(get_db)]) -> list[Hotel]:
    return crud.list_all(db, Hotel)


@hotels_router.post("", response_model=HotelRead, status_code=201)
def create_hotel(
    payload: HotelCreate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Hotel:
    data = payload.model_dump(exclude={"price_per_night"})
    return crud.create_row(db, Hotel, data)


def _transport_read(row: Transport) -> TransportRead:
    vehicle = row.vehicle
    return TransportRead(
        id=row.id,
        name=row.name,
        service_type=row.service_type,
        vehicle_type=vehicle.vehicle_type if vehicle else None,
        capacity=vehicle.capacity if vehicle else None,
        registration_number=vehicle.registration_number if vehicle else None,
        price_per_day=row.price_per_day,
        price_per_trip=row.price_per_trip,
        description=row.description,
        is_active=row.is_active,
        vehicle_id=row.vehicle_id,
    )


@transport_router.get("", response_model=list[TransportRead])
def list_transport(db: Annotated[Session, Depends(get_db)]) -> list[TransportRead]:
    rows = list(
        db.scalars(
            select(Transport)
            .where(Transport.deleted_at.is_(None))
            .order_by(Transport.id.desc())
            .limit(200)
        ).all()
    )
    # Ensure vehicle relationship is available
    for row in rows:
        _ = row.vehicle
    return [_transport_read(row) for row in rows]


@transport_router.post("", response_model=TransportRead, status_code=201)
def create_transport(
    payload: TransportCreate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TransportRead:
    vehicle = None
    if payload.registration_number:
        vehicle = db.scalar(
            select(Vehicle).where(
                Vehicle.registration_number == payload.registration_number,
                Vehicle.deleted_at.is_(None),
            )
        )
    if vehicle is None:
        vehicle = Vehicle(
            name=payload.name,
            vehicle_type=payload.vehicle_type or "sedan",
            registration_number=payload.registration_number,
            capacity=payload.capacity,
            description=payload.description,
            is_active=payload.is_active,
        )
        db.add(vehicle)
        db.flush()

    row = Transport(
        vehicle_id=vehicle.id,
        name=payload.name,
        service_type=payload.service_type or payload.vehicle_type or "transfer",
        description=payload.description,
        price_per_day=payload.price_per_day,
        price_per_trip=payload.price_per_trip,
        currency="INR",
        is_active=payload.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _ = row.vehicle
    return _transport_read(row)


@transport_router.patch("/{transport_id}", response_model=TransportRead)
def update_transport_pricing(
    transport_id: int,
    payload: TransportPricingUpdate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TransportRead:
    row = db.get(Transport, transport_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Transport service not found")
    if payload.price_per_day is not None:
        row.price_per_day = payload.price_per_day
    if payload.price_per_trip is not None:
        row.price_per_trip = payload.price_per_trip
    db.add(row)
    db.commit()
    db.refresh(row)
    _ = row.vehicle
    return _transport_read(row)


@offers_router.get("", response_model=list[OfferRead])
def list_offers(db: Annotated[Session, Depends(get_db)]) -> list[Offer]:
    return crud.list_all(db, Offer)


@offers_router.post("", response_model=OfferRead, status_code=201)
def create_offer(
    payload: OfferCreate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Offer:
    return crud.create_row(db, Offer, payload.model_dump())


@reviews_router.get("", response_model=list[ReviewRead])
def list_reviews(db: Annotated[Session, Depends(get_db)]) -> list[Review]:
    return crud.list_all(db, Review)


@reviews_router.post("", response_model=ReviewRead, status_code=201)
def create_review(
    payload: ReviewCreate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Review:
    data = {
        "user_id": user.id,
        "tour_id": payload.tour_id or payload.tour_package_id,
        "rating": payload.rating,
        "comment": payload.comment,
    }
    return crud.create_row(db, Review, data)


@blog_router.get("", response_model=list[BlogPostRead])
def list_posts(db: Annotated[Session, Depends(get_db)]) -> list[BlogPost]:
    return crud.list_all(db, BlogPost)


@blog_router.post("", response_model=BlogPostRead, status_code=201)
def create_post(
    payload: BlogPostCreate,
    user: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> BlogPost:
    data = payload.model_dump()
    data["author_id"] = user.id
    return crud.create_row(db, BlogPost, data)


@settings_router.get("", response_model=list[WebsiteSettingRead])
def list_settings(db: Annotated[Session, Depends(get_db)]) -> list[WebsiteSetting]:
    return crud.list_all(db, WebsiteSetting)


@settings_router.put("", response_model=WebsiteSettingRead)
def upsert_setting(
    payload: WebsiteSettingUpsert,
    _: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> WebsiteSetting:
    row = db.scalar(select(WebsiteSetting).where(WebsiteSetting.key == payload.key))
    if row:
        return crud.update_row(db, row, payload.model_dump())
    return crud.create_row(db, WebsiteSetting, payload.model_dump())


@settings_router.get("/public")
def public_company_settings(
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Verified company contact only — no invented claims."""
    from app.core.config import get_settings

    settings = get_settings()
    stored = {s.key: s.value for s in crud.list_all(db, WebsiteSetting, limit=200)}
    return {
        "company_name": settings.app_name,
        "email": stored.get("company_email", settings.company_email),
        "phone": stored.get("company_phone", settings.company_phone),
        "address": stored.get("company_address", settings.company_address),
        "managing_director": stored.get("company_md", settings.company_md),
        "director": stored.get("company_director", settings.company_director),
    }


@reports_router.get("/summary", response_model=ReportSummary)
def report_summary(_: AdminUser, db: Annotated[Session, Depends(get_db)]) -> ReportSummary:
    return build_report_summary(db)


@reports_router.get("/dashboard", response_model=DashboardResponse)
def dashboard(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> DashboardResponse:
    """Admin dashboard cards + charts from live aggregates (zeros when empty)."""
    return build_dashboard(db)


# --- Extra catalogue lists for admin panel (real DB rows; empty is valid) ---
categories_router = APIRouter(prefix="/categories", tags=["categories"])


@categories_router.get("")
def list_categories(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, TourCategory)
    return [
        {
            "id": r.id,
            "name": r.name,
            "slug": r.slug,
            "is_active": r.is_active,
            "description": r.description,
        }
        for r in rows
        if r.deleted_at is None
    ]


@categories_router.post("", status_code=201)
def create_category(
    payload: dict,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    name = (payload.get("name") or "").strip()
    slug = (payload.get("slug") or "").strip()
    if not name or not slug:
        raise HTTPException(status_code=400, detail="name and slug are required")
    if db.scalar(select(TourCategory).where(TourCategory.slug == slug, TourCategory.deleted_at.is_(None))):
        raise HTTPException(status_code=400, detail="Category slug already exists")
    row = TourCategory(
        name=name,
        slug=slug,
        description=payload.get("description"),
        is_active=bool(payload.get("is_active", True)),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name, "slug": row.slug, "is_active": row.is_active}


coupons_router = APIRouter(prefix="/coupons", tags=["coupons"])


@coupons_router.get("")
def list_coupons(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, Coupon)
    return [
        {
            "id": r.id,
            "code": r.code,
            "title": r.title,
            "is_active": r.is_active,
            "discount_type": r.discount_type.value if r.discount_type else None,
            "discount_value": str(r.discount_value) if r.discount_value is not None else None,
        }
        for r in rows
    ]


banners_router = APIRouter(prefix="/banners", tags=["banners"])


@banners_router.get("")
def list_banners(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, Banner)
    return [
        {"id": r.id, "title": r.title, "image_url": r.image_url, "is_active": r.is_active}
        for r in rows
    ]


pages_router = APIRouter(prefix="/pages", tags=["pages"])


@pages_router.get("")
def list_pages(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, Page)
    return [
        {"id": r.id, "title": r.title, "slug": r.slug, "status": r.status.value}
        for r in rows
    ]


notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notifications_router.get("")
def list_notifications(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, Notification)
    return [
        {
            "id": r.id,
            "title": r.title,
            "body": r.body,
            "is_read": r.is_read,
            "channel": r.channel.value,
        }
        for r in rows
    ]


roles_router = APIRouter(prefix="/roles", tags=["roles"])


@roles_router.get("")
def list_roles(_: AdminUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, Role)
    return [{"id": r.id, "name": r.name, "description": r.description, "is_system": r.is_system} for r in rows]


gst_router = APIRouter(prefix="/gst", tags=["gst"])


@gst_router.get("")
def list_gst(_: AdminUser, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = crud.list_all(db, GstSetting)
    return [
        {
            "id": r.id,
            "name": r.name,
            "gstin": r.gstin,
            "cgst_rate": str(r.cgst_rate) if r.cgst_rate is not None else None,
            "sgst_rate": str(r.sgst_rate) if r.sgst_rate is not None else None,
            "igst_rate": str(r.igst_rate) if r.igst_rate is not None else None,
            "is_active": r.is_active,
        }
        for r in rows
    ]
