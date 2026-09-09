"""Export all SQLAlchemy models for Alembic metadata discovery."""

from app.db.base import Base
from app.models.auth import (
    PasswordResetToken,
    Permission,
    RefreshToken,
    Role,
    RolePermission,
    User,
    UserRoleLink,
)
from app.models.bookings import Booking, BookingItem, BookingTraveller
from app.models.content import Blog, BlogCategory, BlogPost, Page
from app.models.customers import Customer, CustomerAddress
from app.models.destinations import (
    Attraction,
    City,
    Country,
    Destination,
    DestinationImage,
    State,
)
from app.models.enquiries import Enquiry, Quotation, QuotationItem
from app.models.hotels import Hotel, HotelRoom
from app.models.marketing import Banner, Coupon, Gallery, Offer, Review
from app.models.payments import Invoice, Payment, Refund
from app.models.system import CompanySetting, GstSetting, Notification, WebsiteSetting
from app.models.tours import (
    Tour,
    TourCategory,
    TourDepartureDate,
    TourExclusion,
    TourImage,
    TourInclusion,
    TourItinerary,
    TourPackage,
    TourPricing,
)
from app.models.transport import Transport, TransportService, Vehicle
from app.models.tickets import Ticket

__all__ = [
    "Base",
    "PasswordResetToken",
    "Permission",
    "RefreshToken",
    "Role",
    "RolePermission",
    "User",
    "UserRoleLink",
    "Customer",
    "CustomerAddress",
    "Country",
    "State",
    "City",
    "Destination",
    "Attraction",
    "DestinationImage",
    "TourCategory",
    "Tour",
    "TourPackage",
    "TourImage",
    "TourItinerary",
    "TourInclusion",
    "TourExclusion",
    "TourPricing",
    "TourDepartureDate",
    "Hotel",
    "HotelRoom",
    "Vehicle",
    "TransportService",
    "Transport",
    "Ticket",
    "Booking",
    "BookingTraveller",
    "BookingItem",
    "Enquiry",
    "Quotation",
    "QuotationItem",
    "Payment",
    "Refund",
    "Invoice",
    "Coupon",
    "Offer",
    "Review",
    "Banner",
    "Gallery",
    "BlogCategory",
    "Blog",
    "BlogPost",
    "Page",
    "Notification",
    "GstSetting",
    "CompanySetting",
    "WebsiteSetting",
]
