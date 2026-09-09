"""Seed India destinations (states/cities + local CG) with images."""

from __future__ import annotations

import uuid
from urllib.request import Request, urlopen

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.config import BACKEND_ROOT
from app.db.session import get_session_factory
from app.models.destinations import Attraction, Destination, DestinationImage
from app.models.enums import PublishStatus
from app.services.destination_service import slugify

UPLOAD = BACKEND_ROOT / "uploads" / "destinations"
UPLOAD.mkdir(parents=True, exist_ok=True)

DESTINATIONS = [
    {
        "name": "Kerala",
        "state": "Kerala",
        "city_name": "Kochi",
        "summary": "Backwaters, beaches, and hill stations across God's Own Country.",
        "description": "Kerala packages typically cover Kochi, Munnar, Alleppey, and Thekkady circuits.",
        "best_time": "September to March",
        "travel": "Fly into Kochi / Trivandrum; road transfers between towns.",
        "seed": 2010,
        "attractions": [("Alleppey Backwaters", "Alappuzha"), ("Munnar Hills", "Munnar")],
        "featured": True,
    },
    {
        "name": "Uttarakhand",
        "state": "Uttarakhand",
        "city_name": "Dehradun",
        "summary": "Himalayan foothills, temples, and hill-station getaways.",
        "description": "Popular for Rishikesh, Haridwar, Mussoorie, Nainital, and Char Dham approaches.",
        "best_time": "March to June, September to November",
        "travel": "Reach via Dehradun / Haridwar; mountain roads thereafter.",
        "seed": 2020,
        "attractions": [("Rishikesh Ganga Ghat", "Rishikesh"), ("Mussoorie Viewpoint", "Mussoorie")],
        "featured": True,
    },
    {
        "name": "Delhi",
        "state": "Delhi",
        "city_name": "New Delhi",
        "summary": "Capital city heritage, markets, and gateway for North India tours.",
        "description": "Ideal for short city breaks and Golden Triangle starting points.",
        "best_time": "October to March",
        "travel": "Indira Gandhi International Airport and major rail hubs.",
        "seed": 2030,
        "attractions": [("India Gate", "New Delhi"), ("Qutub Minar", "Mehrauli")],
        "featured": False,
    },
    {
        "name": "Uttar Pradesh",
        "state": "Uttar Pradesh",
        "city_name": "Lucknow",
        "summary": "Heritage cities including Agra, Varanasi, and Lucknow circuits.",
        "description": "UP destinations cover Taj Mahal visits, spiritual circuits, and cultural stays.",
        "best_time": "October to March",
        "travel": "Air/rail to Agra, Varanasi, Lucknow; road links between cities.",
        "seed": 2040,
        "attractions": [("Taj Mahal", "Agra"), ("Varanasi Ghats", "Varanasi")],
        "featured": False,
    },
    {
        "name": "Himachal Pradesh",
        "state": "Himachal Pradesh",
        "city_name": "Shimla",
        "summary": "Hill stations, valleys, and adventure destinations in the Himalayas.",
        "description": "Common circuits include Shimla, Manali, Dharamshala, and Spiti approaches.",
        "best_time": "March to June, October to February",
        "travel": "Reach via Chandigarh / Delhi road or nearby airports.",
        "seed": 2050,
        "attractions": [("Mall Road Shimla", "Shimla"), ("Solang Valley", "Manali")],
        "featured": True,
    },
    {
        "name": "Bihar",
        "state": "Bihar",
        "city_name": "Patna",
        "summary": "Spiritual and heritage tourism including Bodh Gaya and Nalanda.",
        "description": "Bihar packages focus on Buddhist circuits and historic sites.",
        "best_time": "October to March",
        "travel": "Fly/rail to Patna or Gaya; local road transfers.",
        "seed": 2060,
        "attractions": [("Mahabodhi Temple", "Bodh Gaya"), ("Nalanda Ruins", "Nalanda")],
        "featured": False,
    },
    {
        "name": "Jharkhand",
        "state": "Jharkhand",
        "city_name": "Ranchi",
        "summary": "Waterfalls, forests, and plateau getaways around Ranchi and Netarhat.",
        "description": "Nature-focused short breaks and regional sightseeing.",
        "best_time": "October to March",
        "travel": "Ranchi airport/railway; road to hill and waterfall spots.",
        "seed": 2070,
        "attractions": [("Dassam Falls", "Near Ranchi"), ("Netarhat Viewpoint", "Netarhat")],
        "featured": False,
    },
    {
        "name": "Madhya Pradesh",
        "state": "Madhya Pradesh",
        "city_name": "Bhopal",
        "summary": "Wildlife, temples, and heritage from Khajuraho to Kanha and Orchha.",
        "description": "MP is popular for tiger reserves and central India heritage tours.",
        "best_time": "October to March",
        "travel": "Air/rail to Bhopal, Jabalpur, or Khajuraho depending on circuit.",
        "seed": 2080,
        "attractions": [("Khajuraho Temples", "Khajuraho"), ("Kanha National Park", "Mandla")],
        "featured": False,
    },
    {
        "name": "Goa",
        "state": "Goa",
        "city_name": "Panaji",
        "summary": "Beaches, Portuguese heritage, and leisure holidays.",
        "description": "North and South Goa beach stays with optional heritage walks.",
        "best_time": "November to February",
        "travel": "Dabolim / Mopa airports; local taxis and transfers.",
        "seed": 2090,
        "attractions": [("Calangute Beach", "North Goa"), ("Basilica of Bom Jesus", "Old Goa")],
        "featured": True,
    },
    {
        "name": "Mumbai",
        "state": "Maharashtra",
        "city_name": "Mumbai",
        "summary": "Financial capital city breaks and West India tour gateway.",
        "description": "City sightseeing, markets, and coastal landmarks.",
        "best_time": "November to February",
        "travel": "CSMIA airport and major rail termini.",
        "seed": 2100,
        "attractions": [("Gateway of India", "Colaba"), ("Marine Drive", "South Mumbai")],
        "featured": False,
    },
    {
        "name": "Pune",
        "state": "Maharashtra",
        "city_name": "Pune",
        "summary": "City and nearby hill getaways including Lonavala circuits.",
        "description": "Convenient for weekend leisure and western Maharashtra tours.",
        "best_time": "October to February",
        "travel": "Pune airport/railway; road to hill stations.",
        "seed": 2110,
        "attractions": [("Shaniwar Wada", "Pune"), ("Sinhagad Fort", "Near Pune")],
        "featured": False,
    },
    {
        "name": "Surat",
        "state": "Gujarat",
        "city_name": "Surat",
        "summary": "Business and leisure stop in South Gujarat.",
        "description": "Useful as a city stay with nearby coastal and temple day trips.",
        "best_time": "October to March",
        "travel": "Surat airport/railway; road network across Gujarat.",
        "seed": 2120,
        "attractions": [("Dumas Beach", "Surat"), ("Sarthana Nature Park", "Surat")],
        "featured": False,
    },
    {
        "name": "Bengaluru",
        "state": "Karnataka",
        "city_name": "Bengaluru",
        "summary": "Garden city stays and South India tour hub.",
        "description": "City parks, tech-city leisure, and gateway to Mysuru / Coorg.",
        "best_time": "September to February",
        "travel": "Kempegowda International Airport and city rail.",
        "seed": 2130,
        "attractions": [("Lalbagh Botanical Garden", "Bengaluru"), ("Cubbon Park", "Bengaluru")],
        "featured": False,
    },
    {
        "name": "Chennai",
        "state": "Tamil Nadu",
        "city_name": "Chennai",
        "summary": "Coastal metro and gateway for Tamil Nadu temple circuits.",
        "description": "Marina coastline, heritage temples, and South India connections.",
        "best_time": "November to February",
        "travel": "Chennai airports and Central / Egmore rail.",
        "seed": 2140,
        "attractions": [("Marina Beach", "Chennai"), ("Kapaleeshwarar Temple", "Mylapore")],
        "featured": False,
    },
    {
        "name": "Hyderabad",
        "state": "Telangana",
        "city_name": "Hyderabad",
        "summary": "Heritage city of Charminar, forts, and modern leisure.",
        "description": "Old City heritage with modern city leisure options.",
        "best_time": "October to February",
        "travel": "RGIA airport; metro and road transfers.",
        "seed": 2150,
        "attractions": [("Charminar", "Hyderabad"), ("Golconda Fort", "Hyderabad")],
        "featured": False,
    },
    # Local Chhattisgarh
    {
        "name": "Bastar",
        "state": "Chhattisgarh",
        "city_name": "Jagdalpur",
        "summary": "Tribal heartland of southern Chhattisgarh.",
        "description": "Nature, culture, and waterfall circuits around Bastar region.",
        "best_time": "October to March",
        "travel": "Via Raipur-Jagdalpur road/air connections.",
        "seed": 2160,
        "attractions": [("Bastar Palace Area", "Jagdalpur"), ("Kanger Valley Approaches", "Bastar")],
        "featured": True,
    },
    {
        "name": "Bilaspur",
        "state": "Chhattisgarh",
        "city_name": "Bilaspur",
        "summary": "Central Chhattisgarh city with nearby temples and day trips.",
        "description": "Useful regional hub for Malhar and Achanakmar approaches.",
        "best_time": "October to March",
        "travel": "Rail/road from Raipur; local transfers.",
        "seed": 2170,
        "attractions": [("Ratanpur Temple Circuit", "Near Bilaspur"), ("Achanakmar Approaches", "Near Bilaspur")],
        "featured": False,
    },
    {
        "name": "Korba",
        "state": "Chhattisgarh",
        "city_name": "Korba",
        "summary": "Industrial city with nearby nature and dam viewpoints.",
        "description": "Short leisure stays and regional sightseeing options.",
        "best_time": "October to March",
        "travel": "Road/rail via Bilaspur-Korba.",
        "seed": 2180,
        "attractions": [("Sarvamangla Temple", "Korba"), ("Local Dam Viewpoints", "Korba")],
        "featured": False,
    },
    {
        "name": "Durg-Bhilai",
        "state": "Chhattisgarh",
        "city_name": "Bhilai",
        "summary": "Twin-city circuit near Raipur for short getaways.",
        "description": "Civic parks, temples, and easy day tours from Raipur.",
        "best_time": "October to March",
        "travel": "Short drive from Raipur on NH corridor.",
        "seed": 2190,
        "attractions": [("Civic Centre Area", "Bhilai"), ("Maitri Bagh", "Bhilai")],
        "featured": False,
    },
    {
        "name": "Ambikapur",
        "state": "Chhattisgarh",
        "city_name": "Ambikapur",
        "summary": "Northern Chhattisgarh gateway toward Mainpat.",
        "description": "Base for Surguja region and Mainpat hill visits.",
        "best_time": "September to March",
        "travel": "Road from Raipur; local jeeps to Mainpat.",
        "seed": 2200,
        "attractions": [("Gandhi Chowk Area", "Ambikapur"), ("Mainpat Road Viewpoints", "Near Ambikapur")],
        "featured": False,
    },
]


