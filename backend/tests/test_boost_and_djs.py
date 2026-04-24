"""Incremental tests for:
  - Stripe BOOST flow (POST /api/events/{id}/boost, GET /api/payments/status/{session_id})
  - DJ self-registration (POST /api/djs, GET /api/my/dj)
  - Regressions: admin login, playlists 'LATINHUB' rename, DJs seed, schools seed
"""

import os
import uuid
import pytest
import requests


# ------------------------- helpers ---------------------------------------
def _register_user(api_client, base_url, email=None, name="TEST User"):
    email = email or f"TEST_{uuid.uuid4().hex[:10]}@example.com"
    r = api_client.post(
        f"{base_url}/api/auth/register",
        json={"email": email, "password": "test1234", "name": name},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    return body["access_token"], body["user"]


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ------------------------- Regression: auth login -----------------------
class TestAuthRegression:
    def test_admin_login_200(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "admin@latinhub.it", "password": "admin123"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body and body["access_token"]
        assert body["user"]["role"] == "admin"
        assert body["user"]["email"] == "admin@latinhub.it"


# ------------------------- Event create (owner_id) -----------------------
class TestEventCreateAsAdmin:
    def test_admin_create_event_sets_owner_id(self, api_client, base_url, admin_token):
        # fetch admin id
        me = api_client.get(
            f"{base_url}/api/auth/me", headers=_auth_headers(admin_token)
        )
        assert me.status_code == 200
        admin_id = me.json()["id"]

        payload = {
            "title": "TEST_BoostEvent",
            "description": "Evento di test per il flusso di boost",
            "city": "Milano",
            "venue": "Test Venue",
            "address": "Via Test 1",
            "genre": "bachata",
            "date": "2030-01-01T22:00:00Z",
            "image_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
            "lineup": ["DJ Test"],
            "ticket_url": "https://example.com/ticket",
        }
        r = api_client.post(
            f"{base_url}/api/events",
            json=payload,
            headers=_auth_headers(admin_token),
        )
        assert r.status_code == 200, r.text
        ev = r.json()
        assert ev["owner_id"] == admin_id
        assert ev["title"] == payload["title"]
        assert ev["organizer"] == "Mauro Catalini"  # admin display name
        assert ev["boosted"] is False
        pytest.admin_event_id = ev["id"]  # share across tests
        pytest.admin_id = admin_id


# ------------------------- BOOST endpoint -------------------------------
class TestBoostEvent:
    def test_boost_requires_auth_401(self, api_client, base_url):
        eid = getattr(pytest, "admin_event_id", None)
        assert eid, "admin_event_id missing from previous test"
        r = api_client.post(
            f"{base_url}/api/events/{eid}/boost",
            json={"origin_url": "https://example.com"},
        )
        assert r.status_code == 401, r.text

    def test_boost_forbidden_for_non_owner_non_admin_403(
        self, api_client, base_url
    ):
        eid = getattr(pytest, "admin_event_id", None)
        assert eid
        token, _ = _register_user(api_client, base_url)
        r = api_client.post(
            f"{base_url}/api/events/{eid}/boost",
            json={"origin_url": "https://example.com"},
            headers=_auth_headers(token),
        )
        assert r.status_code == 403, r.text

    def test_boost_admin_creates_checkout_session(
        self, api_client, base_url, admin_token
    ):
        eid = getattr(pytest, "admin_event_id", None)
        assert eid
        r = api_client.post(
            f"{base_url}/api/events/{eid}/boost",
            json={"origin_url": "https://example.com"},
            headers=_auth_headers(admin_token),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["amount"] == 9.99
        assert body["currency"] == "eur"
        assert body["session_id"] and isinstance(body["session_id"], str)
        assert body["checkout_url"].startswith("http"), body["checkout_url"]
        pytest.boost_session_id = body["session_id"]

    def test_payment_transaction_recorded_in_db(self, base_url):
        """Verify payment_transactions doc was written with status=initiated and payment_status=pending
        immediately after the boost call (before any Stripe polling)."""
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient

        sid = getattr(pytest, "boost_session_id", None)
        assert sid

        async def _check():
            c = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            db = c[os.environ.get("DB_NAME", "test_database")]
            tx = await db.payment_transactions.find_one({"session_id": sid}, {"_id": 0})
            c.close()
            return tx

        tx = asyncio.get_event_loop().run_until_complete(_check())
        assert tx is not None, "payment_transactions row missing for the boost session"
        assert tx["status"] == "initiated"
        assert tx["payment_status"] == "pending"
        assert tx["amount"] == 9.99
        assert tx["currency"] == "eur"
        assert tx["event_id"] == getattr(pytest, "admin_event_id")
        assert tx["user_id"] == getattr(pytest, "admin_id")
        assert tx["metadata"].get("purpose") == "boost_event"

    def test_payment_status_returns_checkout_state(
        self, api_client, base_url, admin_token
    ):
        """Polls GET /api/payments/status/{session_id}. Documents if the Stripe
        integration returns 500 due to checkout.session retrieval failure."""
        sid = getattr(pytest, "boost_session_id", None)
        assert sid
        r = api_client.get(f"{base_url}/api/payments/status/{sid}")
        if r.status_code == 500:
            pytest.fail(
                "GET /api/payments/status/{session_id} returned 500 — Stripe "
                "could not retrieve the session it just created. This is a "
                "backend/integration bug: emergentintegrations create->retrieve "
                "mismatch or unhandled CheckoutError (no try/except around "
                "stripe.get_checkout_status in server.py line 402)."
            )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["currency"] == "eur"
        assert body["event_id"] == getattr(pytest, "admin_event_id")
        assert body["boosted"] is False  # not yet paid

    def test_payment_status_404_for_unknown_session(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/payments/status/invalid-session-xyz")
        assert r.status_code == 404, r.text

    def test_boost_404_for_unknown_event(self, api_client, base_url, admin_token):
        r = api_client.post(
            f"{base_url}/api/events/does-not-exist/boost",
            json={"origin_url": "https://example.com"},
            headers=_auth_headers(admin_token),
        )
        assert r.status_code == 404, r.text


# ------------------------- DJ registration -----------------------------
class TestDJRegistration:
    def test_create_dj_requires_auth_401(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/djs",
            json={
                "name": "TEST DJ",
                "bio": "Some bio long enough to pass.",
                "city": "Milano",
                "image_url": "https://example.com/dj.jpg",
            },
        )
        assert r.status_code == 401, r.text

    def test_create_dj_validation_bio_too_short_422(self, api_client, base_url):
        token, _ = _register_user(api_client, base_url)
        r = api_client.post(
            f"{base_url}/api/djs",
            json={
                "name": "TEST DJ",
                "bio": "short",  # < 10 chars
                "city": "Milano",
                "image_url": "https://example.com/dj.jpg",
            },
            headers=_auth_headers(token),
        )
        assert r.status_code == 422, r.text

    def test_create_dj_validation_name_too_short_422(self, api_client, base_url):
        token, _ = _register_user(api_client, base_url)
        r = api_client.post(
            f"{base_url}/api/djs",
            json={
                "name": "A",  # < 2 chars
                "bio": "Bio sufficiently long to pass validation.",
                "city": "Milano",
                "image_url": "https://example.com/dj.jpg",
            },
            headers=_auth_headers(token),
        )
        assert r.status_code == 422, r.text

    def test_create_dj_ok_returns_slug_and_owner(self, api_client, base_url):
        token, user = _register_user(api_client, base_url)
        payload = {
            "name": f"TEST DJ {uuid.uuid4().hex[:6]}",
            "bio": "Una bio abbastanza lunga per superare la validazione di lunghezza minima.",
            "city": "Milano",
            "genres": ["bachata"],
            "image_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
            "instagram": "https://instagram.com/testdj",
        }
        r = api_client.post(
            f"{base_url}/api/djs", json=payload, headers=_auth_headers(token)
        )
        assert r.status_code == 200, r.text
        dj = r.json()
        assert dj["owner_id"] == user["id"]
        assert dj["slug"], "slug must be auto-generated"
        assert dj["name"] == payload["name"]
        assert dj["city"] == "Milano"
        # GET /api/my/dj should now return this DJ
        g = api_client.get(
            f"{base_url}/api/my/dj", headers=_auth_headers(token)
        )
        assert g.status_code == 200
        body = g.json()
        assert body is not None
        assert body["id"] == dj["id"]
        assert body["slug"] == dj["slug"]

    def test_my_dj_requires_auth_and_returns_null_for_new_user(
        self, api_client, base_url
    ):
        # unauthenticated
        r = api_client.get(f"{base_url}/api/my/dj")
        assert r.status_code == 401
        # new user with no DJ
        token, _ = _register_user(api_client, base_url)
        r = api_client.get(f"{base_url}/api/my/dj", headers=_auth_headers(token))
        assert r.status_code == 200
        assert r.json() is None


# ------------------------- Regression: playlists/DJs/schools -----------
class TestSeedRegression:
    def test_playlists_position_1_is_latinhub(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/playlists")
        assert r.status_code == 200
        playlists = r.json()
        assert len(playlists) >= 1
        first = playlists[0]
        assert first["position"] == 1
        assert first["title"] == "LATINHUB", f"got {first['title']!r}"
        assert first["featured"] is True

    def test_djs_mauro_first(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/djs")
        assert r.status_code == 200
        djs = r.json()
        assert len(djs) >= 1
        assert djs[0]["name"] == "Mauro Catalini"
        assert djs[0]["verified_by_mauro"] is True

    def test_schools_five_seeded(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/schools")
        assert r.status_code == 200
        schools = r.json()
        # At least the 5 seeded Italian schools must be present (other tests may add more)
        seeded_cities = {"Milano", "Roma", "Napoli", "Bologna", "Torino"}
        present_cities = {s["city"] for s in schools}
        assert seeded_cities.issubset(present_cities), (
            f"missing seeded cities: {seeded_cities - present_cities}"
        )
        assert len(schools) >= 5
