"""LatinHub - Schools module backend tests (incremental feature)."""

import uuid
import pytest
import requests


# --------------------------- GET /api/schools (public list) ---------------------------
class TestSchoolsList:
    def test_list_schools_seeded_five(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/schools")
        assert r.status_code == 200, r.text
        schools = r.json()
        assert isinstance(schools, list)
        assert len(schools) >= 5, f"Expected >=5 seeded schools, got {len(schools)}"
        # Required fields present on every school
        for key in ("id", "name", "slug", "city", "address", "bio",
                    "image_url", "styles", "levels", "students"):
            assert key in schools[0], f"missing {key}"

    def test_list_schools_sorted_by_students_desc(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/schools")
        assert r.status_code == 200
        students = [s["students"] for s in r.json()]
        assert students == sorted(students, reverse=True), f"not desc sorted: {students}"

    def test_filter_by_city_milano(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/schools", params={"city": "Milano"})
        assert r.status_code == 200
        schools = r.json()
        assert len(schools) >= 1
        assert all(s["city"] == "Milano" for s in schools)

    def test_filter_by_style_bachata(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/schools", params={"style": "bachata"})
        assert r.status_code == 200
        schools = r.json()
        assert len(schools) >= 1
        assert all("bachata" in s["styles"] for s in schools), \
            f"Not all schools have bachata: {[s['styles'] for s in schools]}"

    def test_filter_style_all_returns_all(self, api_client, base_url):
        # "all" sentinel should bypass style filter
        all_count = len(api_client.get(f"{base_url}/api/schools").json())
        r = api_client.get(f"{base_url}/api/schools", params={"style": "all"})
        assert r.status_code == 200
        assert len(r.json()) == all_count


# --------------------------- GET /api/schools/{id} ---------------------------
class TestSchoolDetail:
    def test_get_single_school(self, api_client, base_url):
        schools = api_client.get(f"{base_url}/api/schools").json()
        sid = schools[0]["id"]
        r = api_client.get(f"{base_url}/api/schools/{sid}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == sid
        # All fields per School model
        for key in ("name", "slug", "city", "address", "bio", "image_url",
                    "styles", "levels", "students", "verified_by_mauro"):
            assert key in data

    def test_get_missing_school_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/schools/does-not-exist-id")
        assert r.status_code == 404


# --------------------------- POST /api/schools (auth) ---------------------------
VALID_PAYLOAD = {
    "name": "TEST School Modena",
    "city": "Modena",
    "address": "Via Emilia 100, Modena",
    "bio": "Una scuola di test per bachata e salsa. Creata dalla suite di test automatici.",
    "image_url": "https://example.com/school.jpg",
    "styles": ["bachata", "salsa"],
    "levels": ["principianti"],
    "phone": "+39 059 000000",
    "email": "test@school.it",
    "website": "https://school-test.it",
    "instagram": "https://instagram.com/testschool",
}


class TestSchoolCreate:
    def test_post_schools_without_token_401(self, base_url):
        # fresh session - no auth
        r = requests.post(f"{base_url}/api/schools", json=VALID_PAYLOAD)
        assert r.status_code == 401, r.text

    def test_post_schools_with_token_creates(self, api_client, base_url, admin_token):
        payload = dict(VALID_PAYLOAD)
        payload["name"] = f"TEST_School_{uuid.uuid4().hex[:6]}"
        r = api_client.post(
            f"{base_url}/api/schools",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["id"]
        assert data["slug"]
        assert data["owner_id"]  # set from current user
        # GET verification
        r2 = api_client.get(f"{base_url}/api/schools/{data['id']}")
        assert r2.status_code == 200
        assert r2.json()["owner_id"] == data["owner_id"]

    def test_post_bio_too_short_422(self, api_client, base_url, admin_token):
        payload = dict(VALID_PAYLOAD)
        payload["name"] = f"TEST_ShortBio_{uuid.uuid4().hex[:6]}"
        payload["bio"] = "short"  # <10 chars
        r = api_client.post(
            f"{base_url}/api/schools",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 422, r.text

    def test_post_name_too_short_422(self, api_client, base_url, admin_token):
        payload = dict(VALID_PAYLOAD)
        payload["name"] = "A"  # <2 chars
        r = api_client.post(
            f"{base_url}/api/schools",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 422, r.text


# --------------------------- GET /api/my/school ---------------------------
class TestMySchool:
    def test_my_school_without_token_401(self, base_url):
        r = requests.get(f"{base_url}/api/my/school")
        assert r.status_code == 401

    def test_my_school_for_new_user_returns_null(self, api_client, base_url):
        # Register brand new user - they have no school yet
        email = f"TEST_noschool_{uuid.uuid4().hex[:8]}@latinhub.it"
        rr = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "test1234", "name": "No School User"},
        )
        assert rr.status_code == 200, rr.text
        token = rr.json()["access_token"]
        r = api_client.get(
            f"{base_url}/api/my/school",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json() is None, f"expected null, got {r.json()}"

    def test_my_school_returns_created_school(self, api_client, base_url):
        # Register user, create a school, then GET /my/school
        email = f"TEST_owner_{uuid.uuid4().hex[:8]}@latinhub.it"
        rr = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "test1234", "name": "Owner User"},
        )
        assert rr.status_code == 200
        token = rr.json()["access_token"]
        user_id = rr.json()["user"]["id"]

        payload = dict(VALID_PAYLOAD)
        payload["name"] = f"TEST_Owned_{uuid.uuid4().hex[:6]}"
        payload["city"] = "Padova"
        rc = api_client.post(
            f"{base_url}/api/schools",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert rc.status_code == 200, rc.text
        created = rc.json()

        r = api_client.get(
            f"{base_url}/api/my/school",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data is not None
        assert data["id"] == created["id"]
        assert data["owner_id"] == user_id


# --------------------------- Regression (existing features) ---------------------------
class TestRegression:
    def test_events_still_seeded(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        assert r.status_code == 200
        assert len(r.json()) >= 8

    def test_djs_mauro_first_with_spotify(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/djs")
        assert r.status_code == 200
        djs = r.json()
        assert djs[0]["name"] == "Mauro Catalini"
        assert djs[0]["spotify_playlist_url"] == \
            "https://open.spotify.com/embed/playlist/0ItuuWeQtp8f3XfsBrYnOe"

    def test_admin_login_still_works(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "admin@latinhub.it", "password": "admin123"},
        )
        assert r.status_code == 200
        assert r.json()["access_token"]
