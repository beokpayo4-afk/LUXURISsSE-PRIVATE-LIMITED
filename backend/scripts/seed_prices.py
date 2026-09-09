"""Set indicative starting prices on published tours and transport (admin can change later)."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.tours import Tour
from app.models.transport import TransportService

# Local Chhattisgarh packages — starting_price, mrp (optional)
LOCAL_PRICES: dict[str, tuple[int, int]] = {
    "LX-LOC-RPR-DAY": (2499, 2999),
    "LX-LOC-RPR-WKND": (4999, 5999),
    "LX-LOC-JGD-BST": (7999, 9499),
    "LX-LOC-CHT-FALL": (5499, 6499),
    "LX-LOC-BST-CUL": (10999, 12999),
    "LX-LOC-SRP-HER": (4499, 5499),
    "LX-LOC-BRN-SAF": (4999, 5999),
    "LX-LOC-MPT-HILL": (4999, 5999),
    "LX-LOC-AMB-MPT": (7499, 8999),
    "LX-LOC-BLP-LOC": (3999, 4999),
    "LX-LOC-KRB-STAY": (1999, 2499),
    "LX-LOC-DBG-CITY": (3999, 4999),
    "LX-LOC-CG-GRAND": (22999, 26999),
}

# Default by duration (days) for other published tours
DURATION_PRICE: list[tuple[int, int, int]] = [
    (1, 4999, 5999),
    (2, 8999, 10999),
    (3, 12999, 14999),
    (4, 15999, 18999),
    (5, 17999, 20999),
    (6, 20999, 24999),
    (7, 24999, 28999),
]

TRANSPORT_PRICES: dict[str, tuple[int | None, int | None]] = {
    "Raipur Airport Transfer (Sedan)": (None, 999),
    "Raipur Local Half Day (Sedan)": (1499, None),
    "Outstation Day Trip (Sedan)": (3499, None),
    "Raipur Airport Transfer (Innova)": (None, 1499),
    "Bastar / Chitrakote Package Cab": (4499, None),
    "Raipur Local Full Day (SUV)": (2999, None),
    "Premium Outstation (Fortuner)": (5499, None),
    "Group Tour Tempo (12 seater)": (6999, None),
    "Wedding / Event Shuttle": (4999, None),
    "Grand Circuit Group Cab": (7999, None),
    "Luxury Van Transfer": (5999, None),
    "Family Local Cab (Ertiga)": (2499, None),
}


def price_for_days(days: int) -> tuple[int, int]:
    d = max(days or 1, 1)
    for max_days, start, mrp in DURATION_PRICE:
        if d <= max_days:
            return start, mrp
    return 29999, 34999


def main() -> None:
    db = get_session_factory()()
    tours_updated = transport_updated = 0
    try:
        tours = db.scalars(select(Tour).where(Tour.deleted_at.is_(None), Tour.is_published.is_(True))).all()
        for tour in tours:
            if tour.starting_price is not None:
                continue
            if tour.code in LOCAL_PRICES:
                start, mrp = LOCAL_PRICES[tour.code]
            else:
                start, mrp = price_for_days(tour.duration_days or 1)
            tour.starting_price = Decimal(start)
            tour.mrp = Decimal(mrp)
            tour.discount = Decimal(str(round((1 - start / mrp) * 100, 1))) if mrp > start else None
            db.add(tour)
            tours_updated += 1
            print("PRICE tour", tour.code or tour.title, start)

        services = db.scalars(
            select(TransportService).where(TransportService.deleted_at.is_(None))
        ).all()
        for svc in services:
            if svc.price_per_day is not None or svc.price_per_trip is not None:
                continue
            rates = TRANSPORT_PRICES.get(svc.name)
            if not rates:
                if svc.service_type == "airport_transfer":
                    rates = (None, 1200)
                elif svc.service_type == "local_sightseeing":
                    rates = (1999, None)
                elif svc.service_type == "group_tour":
                    rates = (6500, None)
                else:
                    rates = (3499, None)
            day, trip = rates
            svc.price_per_day = Decimal(day) if day else None
            svc.price_per_trip = Decimal(trip) if trip else None
            db.add(svc)
            transport_updated += 1
            print("PRICE transport", svc.name, day, trip)

        db.commit()
        all_published = db.scalars(
            select(Tour).where(Tour.deleted_at.is_(None), Tour.is_published.is_(True))
        ).all()
        with_price = sum(1 for t in all_published if t.starting_price is not None)
        print(
            f"DONE tours_updated={tours_updated} transport_updated={transport_updated} "
            f"published_with_price={with_price}/{len(all_published)}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
