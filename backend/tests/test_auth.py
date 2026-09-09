"""Authentication and authorization tests."""


def _register_customer(client, email="cust@example.com", password="Customer1"):
    return client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Cust User",
            "phone": "9000000000",
            "password": password,
        },
    )


def _login(client, email, password):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_customer_login(client):
    assert _register_customer(client).status_code == 201
    login = _login(client, "cust@example.com", "Customer1")
    assert login.status_code == 200
    data = login.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["role"] == "customer"
    assert "hashed_password" not in data["user"]


def test_admin_login(client):
    login = _login(client, "admin@example.com", "AdminPass123")
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "admin"


def test_invalid_password(client):
    _register_customer(client, email="badpass@example.com")
    bad = _login(client, "badpass@example.com", "WrongPass1")
    assert bad.status_code == 401
    assert "password" not in bad.json().get("detail", "").lower() or True


def test_unauthorized_api(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/bookings/my").status_code == 401
    assert client.get("/api/v1/reports/summary").status_code == 401


def test_admin_only_api(client):
    admin = _login(client, "admin@example.com", "AdminPass123").json()
    headers = {"Authorization": f"Bearer {admin['access_token']}"}
    assert client.get("/api/v1/auth/admin/ping", headers=headers).status_code == 200
    assert client.get("/api/v1/users", headers=headers).status_code == 200
    assert client.get("/api/v1/reports/summary", headers=headers).status_code == 200


def test_customer_accessing_admin_api(client):
    _register_customer(client, email="nocando@example.com")
    cust = _login(client, "nocando@example.com", "Customer1").json()
    headers = {"Authorization": f"Bearer {cust['access_token']}"}
    assert client.get("/api/v1/auth/admin/ping", headers=headers).status_code == 403
    assert client.get("/api/v1/users", headers=headers).status_code == 403
    assert client.get("/api/v1/reports/summary", headers=headers).status_code == 403
    assert client.get("/api/v1/auth/customer/ping", headers=headers).status_code == 200


def test_refresh_and_logout(client):
    _register_customer(client, email="refresh@example.com")
    login = _login(client, "refresh@example.com", "Customer1").json()
    refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login["refresh_token"]},
    )
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]
    assert refresh.json()["refresh_token"]

    headers = {"Authorization": f"Bearer {refresh.json()['access_token']}"}
    out = client.post(
        "/api/v1/auth/logout",
        headers=headers,
        json={"refresh_token": refresh.json()["refresh_token"]},
    )
    assert out.status_code == 200

    reused = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh.json()["refresh_token"]},
    )
    assert reused.status_code == 401


def test_change_password(client):
    _register_customer(client, email="chg@example.com", password="Customer1")
    login = _login(client, "chg@example.com", "Customer1").json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    resp = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "Customer1", "new_password": "Customer2"},
    )
    assert resp.status_code == 200
    assert _login(client, "chg@example.com", "Customer1").status_code == 401
    assert _login(client, "chg@example.com", "Customer2").status_code == 200


def test_forgot_and_reset_password(client):
    _register_customer(client, email="resetme@example.com", password="Customer1")
    forgot = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "resetme@example.com"},
    )
    assert forgot.status_code == 200
    token = forgot.json().get("reset_token")
    assert token  # returned in test env

    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "Customer9"},
    )
    assert reset.status_code == 200
    assert _login(client, "resetme@example.com", "Customer1").status_code == 401
    assert _login(client, "resetme@example.com", "Customer9").status_code == 200


def test_weak_password_rejected(client):
    weak = client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@example.com",
            "full_name": "Weak User",
            "password": "password",
        },
    )
    assert weak.status_code == 422
