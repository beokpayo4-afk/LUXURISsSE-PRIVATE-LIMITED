"""Seed gallery images for admin / site preview."""

from __future__ import annotations

import uuid
from urllib.request import Request, urlopen

from sqlalchemy import select

from app.core.config import BACKEND_ROOT
from app.db.session import get_session_factory
from app.models.destinations import Destination
from app.models.marketing import Gallery

UPLOAD = BACKEND_ROOT / "uploads" / "gallery"
UPLOAD.mkdir(parents=True, exist_ok=True)

# Real landmark photos (Unsplash — free license)
LANDMARK_URLS = {
    "Goa Beach Sunset": "https://images.unsplash.com/photo-1727193120023-12c48606b803?w=1400&q=85&auto=format&fit=crop",
    "Taj Mahal Dawn": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85&auto=format&fit=crop",
    "Delhi India Gate": "https://images.unsplash.com/photo-1743136648410-a73d5c9dbaab?w=1400&q=85&auto=format&fit=crop",
    "Mumbai Skyline": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1400&q=85&auto=format&fit=crop",
}

ITEMS = [
    ("Kerala Backwaters", "Houseboat and canal views", "Kerala", "Destinations", "India Highlights", True, 6010),
    ("Munnar Tea Hills", "Hill station greenery", "Kerala", "Destinations", "India Highlights", False, 6020),
    ("Goa Beach Sunset", "Coastal leisure moments", "Goa", "Destinations", "Beach Escapes", True, 6030),
    ("Shimla Ridge Walk", "Mall Road and mountain air", "Himachal Pradesh", "Destinations", "Hill Stations", True, 6040),
    ("Manali Valley", "Snow peaks and pine forests", "Himachal Pradesh", "Activities", "Hill Stations", False, 6050),
    ("Rishikesh Ghat", "Ganga-side evenings", "Uttarakhand", "Destinations", "Spiritual Trails", False, 6060),
    ("Taj Mahal Dawn", "Agra heritage visit", "Uttar Pradesh", "Destinations", "Heritage India", True, 6070),
    ("Delhi India Gate", "Capital city landmarks", "Delhi", "Destinations", "Heritage India", False, 6080),
    ("Mumbai Skyline", "Gateway city energy", "Mumbai", "Destinations", "City Breaks", False, 6090),
    ("Chitrakote Falls", "Bastar waterfall vistas", "Chitrakote", "Destinations", "Chhattisgarh", True, 6100),
    ("Barnawapara Trail", "Wildlife sanctuary paths", "Barnawapara", "Activities", "Chhattisgarh", False, 6110),
    ("Mainpat Plateau", "Surguja hill escape", "Mainpat", "Destinations", "Chhattisgarh", False, 6120),
    ("Raipur City Lights", "Capital of Chhattisgarh", "Raipur", "Destinations", "Chhattisgarh", False, 6130),
    ("Jagdalpur Market", "Bastar culture streetscapes", "Jagdalpur", "Destinations", "Chhattisgarh", False, 6140),
    ("Hyderabad Charminar", "Old city heritage", "Hyderabad", "Destinations", "City Breaks", False, 6150),
    ("Bengaluru Gardens", "Garden city greenery", "Bengaluru", "Hotels", "City Breaks", False, 6160),
]


def download_image(seed: int, key: str, title: str | None = None) -> str:
    if title and title in LANDMARK_URLS:
        url = LANDMARK_URLS[title]
    else:
        url = f"https://picsum.photos/seed/{seed}/1400/900"
    data = urlopen(Request(url, headers={"User-Agent": "luxurisse-seed/1.0"}), timeout=60).read()
    filename = f"{key}_{uuid.uuid4().hex[:8]}.jpg"
    (UPLOAD / filename).write_bytes(data)
    return f"/uploads/gallery/{filename}"


def main() -> None:
    db = get_session_factory()()
    created = skipped = 0
    try:
        dest_by_name = {
            d.name: d
            for d in db.scalars(select(Destination).where(Destination.deleted_at.is_(None))).all()
        }

        for i, (title, description, dest_name, category, album, featured, seed) in enumerate(ITEMS):
            existing = db.scalar(
                select(Gallery).where(Gallery.title == title, Gallery.deleted_at.is_(None))
            )
            if existing:
                existing.category = category
                existing.album = album
                existing.is_featured = featured
                if dest_by_name.get(dest_name):
                    existing.destination_id = dest_by_name[dest_name].id
                db.add(existing)
                skipped += 1
                print("SKIP", title)
                continue

            dest = dest_by_name.get(dest_name)
            key = title.lower().replace(" ", "_")[:40]
            db.add(
                Gallery(
                    title=title,
                    description=f"[SAMPLE] {description}",
                    image_url=download_image(seed, key, title),
                    category=category,
                    album=album,
                    destination_id=dest.id if dest else None,
                    sort_order=i,
                    is_featured=featured,
                    is_active=True,
                )
            )
            created += 1
            print("CREATE", title)

        db.commit()
        total = len(db.scalars(select(Gallery).where(Gallery.deleted_at.is_(None))).all())
        print(f"DONE created={created} skipped={skipped} total={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
