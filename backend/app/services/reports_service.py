"""Real aggregate queries for the admin dashboard (no invented numbers)."""

from __future__ import annotations

from calendar import month_abbr
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.bookings import Booking
from app.models.customers import Customer
from app.models.destinations import Destination
from app.models.enquiries import Enquiry
from app.models.enums import BookingStatus, EnquiryStatus, PaymentStatus, UserRole
from app.models.marketing import Review
from app.models.payments import Payment
from app.models.tours import Tour, TourCategory
from app.schemas.reports import (
    DashboardCharts,
    DashboardResponse,
    DashboardStats,
    MonthlyPoint,
    NamedCount,
    PackageSalesRow,
    RecentBookingRow,
    ReportSummary,
)


def _money(value) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _pct(part: int | float, whole: int | float) -> float:
    if not whole:
        return 0.0
    return round((float(part) / float(whole)) * 100, 1)


def _month_keys(months: int = 12) -> list[tuple[int, int, str, str]]:
    """Return (year, month, YYYY-MM, label) for the last N calendar months including current."""
    now = datetime.now(timezone.utc)
    keys: list[tuple[int, int, str, str]] = []
    y, m = now.year, now.month
    for _ in range(months):
        keys.append((y, m, f"{y:04d}-{m:02d}", f"{month_abbr[m]} {y}"))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    keys.reverse()
    return keys


def build_report_summary(db: Session) -> ReportSummary:
    return ReportSummary(
        users=db.scalar(select(func.count()).select_from(User).where(User.deleted_at.is_(None))) or 0,
        bookings=db.scalar(select(func.count()).select_from(Booking).where(Booking.deleted_at.is_(None))) or 0,
        enquiries=db.scalar(select(func.count()).select_from(Enquiry).where(Enquiry.deleted_at.is_(None))) or 0,
        payments_pending=db.scalar(
            select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.PENDING)
        )
        or 0,
        tours=db.scalar(select(func.count()).select_from(Tour).where(Tour.deleted_at.is_(None))) or 0,
        destinations=db.scalar(
            select(func.count()).select_from(Destination).where(Destination.deleted_at.is_(None))
        )
        or 0,
    )


