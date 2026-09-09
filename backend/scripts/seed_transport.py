"""Seed Luxurisse transport fleet (vehicles + services). Prices left null until confirmed."""

from __future__ import annotations

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.transport import TransportService, Vehicle

FLEET = [
    {
        "vehicle": {
            "name": "Swift Dzire AC",
            "vehicle_type": "sedan",
            "registration_number": "CG-04-LX-1001",
            "capacity": 4,
            "description": "Compact AC sedan for city transfers from Raipur.",
        },
        "services": [
            {
                "name": "Raipur Airport Transfer (Sedan)",
                "service_type": "airport_transfer",
                "description": "One-way airport pickup / drop in Raipur. Fare on confirmation.",
            },
            {
                "name": "Raipur Local Half Day (Sedan)",
                "service_type": "local_sightseeing",
                "description": "Half-day local sightseeing around Raipur.",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Honda City AC",
            "vehicle_type": "sedan",
            "registration_number": "CG-04-LX-1002",
            "capacity": 4,
            "description": "Comfort sedan for guests and outstation day trips.",
        },
        "services": [
            {
                "name": "Outstation Day Trip (Sedan)",
                "service_type": "outstation",
                "description": "Day outstation run (fuel / toll as confirmed).",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Innova Crysta",
            "vehicle_type": "suv",
            "registration_number": "CG-04-LX-2001",
            "capacity": 6,
            "description": "Family SUV for Bastar / Chitrakote circuits.",
        },
        "services": [
            {
                "name": "Raipur Airport Transfer (Innova)",
                "service_type": "airport_transfer",
                "description": "Airport transfer in Innova Crysta.",
            },
            {
                "name": "Bastar / Chitrakote Package Cab",
                "service_type": "tour_cab",
                "description": "Multi-day cab for Jagdalpur / Chitrakote packages.",
            },
            {
                "name": "Raipur Local Full Day (SUV)",
                "service_type": "local_sightseeing",
                "description": "Full-day local with driver.",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Toyota Fortuner",
            "vehicle_type": "suv",
            "registration_number": "CG-04-LX-2002",
            "capacity": 6,
            "description": "Premium SUV for VIP / family travel.",
        },
        "services": [
            {
                "name": "Premium Outstation (Fortuner)",
                "service_type": "outstation",
                "description": "Premium outstation hire. Rates on enquiry.",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Force Traveller 12",
            "vehicle_type": "tempo",
            "registration_number": "CG-04-LX-3001",
            "capacity": 12,
            "description": "Group tempo for family / corporate tours from Raipur.",
        },
        "services": [
            {
                "name": "Group Tour Tempo (12 seater)",
                "service_type": "group_tour",
                "description": "12-seater for group packages across Chhattisgarh.",
            },
            {
                "name": "Wedding / Event Shuttle",
                "service_type": "event",
                "description": "Local shuttle for events. Schedule on confirmation.",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Tempo Traveller 17",
            "vehicle_type": "tempo",
            "registration_number": "CG-04-LX-3002",
            "capacity": 17,
            "description": "Large group vehicle for longer circuits.",
        },
        "services": [
            {
                "name": "Grand Circuit Group Cab",
                "service_type": "group_tour",
                "description": "Raipur → Sirpur / Barnawapara / Bastar group movement.",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Urbania Luxury Van",
            "vehicle_type": "van",
            "registration_number": "CG-04-LX-4001",
            "capacity": 9,
            "description": "Luxury van for premium group transfers.",
        },
        "services": [
            {
                "name": "Luxury Van Transfer",
                "service_type": "transfer",
                "description": "Premium group transfer. Pricing on request.",
            },
        ],
    },
    {
        "vehicle": {
            "name": "Ertiga AC",
            "vehicle_type": "muv",
            "registration_number": "CG-04-LX-2003",
            "capacity": 6,
            "description": "Compact MUV for family local / short outstation.",
        },
        "services": [
            {
                "name": "Family Local Cab (Ertiga)",
                "service_type": "local_sightseeing",
                "description": "Family-friendly local and short trips.",
            },
        ],
    },
]


def main() -> None:
    db = get_session_factory()()
    vehicles_created = services_created = skipped = 0
    try:
        for item in FLEET:
            vdata = item["vehicle"]
            vehicle = db.scalar(
                select(Vehicle).where(
                    Vehicle.registration_number == vdata["registration_number"],
                    Vehicle.deleted_at.is_(None),
                )
            )
            if not vehicle:
                vehicle = Vehicle(
                    name=vdata["name"],
                    vehicle_type=vdata["vehicle_type"],
                    registration_number=vdata["registration_number"],
                    capacity=vdata["capacity"],
                    description=vdata["description"],
                    is_active=True,
                )
                db.add(vehicle)
                db.flush()
                vehicles_created += 1
                print("CREATE vehicle", vdata["name"])
            else:
                skipped += 1
                print("SKIP vehicle", vdata["name"])

            for svc in item["services"]:
                existing = db.scalar(
                    select(TransportService).where(
                        TransportService.name == svc["name"],
                        TransportService.deleted_at.is_(None),
                    )
                )
                if existing:
                    if existing.vehicle_id is None:
                        existing.vehicle_id = vehicle.id
                        db.add(existing)
                    print("SKIP service", svc["name"])
                    continue

                db.add(
                    TransportService(
                        vehicle_id=vehicle.id,
                        name=svc["name"],
                        service_type=svc["service_type"],
                        description=svc["description"],
                        price_per_day=None,
                        price_per_trip=None,
                        currency="INR",
                        is_active=True,
                    )
                )
                services_created += 1
                print("CREATE service", svc["name"])

        db.commit()
        total_v = len(db.scalars(select(Vehicle).where(Vehicle.deleted_at.is_(None))).all())
        total_s = len(db.scalars(select(TransportService).where(TransportService.deleted_at.is_(None))).all())
        print(
            f"DONE vehicles_created={vehicles_created} services_created={services_created} "
            f"skipped_vehicles={skipped} total_vehicles={total_v} total_services={total_s}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
