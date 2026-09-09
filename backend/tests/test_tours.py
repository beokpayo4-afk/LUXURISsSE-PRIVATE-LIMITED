"""Tour package management API tests."""

from io import BytesIO

from app.db.session import get_db
from app.models.destinations import Destination
from app.models.enums import PublishStatus
from app.models.tours import TourCategory


def _auth_headers(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123"},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _seed_refs(client):
    gen = client.app.dependency_overrides[get_db]()
    db = next(gen)
    try:
        cat = TourCategory(name="Heritage", slug="heritage", is_active=True)
        dest = Destination(name="Raipur", slug="raipur", status=PublishStatus.PUBLISHED)
        db.add_all([cat, dest])
        db.commit()
        db.refresh(cat)
        db.refresh(dest)
        return cat.id, dest.id
    finally:
        db.close()


def test_tour_crud_nested_publish_soft_delete(client):
    headers = _auth_headers(client)
    category_id, destination_id = _seed_refs(client)

    payload = {
        "title": "Raipur Weekend",
        "code": "SKU-RAIPUR-01",
        "category_id": category_id,
        "destination_id": destination_id,
        "duration_days": 3,
        "duration_nights": 2,
        "starting_price": "9999.00",
        "mrp": "12999.00",
        "discount": "3000.00",
        "max_travellers": 12,
        "summary": "Short trip",
        "description": "Full description",
        "highlights": "Local food",
        "hotel_information": "3-star hotel",
        "meal_plan": "MAP",
        "transportation": "AC cab",
        "activities": "City tour",
        "is_featured": True,
        "is_published": False,
        "status": "draft",
        "itineraries": [
            {
                "day_number": 1,
                "title": "Arrival",
                "description": "Check in",
                "meals": "Dinner",
                "hotel": "Hotel A",
                "activities": "Welcome",
            }
        ],
        "inclusions": [{"item": "Breakfast", "sort_order": 0}],
        "exclusions": [{"item": "Flights", "sort_order": 0}],
        "pricing": [
            {
                "label": "Standard",
                "currency": "INR",
                "adult_price": "9999.00",
                "child_price": "6999.00",
                "infant_price": None,
                "is_active": True,
            }
        ],
        "departure_dates": [
            {
                "departure_date": "2026-10-01",
                "seats_total": 20,
                "seats_available": 18,
                "is_active": True,
            }
        ],
        "images": [],
    }

    created = client.post("/api/v1/tours", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    body = created.json()
    tour_id = body["id"]
    assert body["code"] == "SKU-RAIPUR-01"
    assert body["is_featured"] is True
    assert len(body["itineraries"]) == 1
    assert body["itineraries"][0]["meals"] == "Dinner"
    assert len(body["inclusions"]) == 1
    assert len(body["pricing"]) == 1
    assert len(body["departure_dates"]) == 1

    listed = client.get("/api/v1/tours/admin", headers=headers)
    assert listed.status_code == 200
    assert any(t["id"] == tour_id for t in listed.json())

    public = client.get("/api/v1/tours", params={"published_only": True})
    assert public.status_code == 200
    assert all(t["id"] != tour_id for t in public.json())

    published = client.post(f"/api/v1/tours/{tour_id}/publish", headers=headers)
    assert published.status_code == 200
    assert published.json()["is_published"] is True

    public2 = client.get("/api/v1/tours", params={"published_only": True})
    assert any(t["id"] == tour_id for t in public2.json())

    featured = client.patch(
        f"/api/v1/tours/{tour_id}/featured",
        headers=headers,
        json={"is_featured": False},
    )
    assert featured.status_code == 200
    assert featured.json()["is_featured"] is False

    png = BytesIO(
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload = client.post(
        f"/api/v1/tours/{tour_id}/images",
        headers=headers,
        files=[("files", ("tiny.png", png, "image/png"))],
        data={"set_cover_first": "true"},
    )
    assert upload.status_code == 200, upload.text
    assert len(upload.json()["images"]) == 1

    deleted = client.delete(f"/api/v1/tours/{tour_id}", headers=headers)
    assert deleted.status_code == 204

    gone = client.get(f"/api/v1/tours/{tour_id}")
    assert gone.status_code == 404

    admin_after = client.get("/api/v1/tours/admin", headers=headers)
    assert all(t["id"] != tour_id for t in admin_after.json())


def test_tour_validation_requires_fields(client):
    headers = _auth_headers(client)
    bad = client.post("/api/v1/tours", headers=headers, json={"title": "No Code"})
    assert bad.status_code == 422
