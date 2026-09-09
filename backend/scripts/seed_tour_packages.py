"""Seed one draft tour package per destination (no invented prices)."""

from __future__ import annotations

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.destinations import Destination
from app.models.enums import PublishStatus
from app.models.tours import Tour, TourCategory, TourExclusion, TourInclusion, TourItinerary
from app.services.tour_service import slugify


def _code_for(name: str, destination_id: int) -> str:
    base = "".join(ch for ch in name.upper() if ch.isalnum())[:8] or "DEST"
    return f"LX-{base}-{destination_id:03d}"


def main() -> None:
    db = get_session_factory()()
    try:
        category = db.scalar(select(TourCategory).where(TourCategory.deleted_at.is_(None)).limit(1))
        if not category:
            raise SystemExit("No tour category found. Create Domestic Tours first.")

        destinations = db.scalars(
            select(Destination).where(Destination.deleted_at.is_(None)).order_by(Destination.name)
        ).all()

        created = 0
        skipped = 0
        for dest in destinations:
            existing = db.scalar(
                select(Tour).where(
                    Tour.destination_id == dest.id,
                    Tour.deleted_at.is_(None),
                ).limit(1)
            )
            if existing:
                skipped += 1
                continue

            title = f"{dest.name} Explorer"
            code = _code_for(dest.name, dest.id)
            slug = slugify(title)
            # Ensure unique slug if name collision
            clash = db.scalar(select(Tour).where(Tour.slug == slug, Tour.deleted_at.is_(None)))
            if clash:
                slug = f"{slug}-{dest.id}"

            tour = Tour(
                category_id=category.id,
                destination_id=dest.id,
                title=title,
                code=code,
                slug=slug,
                summary=dest.summary or f"Draft package for {dest.name}. Pricing to be set by admin.",
                description=dest.description
                or f"Placeholder tour package for {dest.name}. Update itinerary and pricing before publishing.",
                highlights="Customize highlights before publishing.",
                duration_days=3,
                duration_nights=2,
                meal_plan=None,
                transportation="Private / shared transfers as confirmed at booking.",
                starting_price=None,
                mrp=None,
                discount=None,
                is_featured=False,
                is_published=False,
                status=PublishStatus.DRAFT,
            )
            db.add(tour)
            db.flush()

            db.add_all(
                [
                    TourItinerary(
                        tour_id=tour.id,
                        day_number=1,
                        title=f"Arrival in {dest.city_name or dest.name}",
                        description="Meet and assist, hotel check-in, local orientation.",
                        meals="Dinner (as confirmed)",
                    ),
                    TourItinerary(
                        tour_id=tour.id,
                        day_number=2,
                        title=f"Explore {dest.name}",
                        description="Sightseeing and activities based on confirmed itinerary.",
                        meals="Breakfast",
                    ),
                    TourItinerary(
                        tour_id=tour.id,
                        day_number=3,
                        title="Departure",
                        description="Checkout and transfer to airport/rail as scheduled.",
                        meals="Breakfast",
                    ),
                    TourInclusion(tour_id=tour.id, item="Accommodation as per itinerary", sort_order=0),
                    TourInclusion(tour_id=tour.id, item="Transfers as mentioned", sort_order=1),
                    TourExclusion(tour_id=tour.id, item="Airfare / train fare (unless specified)", sort_order=0),
                    TourExclusion(tour_id=tour.id, item="Personal expenses and tips", sort_order=1),
                ]
            )
            created += 1

        db.commit()
        total = len(db.scalars(select(Tour).where(Tour.deleted_at.is_(None))).all())
        print(f"created={created} skipped={skipped} total_tours={total} destinations={len(destinations)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
