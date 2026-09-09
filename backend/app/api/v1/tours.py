"""Tour package management API."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import BACKEND_ROOT
from app.core.deps import StaffUser
from app.db.session import get_db
from app.schemas.tours import TourDetail, TourFeaturedUpdate, TourListItem, TourPricingUpdate, TourWrite
from app.services import tour_service

router = APIRouter(prefix="/tours", tags=["tours"])

UPLOAD_DIR = BACKEND_ROOT / "uploads" / "tours"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


@router.get("", response_model=list[TourListItem])
def list_tours(
    db: Annotated[Session, Depends(get_db)],
    published_only: bool = Query(False),
) -> list[TourListItem]:
    """List tours. Pass published_only=true for public catalogue."""
    return tour_service.list_tours(db, published_only=published_only)


@router.get("/admin", response_model=list[TourListItem])
def list_tours_admin(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[TourListItem]:
    return tour_service.list_tours(db, published_only=False)


@router.post("", response_model=TourDetail, status_code=status.HTTP_201_CREATED)
def create_tour(
    payload: TourWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.create_tour(db, payload)


@router.get("/{tour_id}", response_model=TourDetail)
def get_tour(tour_id: int, db: Annotated[Session, Depends(get_db)]) -> TourDetail:
    tour = tour_service.get_tour_or_404(db, tour_id)
    return tour_service.to_detail(db, tour)


@router.put("/{tour_id}", response_model=TourDetail)
def update_tour(
    tour_id: int,
    payload: TourWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.update_tour(db, tour_id, payload)


@router.delete("/{tour_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_tour(
    tour_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    tour_service.soft_delete_tour(db, tour_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{tour_id}/publish", response_model=TourDetail)
def publish_tour(
    tour_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.set_published(db, tour_id, True)


@router.post("/{tour_id}/unpublish", response_model=TourDetail)
def unpublish_tour(
    tour_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.set_published(db, tour_id, False)


@router.patch("/{tour_id}/featured", response_model=TourDetail)
def set_featured(
    tour_id: int,
    payload: TourFeaturedUpdate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.set_featured(db, tour_id, payload.is_featured)


@router.patch("/{tour_id}/pricing", response_model=TourDetail)
def update_tour_pricing(
    tour_id: int,
    payload: TourPricingUpdate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.update_pricing(db, tour_id, payload)


@router.post("/{tour_id}/images", response_model=TourDetail)
async def upload_tour_images(
    tour_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
    files: list[UploadFile] = File(...),
    set_cover_first: bool = Form(True),
) -> TourDetail:
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    detail = None
    for index, upload in enumerate(files):
        content_type = (upload.content_type or "").lower()
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type or 'unknown'}")
        data = await upload.read()
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Each image must be 5MB or smaller")
        ext = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }[content_type]
        filename = f"{tour_id}_{uuid.uuid4().hex}{ext}"
        path = UPLOAD_DIR / filename
        path.write_bytes(data)
        image_url = f"/uploads/tours/{filename}"
        detail = tour_service.add_tour_image(
            db,
            tour_id,
            image_url=image_url,
            alt_text=upload.filename,
            is_cover=set_cover_first and index == 0,
        )
    assert detail is not None
    return detail


@router.delete("/{tour_id}/images/{image_id}", response_model=TourDetail)
def delete_tour_image(
    tour_id: int,
    image_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> TourDetail:
    return tour_service.delete_tour_image(db, tour_id, image_id)
