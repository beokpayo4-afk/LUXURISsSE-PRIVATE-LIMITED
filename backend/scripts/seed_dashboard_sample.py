"""Seed SAMPLE dashboard data (bookings, payments, enquiries) for UI preview.

Marked with SAMPLE- codes / [SAMPLE] notes so they are easy to identify and delete.
Amounts are demo-only — not company pricing.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, update

from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models.auth import User
from app.models.bookings import Booking
from app.models.customers import Customer
from app.models.enquiries import Enquiry
from app.models.enums import BookingStatus, EnquiryStatus, PaymentStatus, UserRole
from app.models.payments import Payment
from app.models.tours import Tour


SAMPLE_TAG = "[SAMPLE]"
SAMPLE_PREFIX = "SAMPLE-"


def _months_ago(months: int, day: int = 12) -> datetime:
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month - months
    while m <= 0:
        m += 12
        y -= 1
    day = min(day, 28)
    return datetime(y, m, day, 10, 30, tzinfo=timezone.utc)


def main() -> None:
    db = get_session_factory()()
    try:
        existing = db.scalar(
            select(Booking).where(Booking.booking_code.like(f"{SAMPLE_PREFIX}%")).limit(1)
        )
        if existing:
            print("Sample dashboard data already present. Skipping.")
            return

        tours = db.scalars(
            select(Tour).where(Tour.deleted_at.is_(None)).order_by(Tour.id).limit(40)
        ).all()
        if not tours:
            raise SystemExit("No tours found. Seed tours first.")

        # Prefer published / featured for variety, then fill
        preferred_titles = [
            "Kerala Backwaters & Hills",
            "Goa Beach Escape",
            "Shimla Manali Hills",
            "Raipur Local Highlights",
            "Bastar Culture Tour",
            "Mumbai City Break",
            "Agra Varanasi Circuit",
            "Barnawapara Wildlife",
            "Rishikesh Mussoorie Getaway",
            "Delhi Heritage Weekend",
            "Chitrakote Falls Stay",
            "Hyderabad Heritage Stay",
        ]
        by_title = {t.title: t for t in tours}
        picked: list[Tour] = []
        for title in preferred_titles:
            if title in by_title:
                picked.append(by_title[title])
        for t in tours:
            if t not in picked:
                picked.append(t)
            if len(picked) >= 12:
                break

        # Demo customers
        customers_spec = [
            ("Anita Sharma", "anita.sample@example.com", "9876500001"),
            ("Rahul Verma", "rahul.sample@example.com", "9876500002"),
            ("Priya Patel", "priya.sample@example.com", "9876500003"),
            ("Vikram Singh", "vikram.sample@example.com", "9876500004"),
            ("Sneha Gupta", "sneha.sample@example.com", "9876500005"),
        ]
        users: list[User] = []
        customers: list[Customer] = []
        for name, email, phone in customers_spec:
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                user = User(
                    email=email,
                    full_name=name,
                    phone=phone,
                    hashed_password=hash_password("Sample@Customer1"),
                    role=UserRole.CUSTOMER,
                )
                db.add(user)
                db.flush()
            cust = db.scalar(select(Customer).where(Customer.email == email))
            if not cust:
                cust = Customer(user_id=user.id, full_name=name, email=email, phone=phone, notes=SAMPLE_TAG)
                db.add(cust)
                db.flush()
            users.append(user)
            customers.append(cust)

        # Bookings spread across last 12 months with mixed status
        # (months_ago, tour_index, status, amount, travelers, user_index)
        plan = [
            (11, 0, BookingStatus.CONFIRMED, "18500", 2, 0),
            (10, 1, BookingStatus.CONFIRMED, "22000", 2, 1),
            (10, 2, BookingStatus.PENDING, "15999", 1, 2),
            (9, 0, BookingStatus.CONFIRMED, "24500", 3, 3),
            (8, 3, BookingStatus.CONFIRMED, "8900", 2, 4),
            (8, 4, BookingStatus.CANCELLED, "12000", 2, 0),
            (7, 5, BookingStatus.CONFIRMED, "14999", 2, 1),
            (7, 1, BookingStatus.CONFIRMED, "19999", 4, 2),
            (6, 6, BookingStatus.PENDING, "27999", 2, 3),
            (5, 7, BookingStatus.CONFIRMED, "16500", 2, 4),
            (5, 0, BookingStatus.CONFIRMED, "21000", 2, 0),
            (4, 8, BookingStatus.CONFIRMED, "13999", 1, 1),
            (4, 2, BookingStatus.CANCELLED, "17500", 2, 2),
            (3, 3, BookingStatus.CONFIRMED, "9900", 2, 3),
            (3, 9, BookingStatus.PENDING, "8500", 1, 4),
            (2, 4, BookingStatus.CONFIRMED, "25999", 3, 0),
            (2, 10, BookingStatus.CONFIRMED, "7500", 2, 1),
            (1, 5, BookingStatus.CONFIRMED, "16999", 2, 2),
            (1, 1, BookingStatus.PENDING, "18999", 2, 3),
            (0, 11, BookingStatus.CONFIRMED, "11999", 2, 4),
            (0, 0, BookingStatus.CONFIRMED, "22999", 2, 0),
            (0, 3, BookingStatus.PENDING, "7900", 1, 1),
        ]

        created_bookings = 0
        created_payments = 0
        for i, (months, ti, status, amount_s, travelers, ui) in enumerate(plan, start=1):
            tour = picked[ti % len(picked)]
            user = users[ui % len(users)]
            cust = customers[ui % len(customers)]
            amount = Decimal(amount_s)
            created = _months_ago(months, day=8 + (i % 15))
            code = f"{SAMPLE_PREFIX}BK{i:03d}"
            booking = Booking(
                user_id=user.id,
                customer_id=cust.id,
                tour_id=tour.id,
                booking_code=code,
                travel_date=(created.date() + timedelta(days=21)),
                travelers=travelers,
                subtotal_amount=amount,
                discount_amount=Decimal("0"),
                tax_amount=Decimal("0"),
                total_amount=amount,
                currency="INR",
                status=status,
                notes=f"{SAMPLE_TAG} Demo booking for dashboard preview — not a real sale.",
            )
            db.add(booking)
            db.flush()
            # Backdate timestamps for monthly charts
            db.execute(
                update(Booking)
                .where(Booking.id == booking.id)
                .values(created_at=created, updated_at=created)
            )
            created_bookings += 1

            if status == BookingStatus.CONFIRMED:
                pay = Payment(
                    booking_id=booking.id,
                    user_id=user.id,
                    amount=amount,
                    currency="INR",
                    method="UPI",
                    transaction_ref=f"{SAMPLE_PREFIX}PAY{i:03d}",
                    status=PaymentStatus.PAID,
                    paid_at=created + timedelta(hours=2),
                    notes=f"{SAMPLE_TAG} Demo payment",
                )
                db.add(pay)
                db.flush()
                db.execute(
                    update(Payment)
                    .where(Payment.id == pay.id)
                    .values(created_at=created + timedelta(hours=2), updated_at=created + timedelta(hours=2))
                )
                created_payments += 1
            elif status == BookingStatus.PENDING:
                pay = Payment(
                    booking_id=booking.id,
                    user_id=user.id,
                    amount=amount,
                    currency="INR",
                    method="Bank transfer",
                    transaction_ref=f"{SAMPLE_PREFIX}PEND{i:03d}",
                    status=PaymentStatus.PENDING,
                    notes=f"{SAMPLE_TAG} Demo pending payment",
                )
                db.add(pay)
                db.flush()
                db.execute(
                    update(Payment)
                    .where(Payment.id == pay.id)
                    .values(created_at=created, updated_at=created)
                )
                created_payments += 1

        enquiries_spec = [
            ("Amit Joshi", "amit.sample@example.com", "Kerala honeymoon enquiry", "Looking for 5N Kerala package.", "Kerala", EnquiryStatus.NEW, 2),
            ("Neha Reddy", "neha.sample@example.com", "Goa group trip", "Need quote for 8 adults.", "Goa", EnquiryStatus.IN_PROGRESS, 5),
            ("Suresh Yadav", "suresh.sample@example.com", "Bastar weekend", "Interested in Jagdalpur / Chitrakote.", "Bastar", EnquiryStatus.QUOTED, 8),
            ("Meera Iyer", "meera.sample@example.com", "Himachal family package", "Shimla Manali for family of 4.", "Himachal Pradesh", EnquiryStatus.NEW, 1),
            ("Karan Malhotra", "karan.sample@example.com", "Raipur local sightseeing", "Day tour options please.", "Raipur", EnquiryStatus.CLOSED, 12),
            ("Divya Nair", "divya.sample@example.com", "Uttarakhand trek info", "Rishikesh / Mussoorie dates in Oct.", "Uttarakhand", EnquiryStatus.IN_PROGRESS, 3),
            ("Farhan Ali", "farhan.sample@example.com", "Delhi Agra weekend", "Golden Triangle short break.", "Delhi", EnquiryStatus.NEW, 0),
            ("Pooja Desai", "pooja.sample@example.com", "Barnawapara safari", "Wildlife package for 2.", "Barnawapara", EnquiryStatus.QUOTED, 4),
        ]

        created_enquiries = 0
        for name, email, subject, message, dest, status, days_ago in enquiries_spec:
            created = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=3)
            enq = Enquiry(
                name=name,
                email=email,
                phone="9294744219",
                subject=f"{SAMPLE_TAG} {subject}",
                message=f"{message} ({SAMPLE_TAG} demo enquiry)",
                preferred_destination=dest,
                travel_date=date.today() + timedelta(days=30 + days_ago),
                status=status,
            )
            db.add(enq)
            db.flush()
            db.execute(
                update(Enquiry)
                .where(Enquiry.id == enq.id)
                .values(created_at=created, updated_at=created)
            )
            created_enquiries += 1

        db.commit()
        print(
            f"DONE bookings={created_bookings} payments={created_payments} "
            f"enquiries={created_enquiries} (all tagged {SAMPLE_TAG})"
        )
        print("Refresh Admin Dashboard to see sample analytics.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
