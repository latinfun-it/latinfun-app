"""LatinHub backend API tests."""

import uuid
import pytest


# --------------------------- Health ---------------------------
class TestHealth:
    def test_root_ok(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("app") == "LatinHub"


# --------------------------- Auth ---------------------------
class TestAuth:
    def test_login_admin_success(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "admin@latinhub.it", "password": "admin123"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and data["access_token"]
        assert data["user"]["email"] == "admin@latinhub.it"
        assert data["user"]["role"] == "admin"
        # must NOT leak password_hash or _id
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_login_wrong_password_401(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "admin@latinhub.it", "password": "WRONG_password"},
        )
        assert r.status_code == 401

    def test_register_new_user(self, api_client, base_url):
        # unique email so test is idempotent; server lowercases email
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@latinhub.it"
        r = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "test1234", "name": "Test User"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email.lower()
        assert data["user"]["role"] == "user"
        assert data["access_token"]
        # re-register same email -> 400
        r2 = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "test1234", "name": "Dup"},
        )
        assert r2.status_code == 400

    def test_me_with_token(self, api_client, base_url, admin_token):
        r = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == "admin@latinhub.it"
        assert "password_hash" not in data

    def test_me_without_token_401(self, api_client, base_url):
        # use fresh session, no header
        import requests
        r = requests.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_invalid_token_401(self, api_client, base_url):
        r = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": "Bearer not.a.jwt"},
        )
        assert r.status_code == 401


# --------------------------- Events ---------------------------
class TestEvents:
    def test_list_events_seeded(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list)
        # Problem statement says 8 but seed has 8 distinct items actually - count
        assert len(events) >= 8, f"Expected >=8 seeded events, got {len(events)}"
        first = events[0]
        for key in ("id", "title", "city", "genre", "date", "organizer"):
            assert key in first

    def test_filter_by_genre_bachata(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events", params={"genre": "bachata"})
        assert r.status_code == 200
        events = r.json()
        assert len(events) >= 1
        assert all(e["genre"] == "bachata" for e in events)

    def test_filter_by_city_milano(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events", params={"city": "Milano"})
        assert r.status_code == 200
        events = r.json()
        assert len(events) >= 1
        assert all(e["city"] == "Milano" for e in events)

    def test_filter_featured_true(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events", params={"featured": "true"})
        assert r.status_code == 200
        events = r.json()
        assert len(events) >= 1
        assert all(e["featured"] is True for e in events)

    def test_get_single_event(self, api_client, base_url):
        events = api_client.get(f"{base_url}/api/events").json()
        ev_id = events[0]["id"]
        r = api_client.get(f"{base_url}/api/events/{ev_id}")
        assert r.status_code == 200
        assert r.json()["id"] == ev_id

    def test_get_missing_event_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events/does-not-exist-{uuid.uuid4()}")
        assert r.status_code == 404

    def test_create_event_requires_auth(self, api_client, base_url):
        import requests
        payload = {
            "title": "TEST unauth",
            "description": "x",
            "city": "Milano",
            "venue": "v",
            "address": "a",
            "genre": "bachata",
            "date": "2026-06-01T22:00:00Z",
            "image_url": "https://example.com/x.jpg",
            "lineup": [],
        }
        r = requests.post(f"{base_url}/api/events", json=payload)
        assert r.status_code == 401

    def test_create_event_with_token(self, api_client, base_url, admin_token):
        payload = {
            "title": f"TEST_Event_{uuid.uuid4().hex[:6]}",
            "description": "Created by test",
            "city": "Milano",
            "venue": "Test Venue",
            "address": "Via Test 1",
            "genre": "bachata",
            "date": "2026-06-01T22:00:00Z",
            "image_url": "https://example.com/x.jpg",
            "lineup": ["Mauro Catalini"],
            "ticket_url": "https://example.com/ticket",
            "latitude": 45.46,
            "longitude": 9.19,
        }
        r = api_client.post(
            f"{base_url}/api/events",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        ev = r.json()
        assert ev["title"] == payload["title"]
        assert ev["organizer"] == "Mauro Catalini"  # from admin user name
        # verify persistence via GET
        r2 = api_client.get(f"{base_url}/api/events/{ev['id']}")
        assert r2.status_code == 200
        assert r2.json()["title"] == payload["title"]


# --------------------------- DJs ---------------------------
class TestDJs:
    def test_list_djs_sorted_by_followers(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/djs")
        assert r.status_code == 200
        djs = r.json()
        assert len(djs) >= 6
        followers = [d["followers"] for d in djs]
        assert followers == sorted(followers, reverse=True)
        assert djs[0]["name"] == "Mauro Catalini"

    def test_filter_verified_true(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/djs", params={"verified": "true"})
        assert r.status_code == 200
        djs = r.json()
        assert len(djs) >= 1
        assert all(d["verified_by_mauro"] is True for d in djs)

    def test_get_single_dj_has_spotify(self, api_client, base_url):
        djs = api_client.get(f"{base_url}/api/djs").json()
        mauro = next(d for d in djs if d["name"] == "Mauro Catalini")
        r = api_client.get(f"{base_url}/api/djs/{mauro['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data["spotify_playlist_url"]
        assert data["spotify_playlist_url"].startswith("http")


# --------------------------- Mixes ---------------------------
class TestMixes:
    def test_list_mixes_seeded(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/mixes")
        assert r.status_code == 200
        mixes = r.json()
        assert len(mixes) >= 5
        assert all(m.get("audio_url", "").startswith("http") for m in mixes)

    def test_filter_mixes_bachata(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/mixes", params={"genre": "bachata"})
        assert r.status_code == 200
        mixes = r.json()
        assert len(mixes) >= 1
        assert all(m["genre"] == "bachata" for m in mixes)

    def test_get_mix_increments_plays(self, api_client, base_url):
        mixes = api_client.get(f"{base_url}/api/mixes").json()
        mix_id = mixes[0]["id"]
        before = mixes[0]["plays"]
        r = api_client.get(f"{base_url}/api/mixes/{mix_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == mix_id
        assert data["plays"] == before + 1


# --------------------------- Cities ---------------------------
class TestCities:
    def test_cities_sorted(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cities")
        assert r.status_code == 200
        cities = r.json()
        assert isinstance(cities, list)
        assert len(cities) >= 1
        assert cities == sorted(cities)
        # seeded italian cities present
        assert "Milano" in cities
