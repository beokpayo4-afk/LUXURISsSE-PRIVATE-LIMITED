"""Ticket CRUD API tests."""


def _auth_headers(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123"},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _payload(**overrides):
    data = {
        "name": "Delhi → Noida Local Bus",
        "type": "Local Bus",
        "state": "Delhi",
        "from_location": "Delhi",
        "to_location": "Noida",
        "pickup": "Kashmere Gate",
        "drop": "Noida Sector 18",
        "date": "2026-09-05",
        "time": "08:30:00",
        "price": "50.00",
        "status": "Active",
    }
    data.update(overrides)
    return data


def test_ticket_crud(client):
    headers = _auth_headers(client)

    create = client.post("/api/v1/tickets", json=_payload(), headers=headers)
    assert create.status_code == 201, create.text
    body = create.json()
    assert body["name"] == "Delhi → Noida Local Bus"
    assert body["type"] == "Local Bus"
    assert body["state"] == "Delhi"
    assert body["from_location"] == "Delhi"
    assert body["to_location"] == "Noida"
    assert body["pickup"] == "Kashmere Gate"
    assert body["drop"] == "Noida Sector 18"
    assert "total_seats" not in body
    assert "available_seats" not in body
    assert "gst" not in body
    assert "total_price" not in body
    assert "description" not in body
    assert "departure_time" not in body
    assert "arrival_time" not in body
    ticket_id = body["id"]

    listed = client.get("/api/v1/tickets")
    assert listed.status_code == 200
    assert any(row["id"] == ticket_id for row in listed.json())

    active = client.get("/api/v1/tickets", params={"active_only": True})
    assert active.status_code == 200
    assert all(row["status"] == "Active" for row in active.json())

    one = client.get(f"/api/v1/tickets/{ticket_id}")
    assert one.status_code == 200
    assert one.json()["id"] == ticket_id

    updated = client.put(
        f"/api/v1/tickets/{ticket_id}",
        json=_payload(price="75.00", status="Inactive", pickup=None),
        headers=headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["price"] == "75.00"
    assert updated.json()["status"] == "Inactive"
    assert updated.json()["pickup"] is None

    bad = client.post(
        "/api/v1/tickets",
        json=_payload(type="Helicopter"),
        headers=headers,
    )
    assert bad.status_code == 422

    deleted = client.delete(f"/api/v1/tickets/{ticket_id}", headers=headers)
    assert deleted.status_code == 204

    missing = client.get(f"/api/v1/tickets/{ticket_id}")
    assert missing.status_code == 404
