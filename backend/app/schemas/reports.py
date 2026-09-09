"""Dashboard / report schemas — values come from DB aggregates only."""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    total_tours: int = 0
    total_destinations: int = 0
    total_customers: int = 0
    total_bookings: int = 0
    pending_bookings: int = 0
    confirmed_bookings: int = 0
    cancelled_bookings: int = 0
    completed_bookings: int = 0
    total_enquiries: int = 0
    pending_enquiries: int = 0
    total_revenue: Decimal = Field(default=Decimal("0.00"))
    pending_payments: int = 0
    avg_booking_value: Decimal = Field(default=Decimal("0.00"))
    cancellation_rate: float = 0.0
    total_reviews: int = 0
    avg_rating: float = 0.0


class MonthlyPoint(BaseModel):
    month: str  # YYYY-MM
    label: str  # e.g. Jan 2026
    count: int = 0
    amount: Decimal = Field(default=Decimal("0.00"))


class NamedCount(BaseModel):
    id: int | None = None
    name: str
    count: int = 0
    amount: Decimal = Field(default=Decimal("0.00"))
    percent: float = 0.0


class PackageSalesRow(BaseModel):
    id: Optional[int] = None
    name: str
    destination: Optional[str] = None
    bookings: int = 0
    revenue: Decimal = Field(default=Decimal("0.00"))


class RecentBookingRow(BaseModel):
    id: int
    booking_code: str
    customer_name: str
    package_name: Optional[str] = None
    destination: Optional[str] = None
    travel_date: Optional[date] = None
    amount: Optional[Decimal] = None
    status: str
    created_at: Optional[datetime] = None


class DashboardCharts(BaseModel):
    monthly_bookings: List[MonthlyPoint]
    monthly_revenue: List[MonthlyPoint]
    popular_destinations: List[NamedCount]
    popular_tours: List[NamedCount]
    bookings_by_status: List[NamedCount] = Field(default_factory=list)
    bookings_by_category: List[NamedCount] = Field(default_factory=list)
    revenue_by_payment_method: List[NamedCount] = Field(default_factory=list)
    top_packages: List[PackageSalesRow] = Field(default_factory=list)
    recent_bookings: List[RecentBookingRow] = Field(default_factory=list)
    insights: List[str] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    stats: DashboardStats
    charts: DashboardCharts


class ReportSummary(BaseModel):
    """Legacy summary kept for compatibility."""

    users: int
    bookings: int
    enquiries: int
    payments_pending: int
    tours: int
    destinations: int
