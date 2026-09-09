"""Tour package business logic (CRUD + nested collections)."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.destinations import Destination
from app.models.enums import PublishStatus
from app.models.tours import (
    Tour,
    TourCategory,
    TourDepartureDate,
    TourExclusion,
    TourImage,
    TourInclusion,
    TourItinerary,
    TourPricing,
)
from app.schemas.tours import TourDetail, TourListItem, TourPricingUpdate, TourWrite


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower())
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value[:270] or "tour"


def _active_tours_query():
    return select(Tour).where(Tour.deleted_at.is_(None))


def _load_options():
    return (
        selectinload(Tour.category),
        selectinload(Tour.images),
        selectinload(Tour.itineraries),
        selectinload(Tour.inclusions),
        selectinload(Tour.exclusions),
        selectinload(Tour.pricing),
        selectinload(Tour.departure_dates),
    )


def get_tour_or_404(db: Session, tour_id: int, *, include_deleted: bool = False) -> Tour:
    stmt = select(Tour).options(*_load_options()).where(Tour.id == tour_id)
    if not include_deleted:
        stmt = stmt.where(Tour.deleted_at.is_(None))
    tour = db.scalar(stmt)
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    return tour


def _ensure_refs(db: Session, category_id: int, destination_id: int) -> tuple[TourCategory, Destination]:
    category = db.get(TourCategory, category_id)
    if not category or category.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Invalid category_id")
    destination = db.get(Destination, destination_id)
    if not destination or destination.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Invalid destination_id")
    return category, destination


def _ensure_unique_code_slug(db: Session, code: str, slug: str, *, exclude_id: Optional[int] = None) -> None:
    code_q = select(Tour).where(Tour.code == code, Tour.deleted_at.is_(None))
    slug_q = select(Tour).where(Tour.slug == slug, Tour.deleted_at.is_(None))
    if exclude_id is not None:
        code_q = code_q.where(Tour.id != exclude_id)
        slug_q = slug_q.where(Tour.id != exclude_id)
    if db.scalar(code_q):
        raise HTTPException(status_code=400, detail="Tour code/SKU already exists")
    if db.scalar(slug_q):
        raise HTTPException(status_code=400, detail="Tour slug already exists")


def _destination_name(db: Session, destination_id: int) -> Optional[str]:
    dest = db.get(Destination, destination_id)
    return dest.name if dest else None


def to_list_item(db: Session, tour: Tour) -> TourListItem:
    cover = next((img.image_url for img in tour.images if img.is_cover), None)
    if not cover and tour.images:
        cover = tour.images[0].image_url
    return TourListItem(
        id=tour.id,
        title=tour.title,
        code=tour.code,
        slug=tour.slug,
        category_id=tour.category_id,
        destination_id=tour.destination_id,
        category_name=tour.category.name if tour.category else None,
        destination_name=_destination_name(db, tour.destination_id),
        duration_days=tour.duration_days,
        duration_nights=tour.duration_nights,
        starting_price=tour.starting_price,
        mrp=tour.mrp,
        discount=tour.discount,
        is_featured=tour.is_featured,
        is_published=tour.is_published,
        status=tour.status,
        cover_image_url=cover,
        created_at=tour.created_at,
        updated_at=tour.updated_at,
    )


def to_detail(db: Session, tour: Tour) -> TourDetail:
    active_pricing = [p for p in tour.pricing if p.deleted_at is None]
    active_departures = [d for d in tour.departure_dates if d.deleted_at is None]
    return TourDetail(
        id=tour.id,
        title=tour.title,
        code=tour.code,
        slug=tour.slug,
        category_id=tour.category_id,
        destination_id=tour.destination_id,
        category_name=tour.category.name if tour.category else None,
        destination_name=_destination_name(db, tour.destination_id),
        duration_days=tour.duration_days,
        duration_nights=tour.duration_nights,
        starting_price=tour.starting_price,
        mrp=tour.mrp,
        discount=tour.discount,
        max_travellers=tour.max_travellers,
        summary=tour.summary,
        description=tour.description,
        highlights=tour.highlights,
        hotel_information=tour.hotel_information,
        meal_plan=tour.meal_plan,
        transportation=tour.transportation,
        activities=tour.activities,
        is_featured=tour.is_featured,
        is_published=tour.is_published,
        status=tour.status,
        images=sorted(tour.images, key=lambda x: x.sort_order),
        itineraries=sorted(tour.itineraries, key=lambda x: x.day_number),
        inclusions=sorted(tour.inclusions, key=lambda x: x.sort_order),
        exclusions=sorted(tour.exclusions, key=lambda x: x.sort_order),
        pricing=active_pricing,
        departure_dates=sorted(active_departures, key=lambda x: x.departure_date),
        created_at=tour.created_at,
        updated_at=tour.updated_at,
    )


def list_tours(
    db: Session,
    *,
    published_only: bool = False,
    include_deleted: bool = False,
    limit: int = 200,
) -> list[TourListItem]:
    stmt = select(Tour).options(
        selectinload(Tour.category),
        selectinload(Tour.images),
    )
    if not include_deleted:
        stmt = stmt.where(Tour.deleted_at.is_(None))
    if published_only:
        stmt = stmt.where(Tour.is_published.is_(True), Tour.status == PublishStatus.PUBLISHED)
    stmt = stmt.order_by(Tour.updated_at.desc()).limit(limit)
    tours = list(db.scalars(stmt).all())
    return [to_list_item(db, t) for t in tours]


def _replace_children(tour: Tour, payload: TourWrite) -> None:
    tour.images.clear()
    for idx, img in enumerate(payload.images):
        tour.images.append(
            TourImage(
                image_url=img.image_url,
                alt_text=img.alt_text,
                sort_order=img.sort_order if img.sort_order else idx,
                is_cover=img.is_cover,
            )
        )
    if tour.images and not any(i.is_cover for i in tour.images):
        tour.images[0].is_cover = True

    tour.itineraries.clear()
    for day in payload.itineraries:
        tour.itineraries.append(
            TourItinerary(
                day_number=day.day_number,
                title=day.title,
                description=day.description,
                meals=day.meals,
                hotel=day.hotel,
                activities=day.activities,
            )
        )

    tour.inclusions.clear()
    for idx, row in enumerate(payload.inclusions):
        tour.inclusions.append(
            TourInclusion(item=row.item, sort_order=row.sort_order if row.sort_order else idx)
        )

    tour.exclusions.clear()
    for idx, row in enumerate(payload.exclusions):
        tour.exclusions.append(
            TourExclusion(item=row.item, sort_order=row.sort_order if row.sort_order else idx)
        )

    tour.pricing.clear()
    for row in payload.pricing:
        tour.pricing.append(
            TourPricing(
                label=row.label,
                currency=row.currency,
                adult_price=row.adult_price,
                child_price=row.child_price,
                infant_price=row.infant_price,
                is_active=row.is_active,
            )
        )

    tour.departure_dates.clear()
    for row in payload.departure_dates:
        tour.departure_dates.append(
            TourDepartureDate(
                departure_date=row.departure_date,
                seats_total=row.seats_total,
                seats_available=row.seats_available,
                is_active=row.is_active,
            )
        )


def create_tour(db: Session, payload: TourWrite) -> TourDetail:
    _ensure_refs(db, payload.category_id, payload.destination_id)
    slug = payload.slug.strip() if payload.slug else slugify(payload.title)
    _ensure_unique_code_slug(db, payload.code, slug)

    tour = Tour(
        title=payload.title,
        code=payload.code,
        slug=slug,
        category_id=payload.category_id,
        destination_id=payload.destination_id,
        duration_days=payload.duration_days,
        duration_nights=payload.duration_nights,
        starting_price=payload.starting_price,
        mrp=payload.mrp,
        discount=payload.discount,
        max_travellers=payload.max_travellers,
        summary=payload.summary,
        description=payload.description,
        highlights=payload.highlights,
        hotel_information=payload.hotel_information,
        meal_plan=payload.meal_plan,
        transportation=payload.transportation,
        activities=payload.activities,
        is_featured=payload.is_featured,
        is_published=payload.is_published,
        status=payload.status,
    )
    _replace_children(tour, payload)
    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))


def update_tour(db: Session, tour_id: int, payload: TourWrite) -> TourDetail:
    tour = get_tour_or_404(db, tour_id)
    _ensure_refs(db, payload.category_id, payload.destination_id)
    slug = payload.slug.strip() if payload.slug else slugify(payload.title)
    _ensure_unique_code_slug(db, payload.code, slug, exclude_id=tour.id)

    tour.title = payload.title
    tour.code = payload.code
    tour.slug = slug
    tour.category_id = payload.category_id
    tour.destination_id = payload.destination_id
    tour.duration_days = payload.duration_days
    tour.duration_nights = payload.duration_nights
    tour.starting_price = payload.starting_price
    tour.mrp = payload.mrp
    tour.discount = payload.discount
    tour.max_travellers = payload.max_travellers
    tour.summary = payload.summary
    tour.description = payload.description
    tour.highlights = payload.highlights
    tour.hotel_information = payload.hotel_information
    tour.meal_plan = payload.meal_plan
    tour.transportation = payload.transportation
    tour.activities = payload.activities
    tour.is_featured = payload.is_featured
    tour.is_published = payload.is_published
    tour.status = payload.status

    _replace_children(tour, payload)
    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))


def soft_delete_tour(db: Session, tour_id: int) -> None:
    tour = get_tour_or_404(db, tour_id)
    tour.deleted_at = datetime.now(timezone.utc)
    tour.is_published = False
    if tour.status == PublishStatus.PUBLISHED:
        tour.status = PublishStatus.ARCHIVED
    db.add(tour)
    db.commit()


def set_published(db: Session, tour_id: int, published: bool) -> TourDetail:
    tour = get_tour_or_404(db, tour_id)
    tour.is_published = published
    tour.status = PublishStatus.PUBLISHED if published else PublishStatus.DRAFT
    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))


def set_featured(db: Session, tour_id: int, featured: bool) -> TourDetail:
    tour = get_tour_or_404(db, tour_id)
    tour.is_featured = featured
    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))


def update_pricing(db: Session, tour_id: int, payload: TourPricingUpdate) -> TourDetail:
    tour = get_tour_or_404(db, tour_id)
    starting = payload.starting_price
    if starting is None and payload.adult_price is not None:
        starting = payload.adult_price
    tour.starting_price = starting
    tour.mrp = payload.mrp
    tour.discount = payload.discount

    # Keep a single active Standard (or labeled) tier in sync with list pricing
    active = next((p for p in tour.pricing if p.is_active), None)
    if active is None and tour.pricing:
        active = tour.pricing[0]
    if active is None:
        tour.pricing.append(
            TourPricing(
                label=payload.label,
                currency=payload.currency,
                adult_price=payload.adult_price if payload.adult_price is not None else starting,
                child_price=payload.child_price,
                infant_price=payload.infant_price,
                is_active=True,
            )
        )
    else:
        active.label = payload.label
        active.currency = payload.currency
        active.adult_price = payload.adult_price if payload.adult_price is not None else starting
        active.child_price = payload.child_price
        active.infant_price = payload.infant_price
        active.is_active = True

    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))


def add_tour_image(
    db: Session,
    tour_id: int,
    *,
    image_url: str,
    alt_text: Optional[str] = None,
    is_cover: bool = False,
) -> TourDetail:
    tour = get_tour_or_404(db, tour_id)
    if is_cover:
        for img in tour.images:
            img.is_cover = False
    sort_order = (max((i.sort_order for i in tour.images), default=-1) + 1)
    tour.images.append(
        TourImage(
            image_url=image_url,
            alt_text=alt_text,
            sort_order=sort_order,
            is_cover=is_cover or len(tour.images) == 0,
        )
    )
    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))


def delete_tour_image(db: Session, tour_id: int, image_id: int) -> TourDetail:
    tour = get_tour_or_404(db, tour_id)
    target = next((i for i in tour.images if i.id == image_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Image not found")
    was_cover = target.is_cover
    tour.images.remove(target)
    if was_cover and tour.images:
        tour.images[0].is_cover = True
    db.add(tour)
    db.commit()
    return to_detail(db, get_tour_or_404(db, tour.id))
