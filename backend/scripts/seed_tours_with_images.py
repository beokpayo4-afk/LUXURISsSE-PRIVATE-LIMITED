"""Add more tour packages with cover images; also attach images to existing tours."""

from __future__ import annotations

import uuid
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

# Extra packages beyond the single "{Name} Explorer" drafts.
# Prices are intentionally omitted (None) — set in admin before publish.
EXTRA_PACKAGES = [
    {
        "destination": "Kerala",
        "title": "Kerala Backwaters & Hills",
        "code": "LX-KER-HILL",
        "days": 5,
        "nights": 4,
        "summary": "Kochi, Munnar, and Alleppey-style circuit outline.",
        "seed": 3010,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Goa",
        "title": "Goa Beach Escape",
        "code": "LX-GOA-BEACH",
        "days": 4,
        "nights": 3,
        "summary": "North/South Goa leisure stay outline.",
        "seed": 3020,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Himachal Pradesh",
        "title": "Shimla Manali Hills",
        "code": "LX-HP-HILLS",
        "days": 6,
        "nights": 5,
        "summary": "Shimla–Manali hill-station outline.",
        "seed": 3030,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Uttarakhand",
        "title": "Rishikesh Mussoorie Getaway",
        "code": "LX-UK-GET",
        "days": 4,
        "nights": 3,
        "summary": "Foothills and Ganga-side leisure outline.",
        "seed": 3040,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Delhi",
        "title": "Delhi Heritage Weekend",
        "code": "LX-DEL-WKND",
        "days": 3,
        "nights": 2,
        "summary": "Capital heritage and markets weekend outline.",
        "seed": 3050,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Uttar Pradesh",
        "title": "Agra Varanasi Circuit",
        "code": "LX-UP-CIRC",
        "days": 5,
        "nights": 4,
        "summary": "Taj and ghats circuit outline.",
        "seed": 3060,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Madhya Pradesh",
        "title": "MP Heritage Trail",
        "code": "LX-MP-HER",
        "days": 5,
        "nights": 4,
        "summary": "Bhopal / Khajuraho / wildlife region outline.",
        "seed": 3070,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Mumbai",
        "title": "Mumbai City Break",
        "code": "LX-MUM-CITY",
        "days": 3,
        "nights": 2,
        "summary": "Gateway city leisure and sightseeing outline.",
        "seed": 3080,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Pune",
        "title": "Pune & Lonavala Short Break",
        "code": "LX-PUN-SHORT",
        "days": 3,
        "nights": 2,
        "summary": "City and nearby hill getaway outline.",
        "seed": 3090,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Bengaluru",
        "title": "Bengaluru Weekend",
        "code": "LX-BLR-WKND",
        "days": 3,
        "nights": 2,
        "summary": "Garden city weekend outline.",
        "seed": 3100,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Chennai",
        "title": "Chennai Coastal Stay",
        "code": "LX-CHN-CST",
        "days": 3,
        "nights": 2,
        "summary": "Marina and temple-city leisure outline.",
        "seed": 3110,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Hyderabad",
        "title": "Hyderabad Heritage Stay",
        "code": "LX-HYD-HER",
        "days": 3,
        "nights": 2,
        "summary": "Old city and modern Hyderabad outline.",
        "seed": 3120,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Surat",
        "title": "Surat City Leisure",
        "code": "LX-SUR-CITY",
        "days": 2,
        "nights": 1,
        "summary": "Short Surat leisure outline.",
        "seed": 3130,
        "featured": False,
        "published": False,
    },
    {
        "destination": "Bihar",
        "title": "Bihar Spiritual Circuit",
        "code": "LX-Bih-SPIR",
        "days": 4,
        "nights": 3,
        "summary": "Bodh Gaya and Patna region outline.",
        "seed": 3140,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Jharkhand",
        "title": "Jharkhand Nature Break",
        "code": "LX-JHK-NAT",
        "days": 3,
        "nights": 2,
        "summary": "Ranchi and nearby nature outline.",
        "seed": 3150,
        "featured": False,
        "published": False,
    },
    {
        "destination": "Raipur",
        "title": "Raipur Local Highlights",
        "code": "LX-RPR-LOC",
        "days": 2,
        "nights": 1,
        "summary": "Capital-city local sightseeing outline.",
        "seed": 3160,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Jagdalpur",
        "title": "Bastar Tribal Trail",
        "code": "LX-JGD-BST",
        "days": 4,
        "nights": 3,
        "summary": "Jagdalpur and surrounding Bastar outline.",
        "seed": 3170,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Chitrakote",
        "title": "Chitrakote Falls Stay",
        "code": "LX-CHT-FALL",
        "days": 2,
        "nights": 1,
        "summary": "Falls-side short stay outline.",
        "seed": 3180,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Barnawapara",
        "title": "Barnawapara Wildlife",
        "code": "LX-BRN-WLD",
        "days": 3,
        "nights": 2,
        "summary": "Wildlife sanctuary visit outline.",
        "seed": 3190,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Mainpat",
        "title": "Mainpat Hill Escape",
        "code": "LX-MPT-HILL",
        "days": 3,
        "nights": 2,
        "summary": "Surguja hills short escape outline.",
        "seed": 3200,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Sirpur",
        "title": "Sirpur Heritage Visit",
        "code": "LX-SRP-HER",
        "days": 2,
        "nights": 1,
        "summary": "Heritage site day-trip style outline.",
        "seed": 3210,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Bastar",
        "title": "Bastar Culture Tour",
        "code": "LX-BST-CUL",
        "days": 5,
        "nights": 4,
        "summary": "Culture and nature across Bastar region.",
        "seed": 3220,
        "featured": True,
        "published": True,
    },
    {
        "destination": "Bilaspur",
        "title": "Bilaspur City Circuit",
        "code": "LX-BLP-CITY",
        "days": 2,
        "nights": 1,
        "summary": "Bilaspur local circuit outline.",
        "seed": 3230,
        "featured": False,
        "published": False,
    },
    {
        "destination": "Korba",
        "title": "Korba Industrial Belt Stay",
        "code": "LX-KRB-STAY",
        "days": 2,
        "nights": 1,
        "summary": "Korba stopover outline.",
        "seed": 3240,
        "featured": False,
        "published": False,
    },
    {
        "destination": "Durg-Bhilai",
        "title": "Durg Bhilai Twin City",
        "code": "LX-DBG-TWIN",
        "days": 2,
        "nights": 1,
        "summary": "Twin-city leisure outline.",
        "seed": 3250,
        "featured": False,
        "published": False,
    },
    {
        "destination": "Ambikapur",
        "title": "Ambikapur Mainpat Link",
        "code": "LX-AMB-MPT",
        "days": 3,
        "nights": 2,
        "summary": "Ambikapur base with Mainpat outing outline.",
        "seed": 3260,
        "featured": False,
        "published": True,
    },
    {
        "destination": "Raipur City Circuit",
        "title": "Raipur Weekend Circuit",
        "code": "LX-RPR-WKND",
        "days": 3,
        "nights": 2,
        "summary": "City circuit with nearby day outings.",
        "seed": 3270,
        "featured": False,
        "published": True,
    },
]