def build_dashboard(db: Session) -> DashboardResponse:
    active_bookings = Booking.deleted_at.is_(None)

    total_revenue = _money(
        db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.PAID))
    )

    total_bookings = db.scalar(select(func.count()).select_from(Booking).where(active_bookings)) or 0
    pending_bookings = (
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(active_bookings, Booking.status == BookingStatus.PENDING)
        )
        or 0
    )
    confirmed_bookings = (
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(active_bookings, Booking.status == BookingStatus.CONFIRMED)
        )
        or 0
    )
    cancelled_bookings = (
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(active_bookings, Booking.status == BookingStatus.CANCELLED)
        )
        or 0
    )
    completed_bookings = (
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(active_bookings, Booking.status == BookingStatus.COMPLETED)
        )
        or 0
    )

    booking_amount_sum = _money(
        db.scalar(
            select(func.coalesce(func.sum(Booking.total_amount), 0)).where(
                active_bookings,
                Booking.total_amount.is_not(None),
            )
        )
    )
    priced_bookings = (
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(active_bookings, Booking.total_amount.is_not(None))
        )
        or 0
    )
    avg_booking_value = (
        (booking_amount_sum / Decimal(priced_bookings)).quantize(Decimal("0.01"))
        if priced_bookings
        else Decimal("0.00")
    )
    cancellation_rate = _pct(cancelled_bookings, total_bookings)

    review_count = (
        db.scalar(select(func.count()).select_from(Review).where(Review.deleted_at.is_(None))) or 0
    )
    avg_rating_raw = db.scalar(
        select(func.avg(Review.rating)).where(Review.deleted_at.is_(None))
    )
    avg_rating = round(float(avg_rating_raw), 1) if avg_rating_raw is not None else 0.0

    total_customers = (
        db.scalar(select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None)))
        or db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.deleted_at.is_(None), User.role == UserRole.CUSTOMER)
        )
        or 0
    )

    stats = DashboardStats(
        total_tours=db.scalar(select(func.count()).select_from(Tour).where(Tour.deleted_at.is_(None))) or 0,
        total_destinations=db.scalar(
            select(func.count()).select_from(Destination).where(Destination.deleted_at.is_(None))
        )
        or 0,
        total_customers=total_customers,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        confirmed_bookings=confirmed_bookings,
        cancelled_bookings=cancelled_bookings,
        completed_bookings=completed_bookings,
        total_enquiries=db.scalar(
            select(func.count()).select_from(Enquiry).where(Enquiry.deleted_at.is_(None))
        )
        or 0,
        pending_enquiries=db.scalar(
            select(func.count())
            .select_from(Enquiry)
            .where(Enquiry.deleted_at.is_(None), Enquiry.status == EnquiryStatus.NEW)
        )
        or 0,
        total_revenue=total_revenue,
        pending_payments=db.scalar(
            select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.PENDING)
        )
        or 0,
        avg_booking_value=avg_booking_value,
        cancellation_rate=cancellation_rate,
        total_reviews=review_count,
        avg_rating=avg_rating,
    )

    month_keys = _month_keys(12)
    booking_rows = db.execute(
        select(
            extract("year", Booking.created_at).label("y"),
            extract("month", Booking.created_at).label("m"),
            func.count().label("c"),
        )
        .where(Booking.deleted_at.is_(None))
        .group_by("y", "m")
    ).all()
    booking_map = {(int(r.y), int(r.m)): int(r.c) for r in booking_rows}

    revenue_rows = db.execute(
        select(
            extract("year", Payment.created_at).label("y"),
            extract("month", Payment.created_at).label("m"),
            func.coalesce(func.sum(Payment.amount), 0).label("a"),
        )
        .where(Payment.status == PaymentStatus.PAID)
        .group_by("y", "m")
    ).all()
    revenue_map = {(int(r.y), int(r.m)): _money(r.a) for r in revenue_rows}

    # Prior 12 months for trend comparison (shift keys back 12 months conceptually via monthly list)
    monthly_bookings = [
        MonthlyPoint(month=key, label=label, count=booking_map.get((y, m), 0))
        for y, m, key, label in month_keys
    ]
    monthly_revenue = [
        MonthlyPoint(month=key, label=label, amount=revenue_map.get((y, m), Decimal("0.00")))
        for y, m, key, label in month_keys
    ]

    dest_rows = db.execute(
        select(Destination.id, Destination.name, func.count(Booking.id).label("c"))
        .join(Tour, Tour.destination_id == Destination.id)
        .join(Booking, Booking.tour_id == Tour.id)
        .where(Booking.deleted_at.is_(None), Destination.deleted_at.is_(None))
        .group_by(Destination.id, Destination.name)
        .order_by(func.count(Booking.id).desc())
        .limit(8)
    ).all()
    dest_total = sum(int(r.c) for r in dest_rows) or 1

    tour_rows = db.execute(
        select(Tour.id, Tour.title, func.count(Booking.id).label("c"))
        .join(Booking, Booking.tour_id == Tour.id)
        .where(Booking.deleted_at.is_(None), Tour.deleted_at.is_(None))
        .group_by(Tour.id, Tour.title)
        .order_by(func.count(Booking.id).desc())
        .limit(8)
    ).all()

    status_breakdown = [
        NamedCount(
            name="Pending",
            count=pending_bookings,
            percent=_pct(pending_bookings, total_bookings),
        ),
        NamedCount(
            name="Confirmed",
            count=confirmed_bookings,
            percent=_pct(confirmed_bookings, total_bookings),
        ),
        NamedCount(
            name="Completed",
            count=completed_bookings,
            percent=_pct(completed_bookings, total_bookings),
        ),
        NamedCount(
            name="Cancelled",
            count=cancelled_bookings,
            percent=_pct(cancelled_bookings, total_bookings),
        ),
    ]

    category_rows = db.execute(
        select(TourCategory.id, TourCategory.name, func.count(Booking.id).label("c"))
        .join(Tour, Tour.category_id == TourCategory.id)
        .join(Booking, Booking.tour_id == Tour.id)
        .where(Booking.deleted_at.is_(None), TourCategory.deleted_at.is_(None))
        .group_by(TourCategory.id, TourCategory.name)
        .order_by(func.count(Booking.id).desc())
        .limit(6)
    ).all()
    cat_total = sum(int(r.c) for r in category_rows) or 1

    payment_rows = db.execute(
        select(
            Payment.method,
            func.count(Payment.id).label("c"),
            func.coalesce(func.sum(Payment.amount), 0).label("a"),
        )
        .where(Payment.status.in_([PaymentStatus.PAID, PaymentStatus.PENDING]))
        .group_by(Payment.method)
        .order_by(func.coalesce(func.sum(Payment.amount), 0).desc())
    ).all()
    pay_total_amt = sum(_money(r.a) for r in payment_rows) or Decimal("0.01")

    package_rows = db.execute(
        select(
            Tour.id,
            Tour.title,
            Destination.name.label("destination"),
            func.count(Booking.id).label("c"),
            func.coalesce(func.sum(Booking.total_amount), 0).label("rev"),
        )
        .outerjoin(Destination, Destination.id == Tour.destination_id)
        .join(Booking, Booking.tour_id == Tour.id)
        .where(Booking.deleted_at.is_(None), Tour.deleted_at.is_(None))
        .group_by(Tour.id, Tour.title, Destination.name)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
    ).all()

    recent_rows = db.execute(
        select(
            Booking.id,
            Booking.booking_code,
            Booking.travel_date,
            Booking.total_amount,
            Booking.status,
            Booking.created_at,
            User.full_name.label("customer_name"),
            Tour.title.label("package_name"),
            Destination.name.label("destination"),
        )
        .join(User, User.id == Booking.user_id)
        .outerjoin(Tour, Tour.id == Booking.tour_id)
        .outerjoin(Destination, Destination.id == Tour.destination_id)
        .where(Booking.deleted_at.is_(None))
        .order_by(Booking.created_at.desc())
        .limit(10)
    ).all()

    insights: list[str] = []
    if total_revenue > 0:
        insights.append(f"Paid revenue stands at ₹{total_revenue:,.0f} from confirmed payment records.")
    if dest_rows:
        top = dest_rows[0]
        insights.append(f"{top.name} leads destinations with {int(top.c)} bookings.")
    if total_customers:
        insights.append(f"{total_customers} customers are registered on the platform.")
    if pending_bookings:
        insights.append(f"{pending_bookings} bookings still await confirmation.")
    if payment_rows:
        top_pay = payment_rows[0]
        insights.append(
            f"{(top_pay.method or 'Other')} is the leading payment method by volume "
            f"({_pct(_money(top_pay.a), pay_total_amt)}%)."
        )
    if not insights:
        insights.append("Add tours, take bookings, and record payments to fill analytics.")

    charts = DashboardCharts(
        monthly_bookings=monthly_bookings,
        monthly_revenue=monthly_revenue,
        popular_destinations=[
            NamedCount(
                id=r.id,
                name=r.name,
                count=int(r.c),
                percent=_pct(int(r.c), dest_total),
            )
            for r in dest_rows
        ],
        popular_tours=[NamedCount(id=r.id, name=r.title, count=int(r.c)) for r in tour_rows],
        bookings_by_status=[row for row in status_breakdown if row.count > 0] or status_breakdown,
        bookings_by_category=[
            NamedCount(
                id=r.id,
                name=r.name,
                count=int(r.c),
                percent=_pct(int(r.c), cat_total),
            )
            for r in category_rows
        ],
        revenue_by_payment_method=[
            NamedCount(
                name=str(r.method or "Other"),
                count=int(r.c),
                amount=_money(r.a),
                percent=_pct(_money(r.a), pay_total_amt),
            )
            for r in payment_rows
        ],
        top_packages=[
            PackageSalesRow(
                id=r.id,
                name=r.title,
                destination=r.destination,
                bookings=int(r.c),
                revenue=_money(r.rev),
            )
            for r in package_rows
        ],
        recent_bookings=[
            RecentBookingRow(
                id=r.id,
                booking_code=r.booking_code,
                customer_name=r.customer_name or "Customer",
                package_name=r.package_name,
                destination=r.destination,
                travel_date=r.travel_date,
                amount=_money(r.total_amount) if r.total_amount is not None else None,
                status=r.status.value if hasattr(r.status, "value") else str(r.status),
                created_at=r.created_at,
            )
            for r in recent_rows
        ],
        insights=insights,
    )
    return DashboardResponse(stats=stats, charts=charts)
