"""Backend tests for Sponsor Detail Page feature (server.py)."""
import requests
import sys

BASE = "https://dj-italia-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@latinfun.it"
ADMIN_PASS = "admin123"
KNOWN_SPONSOR_ID = "8d52d3cd-c576-4786-bcb5-e900dfb0565b"

NEW_FIELDS = [
    "description", "instagram_url", "facebook_url", "tiktok_url",
    "whatsapp", "phone", "email", "address", "tickets_url",
    "signup_url", "event_id",
]

results = []


def log(name, ok, msg=""):
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name}: {msg}")
    results.append((name, ok, msg))


def admin_login():
    r = requests.post(f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"Login failed {r.status_code}: {r.text}"
    return r.json()["access_token"]


def test_1_public_get_known_sponsor():
    r = requests.get(f"{BASE}/sponsors/{KNOWN_SPONSOR_ID}", timeout=15)
    if r.status_code != 200:
        log("1 GET /sponsors/{id} known active", False, f"status={r.status_code} body={r.text[:200]}")
        return
    data = r.json()
    missing = [f for f in NEW_FIELDS if f not in data]
    if missing:
        log("1 GET /sponsors/{id} known active", False, f"missing fields: {missing}")
        return
    if data.get("id") != KNOWN_SPONSOR_ID:
        log("1 GET /sponsors/{id} known active", False, "id mismatch")
        return
    log("1 GET /sponsors/{id} known active", True,
        f"all {len(NEW_FIELDS)} new fields present; brand={data.get('brand')}")


def test_2_404_non_existent():
    r = requests.get(f"{BASE}/sponsors/00000000-0000-0000-0000-000000000000", timeout=15)
    if r.status_code == 404:
        detail = ""
        try:
            detail = r.json().get("detail", "")
        except Exception:
            detail = r.text
        if "non trovato" in detail.lower():
            log("2 GET /sponsors/{nonexistent} -> 404", True, f"detail='{detail}'")
        else:
            log("2 GET /sponsors/{nonexistent} -> 404", False, f"wrong detail: {detail}")
    else:
        log("2 GET /sponsors/{nonexistent} -> 404", False, f"status={r.status_code}")


def test_7_public_no_auth():
    r = requests.get(f"{BASE}/sponsors/{KNOWN_SPONSOR_ID}", timeout=15)
    log("7 GET /sponsors/{id} no-auth (public)", r.status_code == 200, f"status={r.status_code}")


def test_3_create_with_all_fields(token):
    payload = {
        "title": "Test Pro Sponsor",
        "subtitle": "Sub",
        "brand": "TestBrand",
        "image_url": "https://example.com/img.jpg",
        "link_url": "https://example.com",
        "description": "Long description here",
        "instagram_url": "https://instagram.com/test",
        "facebook_url": "https://facebook.com/test",
        "tiktok_url": "https://tiktok.com/@test",
        "whatsapp": "+39 333 1234567",
        "phone": "+39 06 1234567",
        "email": "info@test.it",
        "address": "Via Roma 1, Roma",
        "tickets_url": "https://tickets.com/test",
        "signup_url": "https://signup.com/test",
        "event_id": "some-event-uuid",
        "position": "home_top",
        "priority": 5,
        "active": True,
        "cta_label": "Scopri",
    }
    r = requests.post(
        f"{BASE}/admin/sponsors",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if r.status_code != 200:
        log("3a POST /admin/sponsors with all new fields", False, f"status={r.status_code} body={r.text[:300]}")
        return None
    created = r.json()
    mismatched = [(k, v, created.get(k)) for k, v in payload.items() if created.get(k) != v]
    if mismatched:
        log("3a POST /admin/sponsors with all new fields", False, f"mismatch: {mismatched}")
        return created["id"]
    log("3a POST /admin/sponsors with all new fields", True,
        f"created id={created['id']}; all {len(payload)} fields match")

    gid = created["id"]
    r2 = requests.get(f"{BASE}/sponsors/{gid}", timeout=15)
    if r2.status_code != 200:
        log("3b GET /sponsors/{created_id} public", False, f"status={r2.status_code}")
        return gid
    fetched = r2.json()
    mismatched = [(k, v, fetched.get(k)) for k, v in payload.items() if fetched.get(k) != v]
    if mismatched:
        log("3b GET /sponsors/{created_id} public", False, f"mismatch: {mismatched}")
    else:
        log("3b GET /sponsors/{created_id} public", True, "all fields persisted and returned correctly")
    return gid


def test_4_put_update_description(token, sponsor_id):
    """PUT requires SponsorIn full body (title+image_url required). Real-world flow:
    frontend sends back full payload with only description changed. Verify it works
    and doesn't lose other fields."""
    r = requests.get(f"{BASE}/sponsors/{sponsor_id}", timeout=15)
    if r.status_code != 200:
        log("4 PUT update description", False, f"pre-fetch failed status={r.status_code}")
        return
    current = r.json()
    update = {k: current.get(k) for k in [
        "title", "subtitle", "brand", "image_url", "link_url", "cta_label",
        "position", "priority", "active", "starts_at", "ends_at",
        "description", "instagram_url", "facebook_url", "tiktok_url",
        "whatsapp", "phone", "email", "address", "tickets_url",
        "signup_url", "event_id",
    ]}
    update["description"] = "UPDATED description only"
    r2 = requests.put(
        f"{BASE}/admin/sponsors/{sponsor_id}",
        json=update,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if r2.status_code != 200:
        log("4 PUT update description", False, f"status={r2.status_code} body={r2.text[:300]}")
        return
    updated = r2.json()
    if updated.get("description") != "UPDATED description only":
        log("4 PUT update description", False, f"description not updated: {updated.get('description')}")
        return
    lost = []
    for f in ["title", "subtitle", "brand", "image_url", "instagram_url",
              "facebook_url", "tiktok_url", "whatsapp", "phone", "email",
              "address", "tickets_url", "signup_url", "event_id",
              "link_url", "cta_label", "position", "priority", "active"]:
        if updated.get(f) != current.get(f):
            lost.append((f, current.get(f), updated.get(f)))
    if lost:
        log("4 PUT update description", False, f"lost/changed: {lost}")
        return
    log("4 PUT update description", True, "description updated; all other fields preserved")


def test_5_list_home_top(expected_id):
    r = requests.get(f"{BASE}/sponsors?position=home_top", timeout=15)
    if r.status_code != 200:
        log("5 GET /sponsors?position=home_top regression", False, f"status={r.status_code}")
        return
    arr = r.json()
    if not isinstance(arr, list) or not arr:
        log("5 GET /sponsors?position=home_top regression", False, f"empty or wrong type: {type(arr).__name__}")
        return
    sample = arr[0]
    missing = [f for f in NEW_FIELDS if f not in sample]
    if missing:
        log("5 GET /sponsors?position=home_top regression", False, f"new fields missing in list items: {missing}")
        return
    found_created = any(s.get("id") == expected_id for s in arr) if expected_id else True
    log("5 GET /sponsors?position=home_top regression", True,
        f"count={len(arr)}; new fields present in list items; created in list={found_created}")


def test_6_delete(token, sponsor_id):
    r = requests.delete(
        f"{BASE}/admin/sponsors/{sponsor_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if r.status_code != 200:
        log("6 DELETE cleanup", False, f"status={r.status_code} body={r.text[:200]}")
        return
    r2 = requests.get(f"{BASE}/sponsors/{sponsor_id}", timeout=15)
    log("6 DELETE cleanup", r2.status_code == 404, f"delete ok; post-delete GET={r2.status_code}")


def main():
    print(f"Testing sponsor endpoints @ {BASE}")
    print("=" * 70)

    test_1_public_get_known_sponsor()
    test_2_404_non_existent()
    test_7_public_no_auth()

    token = admin_login()
    print(f"Admin login OK (token len={len(token)})")

    created_id = test_3_create_with_all_fields(token)
    if created_id:
        test_4_put_update_description(token, created_id)
        test_5_list_home_top(created_id)
        test_6_delete(token, created_id)
    else:
        test_5_list_home_top(None)

    print("=" * 70)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"RESULTS: {passed}/{total} passed")
    for name, ok, msg in results:
        print(f"  {'OK ' if ok else 'XX '} {name}: {msg}")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
