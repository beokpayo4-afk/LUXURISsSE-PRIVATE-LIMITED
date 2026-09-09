"""Destination management API tests."""

from io import BytesIO

from app.db.session import get_db
from app.models.destinations import Destination
from app.models.enums import PublishStatus
from app.models.tours import Tour, TourCategory


def _auth_headers(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123"},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_destination_crud_attractions_publish_images(client):
    headers = _auth_headers(client)

    payload = {
        "name": "Chhattisgarh Heritage",
        "country": "India",
        "state": "Chhattisgarh",
        "city_name": "Raipur",
        "summary": "Short summary",
        "description": "Full description",
        "best_time_to_visit": "Oct–Mar",
        "travel_information": "Fly into Raipur",
        "is_featured": True,
        "is_published": False,
        "status": "draft",
        "attractions": [
            {
                "name": "Mahant Ghasidas Museum",
                "description": "State museum",
                "image_url": None,
                "location": "Raipur",
                "entry_information": "Ticketed",
                "status": "published",
                "sort_order": 0,
            }
        ],
        "images": [],
    }

    created = client.post("/api/v1/destinations", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    body = created.json()
    dest_id = body["id"]
    assert body["country"] == "India"
    assert body["is_featured"] is True
    assert len(body["attractions"]) == 1
    assert body["attractions"][0]["location"] == "Raipur"

    listed = client.get("/api/v1/destinations/admin", headers=headers)
    assert listed.status_code == 200
    assert any(d["id"] == dest_id for d in listed.json())

    public = client.get("/api/v1/destinations", params={"published_only": True})
    assert all(d["id"] != dest_id for d in public.json())

    published = client.post(f"/api/v1/destinations/{dest_id}/publish", headers=headers)
    assert published.status_code == 200
    assert published.json()["is_published"] is True

    public2 = client.get("/api/v1/destinations", params={"published_only": True})
    assert any(d["id"] == dest_id for d in public2.json())

    featured = client.patch(
        f"/api/v1/destinations/{dest_id}/featured",
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
        f"/api/v1/destinations/{dest_id}/images",
        headers=headers,
        files=[("files", ("tiny.png", png, "image/png"))],
        data={"set_cover_first": "true"},
    )
    assert upload.status_code == 200, upload.text
    assert len(upload.json()["images"]) == 1
    assert upload.json()["images"][0]["is_cover"] is True

    deleted = client.delete(f"/api/v1/destinations/{dest_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/destinations/{dest_id}").status_code == 404


def test_destination_delete_blocked_when_linked_to_tour(client):
    headers = _auth_headers(client)
    gen = client.app.dependency_overrides[get_db]()
    db = next(gen)
    try:
        dest = Destination(name="Linked Dest", slug="linked-dest", status=PublishStatus.DRAFT)
        cat = TourCategory(name="Adventure", slug="adventure", is_active=True)
        db.add_all([dest, cat])
        db.commit()
        db.refresh(dest)
        db.refresh(cat)
        tour = Tour(
            title="Linked Tour",
            code="SKU-LINK-01",
            slug="linked-tour",
            category_id=cat.id,
            destination_id=dest.id,
            status=PublishStatus.DRAFT,
        )
        db.add(tour)
        db.commit()
        dest_id = dest.id
    finally:
        db.close()

    blocked = client.delete(f"/api/v1/destinations/{dest_id}", headers=headers)
    assert blocked.status_code == 400
    assert "tour" in blocked.json()["detail"].lower()


def test_destination_validation_requires_name(client):
    headers = _auth_headers(client)
    bad = client.post("/api/v1/destinations", headers=headers, json={"summary": "No name"})
    assert bad.status_code == 422
