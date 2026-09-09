"""Aggregate API v1 routers."""

from fastapi import APIRouter

from app.api.v1 import auth, destinations, galleries, tickets, tours
from app.api.v1.modules import (
    banners_router,
    blog_router,
    bookings_router,
    categories_router,
    coupons_router,
    enquiries_router,
    gst_router,
    health_router,
    hotels_router,
    notifications_router,
    offers_router,
    pages_router,
    payments_router,
    quotations_router,
    reports_router,
    reviews_router,
    roles_router,
    settings_router,
    transport_router,
    users_router,
)

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth.router)
api_router.include_router(users_router)
api_router.include_router(destinations.router)
api_router.include_router(tours.router)
api_router.include_router(categories_router)
api_router.include_router(bookings_router)
api_router.include_router(enquiries_router)
api_router.include_router(quotations_router)
api_router.include_router(payments_router)
api_router.include_router(hotels_router)
api_router.include_router(transport_router)
api_router.include_router(tickets.router)
api_router.include_router(offers_router)
api_router.include_router(coupons_router)
api_router.include_router(reviews_router)
api_router.include_router(blog_router)
api_router.include_router(banners_router)
api_router.include_router(galleries.router)
api_router.include_router(pages_router)
api_router.include_router(notifications_router)
api_router.include_router(roles_router)
api_router.include_router(gst_router)
api_router.include_router(settings_router)
api_router.include_router(reports_router)
