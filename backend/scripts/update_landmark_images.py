"""Replace placeholder gallery/destination images with proper landmark photos."""

from __future__ import annotations

import uuid
from urllib.request import Request, urlopen

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import BACKEND_ROOT
from app.db.session import get_session_factory
from app.models.destinations import Destination, DestinationImage
from app.models.marketing import Gallery

GALLERY_UPLOAD = BACKEND_ROOT / "uploads" / "gallery"
DEST_UPLOAD = BACKEND_ROOT / "uploads" / "destinations"

# Unsplash — free to use under Unsplash License (landmark photos)
UPDATES = [
    {
        "gallery_title": "Taj Mahal Dawn",
        "destination_name": "Uttar Pradesh",
        "url": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85&auto=format&fit=crop",
        "key": "taj_mahal",
    },
    {
        "gallery_title": "Delhi India Gate",
        "destination_name": "Delhi",
        "url": "https://images.unsplash.com/photo-1743136648410-a73d5c9dbaab?w=1400&q=85&auto=format&fit=crop",
        "key": "india_gate",
    },
    {
        "gallery_title": "Goa Beach Sunset",
        "destination_name": "Goa",
        "url": "https://images.unsplash.com/photo-1727193120023-12c48606b803?w=1400&q=85&auto=format&fit=crop",
        "key": "goa_beach",
    },
    {
        "gallery_title": "Mumbai Skyline",
        "destination_name": "Mumbai",
        "url": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1400&q=85&auto=format&fit=crop",
        "key": "mumbai_skyline",
    },
]


def download(url: str, folder, key: str) -> str:
    folder.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={"User-Agent": "LuxurisseImageUpdater/1.0"})
    data = urlopen(req, timeout=60).read()
    filename = f"{key}_{uuid.uuid4().hex[:8]}.jpg"
    (folder / filename).write_bytes(data)
    subfolder = folder.name
    return f"/uploads/{subfolder}/{filename}"


def main() -> None:
    db = get_session_factory()()
    try:
        for item in UPDATES:
            url_path = download(item["url"], GALLERY_UPLOAD, item["key"])
            print("DOWNLOADED", item["gallery_title"], "->", url_path)

            gallery = db.scalar(
                select(Gallery).where(Gallery.title == item["gallery_title"], Gallery.deleted_at.is_(None))
            )
            if gallery:
                gallery.image_url = url_path
                db.add(gallery)
                print("  updated gallery id", gallery.id)

            dest = db.scalar(
                select(Destination)
                .options(selectinload(Destination.images))
                .where(Destination.name == item["destination_name"], Destination.deleted_at.is_(None))
            )
            if dest:
                dest_url = download(item["url"], DEST_UPLOAD, f"dest_{item['key']}")
                if dest.images:
                    cover = next((i for i in dest.images if i.is_cover), dest.images[0])
                    cover.image_url = dest_url
                    cover.alt_text = item["gallery_title"]
                else:
                    dest.images.append(
                        DestinationImage(
                            image_url=dest_url,
                            alt_text=item["gallery_title"],
                            sort_order=0,
                            is_cover=True,
                        )
                    )
                db.add(dest)
                print("  updated destination", dest.name)

        db.commit()
        print("DONE — landmark images updated.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
