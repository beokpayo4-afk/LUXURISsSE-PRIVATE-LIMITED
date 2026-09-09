"""Destination management API."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import BACKEND_ROOT
from app.core.deps import StaffUser
from app.db.session import get_db
from app.schemas.destinations import (
    DestinationDetail,
    DestinationFeaturedUpdate,
    DestinationListItem,
    DestinationWrite,
)
from app.services import destination_service

router = APIRouter(prefix="/destinations", tags=["destinations"])

UPLOAD_DIR = BACKEND_ROOT / "uploads" / "destinations"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


@router.get("", response_model=list[DestinationListItem])
def list_destinations(
    db: Annotated[Session, Depends(get_db)],
    published_only: bool = Query(False),
) -> list[DestinationListItem]:
    return destination_service.list_destinations(db, published_only=published_only)


@router.get("/admin", response_model=list[DestinationListItem])
def list_destinations_admin(
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[DestinationListItem]:
    return destination_service.list_destinations(db, published_only=False)


@router.post("", response_model=DestinationDetail, status_code=status.HTTP_201_CREATED)
def create_destination(
    payload: DestinationWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    return destination_service.create_destination(db, payload)


@router.get("/{destination_id}", response_model=DestinationDetail)
def get_destination(
    destination_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    dest = destination_service.get_destination_or_404(db, destination_id)
    return destination_service.to_detail(db, dest)


@router.put("/{destination_id}", response_model=DestinationDetail)
def update_destination(
    destination_id: int,
    payload: DestinationWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    return destination_service.update_destination(db, destination_id, payload)


@router.delete("/{destination_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_destination(
    destination_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    destination_service.soft_delete_destination(db, destination_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{destination_id}/publish", response_model=DestinationDetail)
def publish_destination(
    destination_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    return destination_service.set_published(db, destination_id, True)


@router.post("/{destination_id}/unpublish", response_model=DestinationDetail)
def unpublish_destination(
    destination_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    return destination_service.set_published(db, destination_id, False)


@router.patch("/{destination_id}/featured", response_model=DestinationDetail)
def set_featured(
    destination_id: int,
    payload: DestinationFeaturedUpdate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    return destination_service.set_featured(db, destination_id, payload.is_featured)


@router.post("/{destination_id}/images", response_model=DestinationDetail)
async def upload_destination_images(
    destination_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
    files: list[UploadFile] = File(...),
    set_cover_first: bool = Form(True),
) -> DestinationDetail:
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    detail = None
    for index, upload in enumerate(files):
        content_type = (upload.content_type or "").lower()
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image type: {content_type or 'unknown'}",
            )
        data = await upload.read()
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Each image must be 5MB or smaller")
        ext = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }[content_type]
        filename = f"{destination_id}_{uuid.uuid4().hex}{ext}"
        path = UPLOAD_DIR / filename
        path.write_bytes(data)
        image_url = f"/uploads/destinations/{filename}"
        detail = destination_service.add_destination_image(
            db,
            destination_id,
            image_url=image_url,
            alt_text=upload.filename,
            is_cover=set_cover_first and index == 0,
        )
    assert detail is not None
    return detail


@router.delete("/{destination_id}/images/{image_id}", response_model=DestinationDetail)
def delete_destination_image(
    destination_id: int,
    image_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> DestinationDetail:
    return destination_service.delete_destination_image(db, destination_id, image_id)
