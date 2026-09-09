"""Seed SAMPLE fake reviews for admin / public preview."""

from __future__ import annotations

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models.auth import User
from app.models.enums import UserRole
from app.models.marketing import Review
from app.models.tours import Tour

SAMPLE = "[SAMPLE]"

REVIEWERS = [
    ("Anita Sharma", "anita.sample@example.com"),
    ("Rahul Verma", "rahul.sample@example.com"),
    ("Priya Patel", "priya.sample@example.com"),
    ("Vikram Singh", "vikram.sample@example.com"),
    ("Sneha Gupta", "sneha.sample@example.com"),
    ("Neha Reddy", "neha.review@example.com"),
    ("Amit Joshi", "amit.review@example.com"),
    ("Meera Iyer", "meera.review@example.com"),
]

COMMENTS = [
    (5, f"{SAMPLE} Smooth planning from Raipur. Hotel and transfers were well arranged."),
    (5, f"{SAMPLE} Beautiful Kerala backwaters package. Guide was helpful throughout."),
    (4, f"{SAMPLE} Goa stay was comfortable. Would like more free-time options next trip."),
    (5, f"{SAMPLE} Himachal hills trip was well paced for our family."),
    (4, f"{SAMPLE} Chitrakote visit was memorable. Transport on time."),
    (5, f"{SAMPLE} Bastar culture tour exceeded expectations."),
    (3, f"{SAMPLE} Good overall. Room upgrade took a day to confirm."),
    (5, f"{SAMPLE} Delhi weekend was compact and well organised."),
    (4, f"{SAMPLE} Mumbai city break — clear itinerary and responsive support."),
    (5, f"{SAMPLE} Mainpat escape was peaceful. Homestay food was excellent."),
    (4, f"{SAMPLE} Agra visit handled professionally. Early morning Taj slot worked well."),
    (5, f"{SAMPLE} Rishikesh getaway was refreshing. Will book again."),
]


def main() -> None:
    db = get_session_factory()()
    try:
        existing = db.scalar(
            select(Review).where(Review.comment.ilike(f"%{SAMPLE}%")).limit(1)
        )
        if existing:
            print("Sample reviews already present. Skipping.")
            return

        tours = db.scalars(
            select(Tour).where(Tour.deleted_at.is_(None), Tour.is_published.is_(True)).limit(20)
        ).all()
        if not tours:
            tours = db.scalars(select(Tour).where(Tour.deleted_at.is_(None)).limit(20)).all()
        if not tours:
            raise SystemExit("No tours found. Seed tours first.")

        users: list[User] = []
        for name, email in REVIEWERS:
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                user = User(
                    email=email,
                    full_name=name,
                    phone="9294744219",
                    hashed_password=hash_password("Sample@Customer1"),
                    role=UserRole.CUSTOMER,
                )
                db.add(user)
                db.flush()
            users.append(user)

        created = 0
        for i, (rating, comment) in enumerate(COMMENTS):
            user = users[i % len(users)]
            tour = tours[i % len(tours)]
            # Respect unique (user_id, tour_id) — skip if already reviewed
            clash = db.scalar(
                select(Review).where(
                    Review.user_id == user.id,
                    Review.tour_id == tour.id,
                    Review.deleted_at.is_(None),
                )
            )
            if clash:
                # try next tour
                for t in tours:
                    clash2 = db.scalar(
                        select(Review).where(
                            Review.user_id == user.id,
                            Review.tour_id == t.id,
                            Review.deleted_at.is_(None),
                        )
                    )
                    if not clash2:
                        tour = t
                        break
                else:
                    continue

            db.add(
                Review(
                    user_id=user.id,
                    tour_id=tour.id,
                    rating=rating,
                    comment=comment,
                    is_approved=i % 4 != 0,  # mix pending + approved
                )
            )
            created += 1

        db.commit()
        total = len(db.scalars(select(Review).where(Review.deleted_at.is_(None))).all())
        print(f"DONE created={created} total_reviews={total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