def download_image(seed: int, key: str, idx: int) -> str:
    url = f"https://picsum.photos/seed/{seed + idx}/1200/800"
    data = urlopen(Request(url, headers={"User-Agent": "luxurisse-seed/1.0"}), timeout=40).read()
    filename = f"{key}_{idx}_{uuid.uuid4().hex[:8]}.jpg"
    (UPLOAD / filename).write_bytes(data)
    return f"/uploads/tours/{filename}"


def add_images(tour: Tour, seed: int, count: int = 2) -> int:
    if tour.images:
        return 0
    key = slugify(tour.code or tour.title).replace("-", "_")[:40]
    for i in range(count):
        tour.images.append(
            TourImage(
                image_url=download_image(seed, key, i),
                alt_text=f"{tour.title} {i + 1}",
                sort_order=i,
                is_cover=(i == 0),
            )
        )
    return count


def attach_itinerary(tour: Tour, dest: Destination, days: int) -> None:
    if tour.itineraries:
        return
    for day in range(1, days + 1):
        if day == 1:
            title = f"Arrival — {dest.city_name or dest.name}"
            desc = "Meet and assist, check-in, orientation."
        elif day == days:
            title = "Departure"
            desc = "Checkout and onward transfer as scheduled."
        else:
            title = f"Day {day} — Explore {dest.name}"
            desc = "Sightseeing and activities as per confirmed plan."
        tour.itineraries.append(
            TourItinerary(
                day_number=day,
                title=title,
                description=desc,
                meals="Breakfast" if day > 1 else "Dinner (as confirmed)",
            )
        )
    if not tour.inclusions:
        tour.inclusions.extend(
            [
                TourInclusion(item="Accommodation as per itinerary", sort_order=0),
                TourInclusion(item="Transfers as mentioned", sort_order=1),
            ]
        )
    if not tour.exclusions:
        tour.exclusions.extend(
            [
                TourExclusion(item="Airfare / train fare (unless specified)", sort_order=0),
                TourExclusion(item="Personal expenses and tips", sort_order=1),
            ]
        )


