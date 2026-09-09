"""Gallery management API."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import BACKEND_ROOT
from app.core.deps import StaffUser
from app.db.session import get_db
from app.models.destinations import Destination
from app.models.marketing import Gallery

router = APIRouter(prefix="/galleries", tags=["galleries"])

UPLOAD_DIR = BACKEND_ROOT / "uploads" / "gallery"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class GalleryWrite(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default="Destinations", max_length=80)
    album: Optional[str] = Field(default=None, max_length=120)
    destination_id: Optional[int] = None
    sort_order: int = 0
    is_featured: bool = False
    is_active: bool = True


class GalleryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    image_url: str
    category: Optional[str] = None
    album: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    sort_order: int
    is_featured: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class GalleryStats(BaseModel):
    total_images: int
    total_albums: int
    active_images: int
    featured_images: int
    storage_bytes: int


class GalleryFeaturedUpdate(BaseModel):
    is_featured: bool


class GalleryActiveUpdate(BaseModel):
    is_active: bool


def _to_read(row: Gallery, dest_name: Optional[str] = None) -> GalleryRead:
    return GalleryRead(
        id=row.id,
        title=row.title,
        description=row.description,
        image_url=row.image_url,
        category=row.category,
        album=row.album,
        destination_id=row.destination_id,
        destination_name=dest_name,
        sort_order=row.sort_order,
        is_featured=row.is_featured,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _storage_bytes() -> int:
    if not UPLOAD_DIR.exists():
        return 0
    total = 0
    for path in UPLOAD_DIR.rglob("*"):
        if path.is_file():
            total += path.stat().st_size
    return total


def _get_or_404(db: Session, gallery_id: int) -> Gallery:
    row = db.scalar(select(Gallery).where(Gallery.id == gallery_id, Gallery.deleted_at.is_(None)))
    if not row:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    return row


@router.get("/stats", response_model=GalleryStats)
def gallery_stats(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> GalleryStats:
    active = Gallery.deleted_at.is_(None)
    albums = db.scalar(
        select(func.count(func.distinct(Gallery.album))).where(active, Gallery.album.is_not(None), Gallery.album != "")
    ) or 0
    return GalleryStats(
        total_images=db.scalar(select(func.count()).select_from(Gallery).where(active)) or 0,
        total_albums=int(albums),
        active_images=db.scalar(select(func.count()).select_from(Gallery).where(active, Gallery.is_active.is_(True)))
        or 0,
        featured_images=db.scalar(
            select(func.count()).select_from(Gallery).where(active, Gallery.is_featured.is_(True))
        )
        or 0,
        storage_bytes=_storage_bytes(),
    )


@router.get("", response_model=list[GalleryRead])
def list_galleries(_: StaffUser, db: Annotated[Session, Depends(get_db)]) -> list[GalleryRead]:
    rows = db.scalars(
        select(Gallery).where(Gallery.deleted_at.is_(None)).order_by(Gallery.sort_order, Gallery.id.desc())
    ).all()
    dest_ids = {r.destination_id for r in rows if r.destination_id}
    names = {}
    if dest_ids:
        for d in db.scalars(select(Destination).where(Destination.id.in_(dest_ids))).all():
            names[d.id] = d.name
    return [_to_read(r, names.get(r.destination_id)) for r in rows]


@router.post("", response_model=GalleryRead, status_code=status.HTTP_201_CREATED)
def create_gallery(
    payload: GalleryWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> GalleryRead:
    if not payload.image_url:
        raise HTTPException(status_code=400, detail="image_url is required (or use upload endpoint)")
    row = Gallery(
        title=payload.title.strip(),
        description=payload.description,
        image_url=payload.image_url,
        category=payload.category or "Destinations",
        album=payload.album,
        destination_id=payload.destination_id,
        sort_order=payload.sort_order,
        is_featured=payload.is_featured,
        is_active=payload.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    dest_name = None
    if row.destination_id:
        dest = db.get(Destination, row.destination_id)
        dest_name = dest.name if dest else None
    return _to_read(row, dest_name)


@router.post("/upload", response_model=GalleryRead, status_code=status.HTTP_201_CREATED)
async def upload_gallery_image(
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("Destinations"),
    album: Optional[str] = Form(None),
    destination_id: Optional[int] = Form(None),
    is_featured: bool = Form(False),
    is_active: bool = Form(True),
) -> GalleryRead:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type or 'unknown'}")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}[content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    image_url = f"/uploads/gallery/{filename}"

    row = Gallery(
        title=title.strip(),
        description=description,
        image_url=image_url,
        category=category or "Destinations",
        album=album,
        destination_id=destination_id,
        is_featured=is_featured,
        is_active=is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    dest_name = None
    if row.destination_id:
        dest = db.get(Destination, row.destination_id)
        dest_name = dest.name if dest else None
    return _to_read(row, dest_name)


@router.put("/{gallery_id}", response_model=GalleryRead)
def update_gallery(
    gallery_id: int,
    payload: GalleryWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> GalleryRead:
    row = _get_or_404(db, gallery_id)
    row.title = payload.title.strip()
    row.description = payload.description
    if payload.image_url:
        row.image_url = payload.image_url
    row.category = payload.category or "Destinations"
    row.album = payload.album
    row.destination_id = payload.destination_id
    row.sort_order = payload.sort_order
    row.is_featured = payload.is_featured
    row.is_active = payload.is_active
    db.add(row)
    db.commit()
    db.refresh(row)
    dest_name = None
    if row.destination_id:
        dest = db.get(Destination, row.destination_id)
        dest_name = dest.name if dest else None
    return _to_read(row, dest_name)


@router.patch("/{gallery_id}/featured", response_model=GalleryRead)
def set_featured(
    gallery_id: int,
    payload: GalleryFeaturedUpdate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> GalleryRead:
    row = _get_or_404(db, gallery_id)
    row.is_featured = payload.is_featured
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_read(row)


@router.patch("/{gallery_id}/active", response_model=GalleryRead)
def set_active(
    gallery_id: int,
    payload: GalleryActiveUpdate,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> GalleryRead:
    row = _get_or_404(db, gallery_id)
    row.is_active = payload.is_active
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_read(row)


@router.delete("/{gallery_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_gallery(
    gallery_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    row = _get_or_404(db, gallery_id)
    row.deleted_at = datetime.now(timezone.utc)
    row.is_active = False
    db.add(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
