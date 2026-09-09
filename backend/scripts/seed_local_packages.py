"""Seed Chhattisgarh local tour packages with images (no invented prices)."""

from __future__ import annotations

import uuid
from decimal import Decimal
from urllib.request import Request, urlopen

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import BACKEND_ROOT
from app.db.session import get_session_factory
from app.models.destinations import Destination
from app.models.enums import PublishStatus
from app.models.tours import (
    Tour,
    TourCategory,
    TourExclusion,
    TourImage,
    TourInclusion,
    TourItinerary,
)
from app.services.tour_service import slugify

UPLOAD = BACKEND_ROOT / "uploads" / "tours"
UPLOAD.mkdir(parents=True, exist_ok=True)

LOCAL_PACKAGES = [
    {
        "destination": "Raipur",
        "title": "Raipur City Day Tour",
        "code": "LX-LOC-RPR-DAY",
        "days": 1,
        "nights": 0,
        "summary": "Local Raipur city sightseeing from Telghani Naka base.",
        "featured": True,
        "seed": 8010,
    },
    {
        "destination": "Raipur City Circuit",
        "title": "Raipur Weekend Getaway",
        "code": "LX-LOC-RPR-WKND",
        "days": 3,
        "nights": 2,
        "summary": "Weekend circuit covering Raipur and nearby attractions.",
        "featured": True,
        "seed": 8020,
    },
    {
        "destination": "Jagdalpur",
        "title": "Jagdalpur Bastar Discovery",
        "code": "LX-LOC-JGD-BST",
        "days": 4,
        "nights": 3,
        "summary": "Explore Jagdalpur markets, tribal culture, and Bastar region.",
        "featured": True,
        "seed": 8030,
    },
    {
        "destination": "Chitrakote",
        "title": "Chitrakote Falls Package",
        "code": "LX-LOC-CHT-FALL",
        "days": 2,
        "nights": 1,
        "summary": "Short stay at India's widest waterfall — Chitrakote.",
        "featured": True,
        "seed": 8040,
    },
    {
        "destination": "Bastar",
        "title": "Bastar Culture & Nature",
        "code": "LX-LOC-BST-CUL",
        "days": 5,
        "nights": 4,
        "summary": "Bastar tribal heritage, forests, and local experiences.",
        "featured": True,
        "seed": 8050,
    },
    {
        "destination": "Sirpur",
        "title": "Sirpur Heritage Tour",
        "code": "LX-LOC-SRP-HER",
        "days": 2,
        "nights": 1,
        "summary": "Ancient Sirpur archaeological and temple circuit.",
        "featured": False,
        "seed": 8060,
    },
    {
        "destination": "Barnawapara",
        "title": "Barnawapara Safari Package",
        "code": "LX-LOC-BRN-SAF",
        "days": 3,
        "nights": 2,
        "summary": "Wildlife sanctuary visit with local stay options.",
        "featured": True,
        "seed": 8070,
    },
    {
        "destination": "Mainpat",
        "title": "Mainpat Hill Package",
        "code": "LX-LOC-MPT-HILL",
        "days": 3,
        "nights": 2,
        "summary": "Mainpat plateau — mini Switzerland of Chhattisgarh.",
        "featured": False,
        "seed": 8080,
    },
    {
        "destination": "Ambikapur",
        "title": "Ambikapur & Mainpat Link",
        "code": "LX-LOC-AMB-MPT",
        "days": 3,
        "nights": 2,
        "summary": "Ambikapur base with Mainpat hill outing.",
        "featured": False,
        "seed": 8090,
    },
    {
        "destination": "Bilaspur",
        "title": "Bilaspur Local Tour",
        "code": "LX-LOC-BLP-LOC",
        "days": 2,
        "nights": 1,
        "summary": "Bilaspur city and nearby local sightseeing.",
        "featured": False,
        "seed": 8100,
    },
    {
        "destination": "Korba",
        "title": "Korba Stopover Package",
        "code": "LX-LOC-KRB-STAY",
        "days": 2,
        "nights": 1,
        "summary": "Korba region short stay and local transfer support.",
        "featured": False,
        "seed": 8110,
    },
    {
        "destination": "Durg-Bhilai",
        "title": "Durg Bhilai City Package",
        "code": "LX-LOC-DBG-CITY",
        "days": 2,
        "nights": 1,
        "summary": "Twin-city Durg and Bhilai local circuit.",
        "featured": False,
        "seed": 8120,
    },
    {
        "destination": "Raipur",
        "title": "Chhattisgarh Grand Circuit",
        "code": "LX-LOC-CG-GRAND",
        "days": 7,
        "nights": 6,
        "summary": "Raipur → Barnawapara → Jagdalpur → Chitrakote → Sirpur highlights.",
        "featured": True,
        "seed": 8130,
    },
]


def download_image(seed: int, key: str, idx: int = 0) -> str:
    url = f"https://picsum.photos/seed/{seed + idx}/1200/800"
    data = urlopen(Request(url, headers={"User-Agent": "luxurisse-seed/1.0"}), timeout=40).read()
    filename = f"{key}_{idx}_{uuid.uuid4().hex[:8]}.jpg"
    (UPLOAD / filename).write_bytes(data)
    return f"/uploads/tours/{filename}"


