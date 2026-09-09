"""Foundation smoke tests."""


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "LUXURISSE" in body["service"]


def test_register_and_login_customer(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "customer@example.com",
            "full_name": "Test Customer",
            "phone": "9999999999",
            "password": "Customer1",
        },
    )
    assert register.status_code == 201, register.text
    body = register.json()
    assert body["role"] == "customer"
    assert "password" not in body
    assert "hashed_password" not in body

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "customer@example.com", "password": "Customer1"},
    )
    assert login.status_code == 200, login.text
    data = login.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "customer@example.com"

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["full_name"] == "Test Customer"


def test_admin_reports_requires_auth(client):
    denied = client.get("/api/v1/reports/summary")
    assert denied.status_code == 401

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ok = client.get("/api/v1/reports/summary", headers=headers)
    assert ok.status_code == 200
    summary = ok.json()
    assert "users" in summary
    assert summary["users"] >= 1

    dashboard = client.get("/api/v1/reports/dashboard", headers=headers)
    assert dashboard.status_code == 200, dashboard.text
    body = dashboard.json()
    assert "stats" in body and "charts" in body
    assert body["stats"]["total_bookings"] == 0
    assert body["stats"]["total_revenue"] in (0, "0", "0.00", 0.0) or float(body["stats"]["total_revenue"]) == 0
    assert len(body["charts"]["monthly_bookings"]) == 12
    assert body["charts"]["popular_destinations"] == []
    assert body["charts"]["popular_tours"] == []
    assert "bookings_by_status" in body["charts"]
    assert "revenue_by_payment_method" in body["charts"]
    assert "recent_bookings" in body["charts"]
    assert "avg_booking_value" in body["stats"]
    assert "cancellation_rate" in body["stats"]


def test_public_settings_verified_only(client):
    response = client.get("/api/v1/settings/public")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "pvtltdluxruisses@gmail.com"
    assert body["phone"] == "9294744219"
    assert "Raipur" in body["address"]
    assert body["managing_director"] == "Lucky Nirmalkar"
    assert body["director"] == "Ajay Tarak"