def main() -> None:
    db = get_session_factory()()
    created = imaged_existing = skipped = 0
    try:
        # Prefer a domestic/holiday category — never dump India packages into Local Tours.
        category = db.scalar(
            select(TourCategory).where(
                TourCategory.slug == "domestic-tours",
                TourCategory.deleted_at.is_(None),
            )
        )
        if category is None:
            category = db.scalar(
                select(TourCategory).where(
                    TourCategory.name == "Domestic Tours",
                    TourCategory.deleted_at.is_(None),
                )
            )
        if category is None:
            category = TourCategory(
                name="Domestic Tours",
                slug="domestic-tours",
                description="Holiday and city packages across India",
                is_active=True,
            )
            db.add(category)
            db.flush()
            print("CREATE category Domestic Tours")

        dest_by_name = {
            d.name: d
            for d in db.scalars(select(Destination).where(Destination.deleted_at.is_(None))).all()
        }

        # 1) Images for existing tours that have none
        existing_tours = db.scalars(
            select(Tour)
            .options(selectinload(Tour.images))
            .where(Tour.deleted_at.is_(None))
        ).all()
        for tour in existing_tours:
            seed = 4000 + tour.id * 17
            n = add_images(tour, seed, 2)
            if n:
                imaged_existing += 1
                print("IMAGE", tour.title)

        # 2) Extra themed packages
        for item in EXTRA_PACKAGES:
            dest = dest_by_name.get(item["destination"])
            if not dest:
                print("MISS dest", item["destination"])
                skipped += 1
                continue

            existing = db.scalar(
                select(Tour)
                .options(selectinload(Tour.images), selectinload(Tour.itineraries))
                .where(Tour.code == item["code"], Tour.deleted_at.is_(None))
            )
            if existing:
                n = add_images(existing, item["seed"], 2)
                if n:
                    imaged_existing += 1
                    print("IMAGE", existing.title)
                else:
                    skipped += 1
                    print("SKIP", item["code"])
                continue

            title = item["title"]
            slug = slugify(title)
            if db.scalar(select(Tour).where(Tour.slug == slug, Tour.deleted_at.is_(None))):
                slug = f"{slug}-{dest.id}"

            published = bool(item.get("published"))
            tour = Tour(
                category_id=category.id,
                destination_id=dest.id,
                title=title,
                code=item["code"],
                slug=slug,
                summary=item["summary"],
                description=f"{item['summary']} Update details and set pricing before or after publish as needed.",
                highlights="Customize highlights in admin.",
                duration_days=item["days"],
                duration_nights=item["nights"],
                transportation="Private / shared transfers as confirmed at booking.",
                starting_price=None,
                mrp=None,
                discount=None,
                is_featured=bool(item.get("featured")),
                is_published=published,
                status=PublishStatus.PUBLISHED if published else PublishStatus.DRAFT,
            )
            db.add(tour)
            db.flush()
            attach_itinerary(tour, dest, item["days"])
            add_images(tour, item["seed"], 2)
            created += 1
            print("CREATE", tour.title)

        db.commit()
        total = len(db.scalars(select(Tour).where(Tour.deleted_at.is_(None))).all())
        img_total = len(db.scalars(select(TourImage)).all())
        print(
            f"DONE created={created} imaged_existing={imaged_existing} "
            f"skipped={skipped} total_tours={total} total_images={img_total}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