def add_images(tour: Tour, dest: Destination, key: str, seed: int) -> None:
    urls: list[str] = []
    for img in sorted(dest.images, key=lambda i: (not i.is_cover, i.sort_order)):
        if not img.image_url or img.image_url in urls:
            continue
        src = BACKEND_ROOT / img.image_url.lstrip("/")
        if src.exists():
            filename = f"{key}_{len(urls)}_{uuid.uuid4().hex[:8]}.jpg"
            (UPLOAD / filename).write_bytes(src.read_bytes())
            urls.append(f"/uploads/tours/{filename}")
        elif not urls:
            urls.append(img.image_url)
        if len(urls) >= 2:
            break
    if not urls:
        try:
            urls.append(download_image(seed, key, 0))
        except Exception:
            pass
    for i, url in enumerate(urls):
        tour.images.append(
            TourImage(
                image_url=url,
                alt_text=f"{tour.title} {i + 1}",
                sort_order=i,
                is_cover=(i == 0),
            )
        )


def attach_itinerary(tour: Tour, dest: Destination, days: int) -> None:
    for day in range(1, max(days, 1) + 1):
        if day == 1:
            title = f"Start — {dest.city_name or dest.name}"
            desc = "Pickup from Raipur / local point. Check-in and orientation."
        elif day == days:
            title = "Return / Departure"
            desc = "Checkout and transfer as per plan."
        else:
            title = f"Day {day} — {dest.name} sightseeing"
            desc = "Local visits and activities as per confirmed itinerary."
        tour.itineraries.append(
            TourItinerary(
                day_number=day,
                title=title,
                description=desc,
                meals="Breakfast" if day > 1 else "Dinner (as confirmed)",
            )
        )
    tour.inclusions.extend(
        [
            TourInclusion(item="Local transfers as per itinerary", sort_order=0),
            TourInclusion(item="Accommodation (nights as per package)", sort_order=1),
            TourInclusion(item="Driver / guide support where mentioned", sort_order=2),
        ]
    )
    tour.exclusions.extend(
        [
            TourExclusion(item="Personal expenses", sort_order=0),
            TourExclusion(item="Entry tickets unless specified", sort_order=1),
            TourExclusion(item="Meals not mentioned in itinerary", sort_order=2),
        ]
    )


def main() -> None:
    db = get_session_factory()()
    created = skipped = published = 0
    try:
        category = db.scalar(
            select(TourCategory).where(TourCategory.slug == "local-tours", TourCategory.deleted_at.is_(None))
        )
        if not category:
            category = db.scalar(
                select(TourCategory).where(TourCategory.name == "Local Tours", TourCategory.deleted_at.is_(None))
            )
        if not category:
            category = TourCategory(
                name="Local Tours",
                slug="local-tours",
                description="Chhattisgarh and nearby local packages from Raipur.",
                is_active=True,
            )
            db.add(category)
            db.flush()
            print("CREATE category Local Tours")

        dest_by_name = {
            d.name: d
            for d in db.scalars(
                select(Destination)
                .options(selectinload(Destination.images))
                .where(Destination.deleted_at.is_(None), Destination.state == "Chhattisgarh")
            ).all()
        }

        for item in LOCAL_PACKAGES:
            dest = dest_by_name.get(item["destination"])
            if not dest:
                print("MISS", item["destination"])
                continue

            existing = db.scalar(
                select(Tour)
                .options(selectinload(Tour.images))
                .where(Tour.code == item["code"], Tour.deleted_at.is_(None))
            )
            if existing:
                if not existing.is_published:
                    existing.is_published = True
                    existing.status = PublishStatus.PUBLISHED
                    existing.category_id = category.id
                    db.add(existing)
                    published += 1
                skipped += 1
                print("SKIP", item["code"])
                continue

            slug = slugify(item["title"])
            if db.scalar(select(Tour).where(Tour.slug == slug, Tour.deleted_at.is_(None))):
                slug = f"{slug}-{dest.id}"

            tour = Tour(
                category_id=category.id,
                destination_id=dest.id,
                title=item["title"],
                code=item["code"],
                slug=slug,
                summary=item["summary"],
                description=(
                    f"{item['summary']} Operated by LUXURISSE PRIVATE LIMITED from Raipur. "
                    "Set final pricing in admin before customer booking."
                ),
                highlights="Local guide, curated CG routes, flexible group sizes.",
                duration_days=item["days"],
                duration_nights=item["nights"],
                transportation="Private / shared vehicle from Raipur or destination.",
                meal_plan="MAP (as confirmed)",
                starting_price=None,
                mrp=None,
                discount=None,
                is_featured=item["featured"],
                is_published=True,
                status=PublishStatus.PUBLISHED,
            )
            db.add(tour)
            db.flush()
            attach_itinerary(tour, dest, item["days"])

            key = item["code"].lower().replace("-", "_")
            add_images(tour, dest, key, item["seed"])

            created += 1
            print("CREATE", item["title"])

        db.commit()
        local_count = db.scalar(
            select(Tour)
            .join(Destination, Tour.destination_id == Destination.id)
            .where(Tour.deleted_at.is_(None), Destination.state == "Chhattisgarh")
        )
        total = len(db.scalars(select(Tour).where(Tour.deleted_at.is_(None))).all())
        print(f"DONE created={created} republished={published} skipped={skipped} total_tours={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
