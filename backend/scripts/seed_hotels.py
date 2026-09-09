"""Seed sample hotels (with cover images + rooms). Room rates left null until confirmed."""

from __future__ import annotations

import uuid
from urllib.request import Request, urlopen

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import BACKEND_ROOT
from app.db.session import get_session_factory
from app.models.hotels import Hotel, HotelRoom

UPLOAD = BACKEND_ROOT / "uploads" / "hotels"
UPLOAD.mkdir(parents=True, exist_ok=True)

HOTELS = [
    {
        "name": "Raipur Central Stay",
        "city": "Raipur",
        "address": "Near Telghani Naka, Raipur",
        "stars": 3,
        "amenities": "Wi-Fi, AC, Restaurant, Parking",
        "seed": 5010,
        "rooms": [("Deluxe Twin", "deluxe", 2), ("Family Room", "family", 4)],
    },
    {
        "name": "Bastar Heritage Inn",
        "city": "Jagdalpur",
        "address": "Jagdalpur city centre",
        "stars": 3,
        "amenities": "Wi-Fi, Restaurant, Local transfers desk",
        "seed": 5020,
        "rooms": [("Standard Double", "standard", 2), ("Suite", "suite", 3)],
    },
    {
        "name": "Chitrakote River View",
        "city": "Chitrakote",
        "address": "Near Chitrakote Falls approach",
        "stars": 2,
        "amenities": "River view, Restaurant, Parking",
        "seed": 5030,
        "rooms": [("Cottage", "cottage", 2), ("Family Cottage", "cottage", 4)],
    },
    {
        "name": "Kochi Harbour Hotel",
        "city": "Kochi",
        "address": "Ernakulam waterfront area",
        "stars": 4,
        "amenities": "Wi-Fi, Pool, Breakfast, Airport transfer desk",
        "seed": 5040,
        "rooms": [("Sea View", "deluxe", 2), ("Executive", "executive", 2)],
    },
    {
        "name": "Alleppey Backwater Resort",
        "city": "Alappuzha",
        "address": "Backwater canal side",
        "stars": 4,
        "amenities": "Houseboat desk, Restaurant, AC rooms",
        "seed": 5050,
        "rooms": [("Garden Villa", "villa", 2), ("Lake Cottage", "cottage", 3)],
    },
    {
        "name": "Goa Palm Beach Stay",
        "city": "Goa",
        "address": "Calangute / Baga belt",
        "stars": 3,
        "amenities": "Pool, Beach access desk, Cafe",
        "seed": 5060,
        "rooms": [("Garden Room", "standard", 2), ("Pool View", "deluxe", 2)],
    },
    {
        "name": "Shimla Ridge Hotel",
        "city": "Shimla",
        "address": "Near Mall Road",
        "stars": 3,
        "amenities": "Heating, Restaurant, Mountain view",
        "seed": 5070,
        "rooms": [("Valley View", "deluxe", 2), ("Family Suite", "suite", 4)],
    },
    {
        "name": "Manali Pine Lodge",
        "city": "Manali",
        "address": "Old Manali / Mall Road area",
        "stars": 3,
        "amenities": "Heating, Cafe, Trek desk",
        "seed": 5080,
        "rooms": [("Pine Room", "standard", 2), ("Cottage", "cottage", 3)],
    },
    {
        "name": "Rishikesh Ganga Stay",
        "city": "Rishikesh",
        "address": "Near Laxman Jhula approach",
        "stars": 3,
        "amenities": "Yoga desk, Cafe, River proximity",
        "seed": 5090,
        "rooms": [("River Room", "deluxe", 2), ("Dorm Twin", "standard", 2)],
    },
    {
        "name": "Delhi Capital Suites",
        "city": "New Delhi",
        "address": "Central Delhi / Connaught Place belt",
        "stars": 4,
        "amenities": "Wi-Fi, Breakfast, Business desk",
        "seed": 5100,
        "rooms": [("Executive", "executive", 2), ("Premier Suite", "suite", 3)],
    },
    {
        "name": "Agra Taj View Inn",
        "city": "Agra",
        "address": "Taj East Gate area",
        "stars": 3,
        "amenities": "Restaurant, Parking, Tour desk",
        "seed": 5110,
        "rooms": [("Standard", "standard", 2), ("Taj Facing", "deluxe", 2)],
    },
    {
        "name": "Mumbai Gateway Hotel",
        "city": "Mumbai",
        "address": "South Mumbai / Colaba belt",
        "stars": 4,
        "amenities": "Wi-Fi, Restaurant, Concierge",
        "seed": 5120,
        "rooms": [("City Room", "deluxe", 2), ("Harbour Suite", "suite", 3)],
    },
    {
        "name": "Bengaluru Garden Hotel",
        "city": "Bengaluru",
        "address": "MG Road / Indiranagar belt",
        "stars": 4,
        "amenities": "Wi-Fi, Breakfast, Gym",
        "seed": 5130,
        "rooms": [("Superior", "deluxe", 2), ("Club Room", "executive", 2)],
    },
    {
        "name": "Hyderabad Charminar Stay",
        "city": "Hyderabad",
        "address": "Old City / Abids belt",
        "stars": 3,
        "amenities": "Restaurant, Wi-Fi, Parking",
        "seed": 5140,
        "rooms": [("Heritage Room", "deluxe", 2), ("Family Room", "family", 4)],
    },
    {
        "name": "Mainpat Hill Homestay",
        "city": "Mainpat",
        "address": "Mainpat plateau",
        "stars": 2,
        "amenities": "Home-cooked meals, Parking, Local guides",
        "seed": 5150,
        "rooms": [("Hill Room", "standard", 2), ("Family Cottage", "cottage", 4)],
    },
]


def download_image(seed: int, key: str) -> str:
    url = f"https://picsum.photos/seed/{seed}/1200/800"
    data = urlopen(Request(url, headers={"User-Agent": "luxurisse-seed/1.0"}), timeout=40).read()
    filename = f"{key}_{uuid.uuid4().hex[:8]}.jpg"
    (UPLOAD / filename).write_bytes(data)
    return f"/uploads/hotels/{filename}"


def main() -> None:
    db = get_session_factory()()
    created = skipped = 0
    try:
        for item in HOTELS:
            existing = db.scalar(
                select(Hotel)
                .options(selectinload(Hotel.rooms))
                .where(Hotel.name == item["name"], Hotel.deleted_at.is_(None))
            )
            if existing:
                if not existing.cover_image_url:
                    key = item["name"].lower().replace(" ", "_")[:40]
                    existing.cover_image_url = download_image(item["seed"], key)
                    db.add(existing)
                skipped += 1
                print("SKIP", item["name"])
                continue

            key = item["name"].lower().replace(" ", "_")[:40]
            hotel = Hotel(
                name=item["name"],
                city=item["city"],
                address=item["address"],
                star_rating=item["stars"],
                amenities=item["amenities"],
                cover_image_url=download_image(item["seed"], key),
                is_active=True,
            )
            for room_name, room_type, occ in item["rooms"]:
                hotel.rooms.append(
                    HotelRoom(
                        name=room_name,
                        room_type=room_type,
                        max_occupancy=occ,
                        price_per_night=None,
                        currency="INR",
                        amenities=item["amenities"],
                        is_active=True,
                    )
                )
            db.add(hotel)
            created += 1
            print("CREATE", item["name"])

        db.commit()
        total = len(db.scalars(select(Hotel).where(Hotel.deleted_at.is_(None))).all())
        print(f"DONE created={created} skipped={skipped} total_hotels={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
