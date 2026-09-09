"""Destination management business logic."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.destinations import Attraction, Destination, DestinationImage
from app.models.enums import PublishStatus
from app.models.tours import Tour
from app.schemas.destinations import (
    DestinationDetail,
    DestinationListItem,
    DestinationWrite,
    LinkedTourSummary,
)


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower())
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value[:220] or "destination"


def _load_options():
    return (
        selectinload(Destination.images),
        selectinload(Destination.attractions),
        selectinload(Destination.city),
    )


def get_destination_or_404(db: Session, destination_id: int) -> Destination:
    dest = db.scalar(
        select(Destination)
        .options(*_load_options())
        .where(Destination.id == destination_id, Destination.deleted_at.is_(None))
    )
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return dest


def _ensure_unique_slug(db: Session, slug: str, *, exclude_id: Optional[int] = None) -> None:
    q = select(Destination).where(Destination.slug == slug, Destination.deleted_at.is_(None))
    if exclude_id is not None:
        q = q.where(Destination.id != exclude_id)
    if db.scalar(q):
        raise HTTPException(status_code=400, detail="Destination slug already exists")


def _tour_count(db: Session, destination_id: int) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Tour)
            .where(Tour.destination_id == destination_id, Tour.deleted_at.is_(None))
        )
        or 0
    )


def _linked_tours(db: Session, destination_id: int) -> list[LinkedTourSummary]:
    rows = db.scalars(
        select(Tour)
        .where(Tour.destination_id == destination_id, Tour.deleted_at.is_(None))
        .order_by(Tour.title.asc())
        .limit(50)
    ).all()
    return [
        LinkedTourSummary(
            id=t.id,
            title=t.title,
            code=t.code,
            status=t.status,
            is_published=t.is_published,
        )
        for t in rows
    ]


def to_list_item(db: Session, dest: Destination) -> DestinationListItem:
    cover = next((img.image_url for img in dest.images if img.is_cover), None)
    if not cover and dest.images:
        cover = dest.images[0].image_url
    active_attractions = [a for a in dest.attractions if a.deleted_at is None]
    return DestinationListItem(
        id=dest.id,
        name=dest.name,
        slug=dest.slug,
        country=dest.country,
        state=dest.state,
        city_name=dest.city_name,
        summary=dest.summary,
        is_featured=dest.is_featured,
        is_published=dest.is_published,
        is_popular=dest.is_popular,
        status=dest.status,
        cover_image_url=cover,
        attraction_count=len(active_attractions),
        tour_count=_tour_count(db, dest.id),
        created_at=dest.created_at,
        updated_at=dest.updated_at,
    )


def to_detail(db: Session, dest: Destination) -> DestinationDetail:
    active_attractions = sorted(
        [a for a in dest.attractions if a.deleted_at is None],
        key=lambda a: a.sort_order,
    )
    return DestinationDetail(
        id=dest.id,
        name=dest.name,
        slug=dest.slug,
        country=dest.country,
        state=dest.state,
        city_name=dest.city_name,
        city_id=dest.city_id,
        summary=dest.summary,
        description=dest.description,
        best_time_to_visit=dest.best_time_to_visit,
        travel_information=dest.travel_information,
        is_featured=dest.is_featured,
        is_published=dest.is_published,
        is_popular=dest.is_popular,
        status=dest.status,
        images=sorted(dest.images, key=lambda x: x.sort_order),
        attractions=active_attractions,
        linked_tours=_linked_tours(db, dest.id),
        created_at=dest.created_at,
        updated_at=dest.updated_at,
    )


def list_destinations(
    db: Session,
    *,
    published_only: bool = False,
    limit: int = 200,
) -> list[DestinationListItem]:
    stmt = (
        select(Destination)
        .options(selectinload(Destination.images), selectinload(Destination.attractions))
        .where(Destination.deleted_at.is_(None))
    )
    if published_only:
        stmt = stmt.where(
            Destination.is_published.is_(True),
            Destination.status == PublishStatus.PUBLISHED,
        )
    stmt = stmt.order_by(Destination.updated_at.desc()).limit(limit)
    rows = list(db.scalars(stmt).all())
    return [to_list_item(db, d) for d in rows]


def _replace_children(dest: Destination, payload: DestinationWrite) -> None:
    dest.images.clear()
    for idx, img in enumerate(payload.images):
        dest.images.append(
            DestinationImage(
                image_url=img.image_url,
                alt_text=img.alt_text,
                sort_order=img.sort_order if img.sort_order else idx,
                is_cover=img.is_cover,
            )
        )
    if dest.images and not any(i.is_cover for i in dest.images):
        dest.images[0].is_cover = True

    dest.attractions.clear()
    for idx, row in enumerate(payload.attractions):
        dest.attractions.append(
            Attraction(
                name=row.name,
                description=row.description,
                image_url=row.image_url,
                location=row.location,
                entry_information=row.entry_information,
                status=row.status,
                sort_order=row.sort_order if row.sort_order else idx,
            )
        )


def create_destination(db: Session, payload: DestinationWrite) -> DestinationDetail:
    slug = payload.slug.strip() if payload.slug else slugify(payload.name)
    _ensure_unique_slug(db, slug)
    dest = Destination(
        name=payload.name,
        slug=slug,
        country=payload.country,
        state=payload.state,
        city_name=payload.city_name,
        city_id=payload.city_id,
        summary=payload.summary,
        description=payload.description,
        best_time_to_visit=payload.best_time_to_visit,
        travel_information=payload.travel_information,
        is_featured=payload.is_featured,
        is_published=payload.is_published,
        is_popular=payload.is_popular or payload.is_featured,
        status=payload.status,
    )
    _replace_children(dest, payload)
    db.add(dest)
    db.commit()
    return to_detail(db, get_destination_or_404(db, dest.id))


def update_destination(db: Session, destination_id: int, payload: DestinationWrite) -> DestinationDetail:
    dest = get_destination_or_404(db, destination_id)
    slug = payload.slug.strip() if payload.slug else slugify(payload.name)
    _ensure_unique_slug(db, slug, exclude_id=dest.id)

    dest.name = payload.name
    dest.slug = slug
    dest.country = payload.country
    dest.state = payload.state
    dest.city_name = payload.city_name
    dest.city_id = payload.city_id
    dest.summary = payload.summary
    dest.description = payload.description
    dest.best_time_to_visit = payload.best_time_to_visit
    dest.travel_information = payload.travel_information
    dest.is_featured = payload.is_featured
    dest.is_published = payload.is_published
    dest.is_popular = payload.is_popular or payload.is_featured
    dest.status = payload.status

    _replace_children(dest, payload)
    db.add(dest)
    db.commit()
    return to_detail(db, get_destination_or_404(db, dest.id))


def soft_delete_destination(db: Session, destination_id: int) -> None:
    dest = get_destination_or_404(db, destination_id)
    linked = _tour_count(db, destination_id)
    if linked:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete destination linked to {linked} tour(s). Unlink or reassign tours first.",
        )
    dest.deleted_at = datetime.now(timezone.utc)
    dest.is_published = False
    if dest.status == PublishStatus.PUBLISHED:
        dest.status = PublishStatus.ARCHIVED
    db.add(dest)
    db.commit()


def set_published(db: Session, destination_id: int, published: bool) -> DestinationDetail:
    dest = get_destination_or_404(db, destination_id)
    dest.is_published = published
    dest.status = PublishStatus.PUBLISHED if published else PublishStatus.DRAFT
    db.add(dest)
    db.commit()
    return to_detail(db, get_destination_or_404(db, destination_id))


def set_featured(db: Session, destination_id: int, featured: bool) -> DestinationDetail:
    dest = get_destination_or_404(db, destination_id)
    dest.is_featured = featured
    dest.is_popular = featured
    db.add(dest)
    db.commit()
    return to_detail(db, get_destination_or_404(db, destination_id))


def add_destination_image(
    db: Session,
    destination_id: int,
    *,
    image_url: str,
    alt_text: Optional[str] = None,
    is_cover: bool = False,
) -> DestinationDetail:
    dest = get_destination_or_404(db, destination_id)
    if is_cover:
        for img in dest.images:
            img.is_cover = False
    sort_order = max((i.sort_order for i in dest.images), default=-1) + 1
    dest.images.append(
        DestinationImage(
            image_url=image_url,
            alt_text=alt_text,
            sort_order=sort_order,
            is_cover=is_cover or len(dest.images) == 0,
        )
    )
    db.add(dest)
    db.commit()
    return to_detail(db, get_destination_or_404(db, destination_id))


def delete_destination_image(db: Session, destination_id: int, image_id: int) -> DestinationDetail:
    dest = get_destination_or_404(db, destination_id)
    target = next((i for i in dest.images if i.id == image_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Image not found")
    was_cover = target.is_cover
    dest.images.remove(target)
    if was_cover and dest.images:
        dest.images[0].is_cover = True
    db.add(dest)
    db.commit()
    return to_detail(db, get_destination_or_404(db, destination_id))
