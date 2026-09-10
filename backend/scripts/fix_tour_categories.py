"""Fix tour categories: move non-LX-LOC packages into Domestic Tours."""

from __future__ import annotations

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.enums import PublishStatus
from app.models.tours import Tour, TourCategory


def main() -> None:
    db = get_session_factory()()
    try:
        domestic = db.scalar(
            select(TourCategory).where(
                TourCategory.slug == "domestic-tours",
                TourCategory.deleted_at.is_(None),
            )
        )
        if domestic is None:
            domestic = TourCategory(
                name="Domestic Tours",
                slug="domestic-tours",
                description="Holiday and city packages across India",
                is_active=True,
            )
            db.add(domestic)
            db.flush()
            print("CREATE category Domestic Tours")

        local = db.scalar(
            select(TourCategory).where(
                TourCategory.slug == "local-tours",
                TourCategory.deleted_at.is_(None),
            )
        )

        moved = published = 0
        tours = db.scalars(select(Tour).where(Tour.deleted_at.is_(None))).all()
        for tour in tours:
            code = str(tour.code or "")
            if code.startswith("LX-LOC-"):
                if local is not None and tour.category_id != local.id:
                    tour.category_id = local.id
                continue

            if tour.category_id != domestic.id:
                tour.category_id = domestic.id
                moved += 1
                print("MOVE", code, "-> Domestic Tours")

            if not tour.is_published or tour.status != PublishStatus.PUBLISHED:
                tour.is_published = True
                tour.status = PublishStatus.PUBLISHED
                published += 1
                print("PUBLISH", code)

        db.commit()
        print(f"DONE moved={moved} published={published}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