def download_image(seed: int, key: str, idx: int) -> str:
    url = f"https://picsum.photos/seed/{seed + idx}/1200/800"
    data = urlopen(Request(url, headers={"User-Agent": "luxurisse-seed/1.0"}), timeout=40).read()
    filename = f"{key}_{idx}_{uuid.uuid4().hex[:8]}.jpg"
    (UPLOAD / filename).write_bytes(data)
    return f"/uploads/destinations/{filename}"


def main() -> None:
    db = get_session_factory()()
    created = skipped = 0
    try:
        for item in DESTINATIONS:
            slug = slugify(item["name"])
            existing = db.scalar(
                select(Destination)
                .options(selectinload(Destination.images))
                .where(Destination.slug == slug, Destination.deleted_at.is_(None))
            )
            if existing:
                if not existing.images:
                    existing.images.append(
                        DestinationImage(
                            image_url=download_image(item["seed"], slug.replace("-", "_"), 0),
                            alt_text=existing.name,
                            sort_order=0,
                            is_cover=True,
                        )
                    )
                    db.add(existing)
                skipped += 1
                print("SKIP", item["name"])
                continue

            dest = Destination(
                name=item["name"],
                slug=slug,
                country="India",
                state=item["state"],
                city_name=item["city_name"],
                summary=item["summary"],
                description=item["description"],
                best_time_to_visit=item["best_time"],
                travel_information=item["travel"],
                is_featured=bool(item.get("featured")),
                is_published=True,
                is_popular=bool(item.get("featured")),
                status=PublishStatus.PUBLISHED,
            )
            key = slug.replace("-", "_")
            for i in range(2):
                dest.images.append(
                    DestinationImage(
                        image_url=download_image(item["seed"], key, i),
                        alt_text=f"{item['name']} {i + 1}",
                        sort_order=i,
                        is_cover=(i == 0),
                    )
                )
            for ai, (aname, aloc) in enumerate(item["attractions"]):
                dest.attractions.append(
                    Attraction(
                        name=aname,
                        location=aloc,
                        description=f"{aname} visit point.",
                        entry_information="As per local timings",
                        status=PublishStatus.PUBLISHED,
                        sort_order=ai,
                    )
                )
            db.add(dest)
            created += 1
            print("CREATE", item["name"])

        db.commit()
        total = db.scalar(
            select(func.count()).select_from(Destination).where(Destination.deleted_at.is_(None))
        )
        print(f"DONE created={created} skipped={skipped} total={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
