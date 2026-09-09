"""Seed SAMPLE quotations linked to enquiries (demo amounts for admin preview)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.enquiries import Enquiry, Quotation, QuotationItem
from app.models.enums import QuotationStatus

SAMPLE = "[SAMPLE]"

QUOTES = [
    {
        "code": "SAMPLE-QT001",
        "title": "Kerala 5N Backwaters & Munnar",
        "enquiry_subject": "Kerala honeymoon enquiry",
        "amount": "42500",
        "tax": "7650",
        "status": QuotationStatus.SENT,
        "days_valid": 14,
        "items": [
            ("Kerala Backwaters & Hills package (2 pax)", 2, "18500"),
            ("Houseboat stay — Alleppey (1 night)", 1, "5500"),
        ],
    },
    {
        "code": "SAMPLE-QT002",
        "title": "Goa Group Trip — 8 Adults",
        "enquiry_subject": "Goa group trip",
        "amount": "96000",
        "tax": "17280",
        "status": QuotationStatus.DRAFT,
        "days_valid": 21,
        "items": [
            ("Goa Beach Escape (8 pax)", 8, "12000"),
        ],
    },
    {
        "code": "SAMPLE-QT003",
        "title": "Bastar Weekend — Jagdalpur & Chitrakote",
        "enquiry_subject": "Bastar weekend",
        "amount": "18900",
        "tax": "3402",
        "status": QuotationStatus.ACCEPTED,
        "days_valid": 10,
        "items": [
            ("Bastar Tribal Trail (2 pax)", 2, "7500"),
            ("Chitrakote Falls day visit", 2, "1950"),
        ],
    },
    {
        "code": "SAMPLE-QT004",
        "title": "Shimla Manali Family — 4 Pax",
        "enquiry_subject": "Himachal family package",
        "amount": "62400",
        "tax": "11232",
        "status": QuotationStatus.SENT,
        "days_valid": 15,
        "items": [
            ("Shimla Manali Hills (4 pax)", 4, "15600"),
        ],
    },
    {
        "code": "SAMPLE-QT005",
        "title": "Raipur Local Sightseeing Day Tour",
        "enquiry_subject": "Raipur local sightseeing",
        "amount": "4500",
        "tax": "810",
        "status": QuotationStatus.REJECTED,
        "days_valid": 7,
        "items": [
            ("Raipur Local Highlights (1 day, 2 pax)", 2, "2250"),
        ],
    },
    {
        "code": "SAMPLE-QT006",
        "title": "Rishikesh Mussoorie Getaway",
        "enquiry_subject": "Uttarakhand trek info",
        "amount": "27999",
        "tax": "5040",
        "status": QuotationStatus.SENT,
        "days_valid": 12,
        "items": [
            ("Rishikesh Mussoorie Getaway (2 pax)", 2, "13999"),
        ],
    },
    {
        "code": "SAMPLE-QT007",
        "title": "Delhi Agra Golden Triangle Weekend",
        "enquiry_subject": "Delhi Agra weekend",
        "amount": "35800",
        "tax": "6444",
        "status": QuotationStatus.DRAFT,
        "days_valid": 20,
        "items": [
            ("Delhi Heritage Weekend (2 pax)", 2, "8900"),
            ("Agra day excursion", 2, "9000"),
        ],
    },
    {
        "code": "SAMPLE-QT008",
        "title": "Barnawapara Wildlife Safari",
        "enquiry_subject": "Barnawapara safari",
        "amount": "15600",
        "tax": "2808",
        "status": QuotationStatus.EXPIRED,
        "days_valid": -5,
        "items": [
            ("Barnawapara Wildlife (2 pax, 2N)", 2, "7800"),
        ],
    },
]


def main() -> None:
    db = get_session_factory()()
    try:
        existing = db.scalar(
            select(Quotation).where(Quotation.quotation_code.like("SAMPLE-QT%")).limit(1)
        )
        if existing:
            print("Sample quotations already present. Skipping.")
            return

        enquiries = db.scalars(select(Enquiry).where(Enquiry.deleted_at.is_(None))).all()
        by_subject = {}
        for e in enquiries:
            subj = (e.subject or "").replace(SAMPLE, "").strip()
            by_subject[subj.lower()] = e

        created = 0
        for spec in QUOTES:
            key = spec["enquiry_subject"].lower()
            enquiry = by_subject.get(key)
            amount = Decimal(spec["amount"])
            tax = Decimal(spec["tax"])
            total = amount + tax
            valid = date.today() + timedelta(days=spec["days_valid"])

            q = Quotation(
                enquiry_id=enquiry.id if enquiry else None,
                quotation_code=spec["code"],
                title=spec["title"],
                amount=amount,
                tax_amount=tax,
                total_amount=total,
                currency="INR",
                valid_until=valid,
                details=f"{SAMPLE} Demo quotation for admin preview — amounts are not confirmed company pricing.",
                status=spec["status"],
            )
            db.add(q)
            db.flush()

            for desc, qty, unit in spec["items"]:
                unit_price = Decimal(unit)
                q.items.append(
                    QuotationItem(
                        description=desc,
                        quantity=qty,
                        unit_price=unit_price,
                        line_total=unit_price * qty,
                    )
                )
            created += 1
            print("CREATE", spec["code"], spec["title"])

        db.commit()
        total = len(db.scalars(select(Quotation).where(Quotation.deleted_at.is_(None))).all())
        print(f"DONE created={created} total_quotations={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
