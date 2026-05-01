"""
LatinFun v1.1 - Backend tests for the new Organizer system.

Tests:
  1. Organizer activation endpoints (GET/POST /api/me/organizer)
  2. Organizer required for event/dj/school creation
  3. Anti-duplicate event (same venue+city+day)
  4. Admin organizer management (list/verify/unverify/revoke)
  5. Regression: GET /api/events/my/venues
"""

import os
import sys
import uuid
import json
import requests
from datetime import datetime, timedelta

BASE = "https://dj-italia-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@latinfun.it"
ADMIN_PASSWORD = "admin123"

IMG = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1080&h=1080&fit=crop"

results = []  # {test, status, detail}


def log(test, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {test} -> {detail}")
    results.append({"test": test, "status": status, "detail": detail})
    return ok


def jpost(path, token=None, body=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.post(f"{BASE}{path}", headers=h, json=body or {}, timeout=30)


def jget(path, token=None, params=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.get(f"{BASE}{path}", headers=h, params=params, timeout=30)


def jdelete(path, token=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.delete(f"{BASE}{path}", headers=h, timeout=30)


def register_user(email, password, name):
    r = jpost("/auth/register", body={"email": email, "password": password, "name": name})
    if r.status_code == 200:
        return r.json()
    if r.status_code == 400 and "already" in r.text.lower():
        rl = jpost("/auth/login", body={"email": email, "password": password})
        if rl.status_code == 200:
            return rl.json()
    raise RuntimeError(f"register failed: {r.status_code} {r.text}")


def login_user(email, password):
    r = jpost("/auth/login", body={"email": email, "password": password})
    if r.status_code == 200:
        return r.json()
    raise RuntimeError(f"login failed: {r.status_code} {r.text}")


def make_event_payload(venue=None, city=None, when=None, **over):
    if when is None:
        when = (datetime.utcnow() + timedelta(days=60)).replace(microsecond=0)
    iso = when.isoformat()
    body = {
        "title": over.get("title", f"Test Serata {uuid.uuid4().hex[:6]}"),
        "description": "Serata di test creata dal backend test runner. Solo per QA.",
        "city": city or "Milano",
        "venue": venue or f"Test Venue {uuid.uuid4().hex[:6]}",
        "address": "Via Test 123",
        "genre": "Bachata, Salsa",
        "date": iso,
        "image_url": IMG,
        "lineup": ["DJ Test"],
        "organizer_type": "dj",
        "country": "IT",
    }
    body.update(over)
    return body


def make_dj_payload():
    return {
        "name": f"DJ QA {uuid.uuid4().hex[:5]}",
        "bio": "DJ di test creato dal backend tester per QA.",
        "city": "Milano",
        "genres": ["Bachata"],
        "image_url": IMG,
        "country": "IT",
    }


def make_school_payload():
    return {
        "name": f"Scuola QA {uuid.uuid4().hex[:5]}",
        "city": "Milano",
        "address": "Via Scuola 1",
        "bio": "Scuola di prova creata dal backend tester per QA.",
        "image_url": IMG,
        "styles": ["bachata"],
        "levels": ["principianti"],
        "country": "IT",
    }


def test_1_organizer_activation():
    print("\n=== TEST 1: Organizer activation endpoints ===")
    rnd = uuid.uuid4().hex[:8]
    email = f"org_test_{rnd}@example.com"
    pwd = "testpass123"
    name = f"Org Test {rnd}"

    a = register_user(email, pwd, name)
    token = a["access_token"]
    user_id = a["user"]["id"]
    log("1.1 register new user", True, f"user_id={user_id}")

    b = login_user(email, pwd)
    token = b["access_token"]
    log("1.2 login user", True, f"token len={len(token)}")

    r = jget("/me/organizer", token=token)
    ok = r.status_code == 200 and r.json().get("is_organizer") is False
    log("1.3 GET /me/organizer expect is_organizer=false", ok, f"{r.status_code} {r.text[:200]}")

    r = jpost("/me/organizer", token=token, body={
        "organizer_type": "dj", "business_name": "DJ Test", "phone": "",
    })
    ok = r.status_code == 400 and "telefono" in r.text.lower()
    log("1.4 POST /me/organizer empty phone -> 400 'telefono'", ok, f"{r.status_code} {r.text[:200]}")

    r = jpost("/me/organizer", token=token, body={
        "organizer_type": "dj", "business_name": "", "phone": "+393471234567",
    })
    ok = r.status_code == 400 and "obbligatorio" in r.text.lower()
    log("1.5 POST /me/organizer empty business_name -> 400 'obbligatorio'", ok, f"{r.status_code} {r.text[:200]}")

    valid = {
        "organizer_type": "dj",
        "business_name": "DJ Test Mauro",
        "phone": "+393471234567",
        "tax_id": "IT12345678901",
        "instagram": "@djtest",
        "website": "https://djtest.com",
    }
    r = jpost("/me/organizer", token=token, body=valid)
    ok_status = r.status_code == 200
    body = r.json() if ok_status else {}
    detail = json.dumps(body)[:300] if ok_status else r.text[:300]
    ok = ok_status and body.get("business_name") == "DJ Test Mauro" and body.get("user_id") == user_id
    log("1.6 POST /me/organizer valid -> 200 OrganizerProfile", ok, detail)

    r = jget("/me/organizer", token=token)
    j = r.json() if r.status_code == 200 else {}
    ok = (
        r.status_code == 200
        and j.get("is_organizer") is True
        and j.get("verified") is False
        and j.get("business_name") == "DJ Test Mauro"
    )
    log("1.7 GET /me/organizer expect is_organizer=true, verified=false", ok, json.dumps(j)[:300])

    return {"email": email, "password": pwd, "token": token, "user_id": user_id}


def test_2_organizer_required():
    print("\n=== TEST 2: Organizer required for event/dj/school ===")
    rnd = uuid.uuid4().hex[:8]
    email = f"nontoreal_{rnd}@example.com"
    pwd = "pass123"
    name = f"Non Real {rnd}"
    a = register_user(email, pwd, name)
    token = a["access_token"]
    user_id = a["user"]["id"]

    ev_payload = make_event_payload(
        venue=f"Pre-Activate {uuid.uuid4().hex[:5]}",
        when=(datetime.utcnow() + timedelta(days=80)).replace(microsecond=0),
    )
    r = jpost("/events", token=token, body=ev_payload)
    txt = r.text
    ok = r.status_code == 403 and ("Organizzatore" in txt or "attivare" in txt.lower())
    log("2.1 POST /events without organizer -> 403", ok, f"{r.status_code} {txt[:300]}")

    r = jpost("/djs", token=token, body=make_dj_payload())
    ok = r.status_code == 403
    log("2.2 POST /djs without organizer -> 403", ok, f"{r.status_code} {r.text[:200]}")

    r = jpost("/schools", token=token, body=make_school_payload())
    ok = r.status_code == 403
    log("2.3 POST /schools without organizer -> 403", ok, f"{r.status_code} {r.text[:200]}")

    valid = {
        "organizer_type": "promoter",
        "business_name": "QA Promoter",
        "phone": "+393471112222",
    }
    r = jpost("/me/organizer", token=token, body=valid)
    ok = r.status_code == 200
    log("2.4 activate organizer for follow-up", ok, f"{r.status_code} {r.text[:200]}")

    ev_payload = make_event_payload(
        venue=f"QA Promoter Venue {uuid.uuid4().hex[:5]}",
        city="Milano",
        when=(datetime.utcnow() + timedelta(days=120)).replace(microsecond=0),
    )
    r = jpost("/events", token=token, body=ev_payload)
    ok = r.status_code == 200
    created_id = r.json().get("id") if ok else None
    log("2.5 POST /events after organizer activation -> 200", ok, f"{r.status_code} id={created_id}")

    return {"email": email, "token": token, "user_id": user_id, "created_event_id": created_id}


def test_3_anti_duplicate(admin_token):
    print("\n=== TEST 3: Anti-duplicate event ===")
    when = datetime(2026, 12, 25, 22, 0, 0)
    venue = f"Test Venue Dup {uuid.uuid4().hex[:5]}"
    city = "Roma"
    p1 = make_event_payload(venue=venue, city=city, when=when, title="Originale Test Dup")

    r = jpost("/events", token=admin_token, body=p1)
    ok = r.status_code == 200
    ev1 = r.json() if ok else {}
    log("3.1 first POST /events (admin) -> 200", ok, f"{r.status_code} id={ev1.get('id')}")
    created_ids = [ev1.get("id")] if ok else []

    p2 = make_event_payload(venue=venue, city=city, when=when.replace(hour=23), title="Duplicato Test Dup")
    r = jpost("/events", token=admin_token, body=p2)
    ok = r.status_code == 409 and "Esiste già un evento" in r.text
    log("3.2 duplicate POST /events same venue+city+day -> 409 'Esiste già un evento'", ok, f"{r.status_code} {r.text[:300]}")

    p3 = make_event_payload(venue=venue, city=city, when=when + timedelta(days=2), title="Stesso locale altra data")
    r = jpost("/events", token=admin_token, body=p3)
    ok = r.status_code == 200
    ev3 = r.json() if ok else {}
    log("3.3 same venue+city different date -> 200", ok, f"{r.status_code} id={ev3.get('id')}")
    if ok:
        created_ids.append(ev3.get("id"))

    for eid in created_ids:
        if eid:
            try:
                jdelete(f"/events/{eid}", token=admin_token)
            except Exception:
                pass

    return created_ids


def test_4_admin_organizer_mgmt(admin_token, t1_user):
    print("\n=== TEST 4: Admin organizer management ===")
    user_id = t1_user["user_id"]
    user_token = t1_user["token"]

    r = jget("/admin/organizers", token=admin_token)
    ok = r.status_code == 200 and isinstance(r.json(), list)
    found = False
    if ok:
        for item in r.json():
            if item.get("user_id") == user_id:
                found = True
                break
    log("4.1 GET /admin/organizers includes Test 1 user", ok and found, f"{r.status_code} count={len(r.json()) if ok else 0} found={found}")

    r = jpost(f"/admin/organizers/{user_id}/verify", token=admin_token)
    ok = r.status_code == 200 and r.json().get("ok") is True and r.json().get("verified") is True
    log("4.2 POST /admin/organizers/{id}/verify -> {ok:true, verified:true}", ok, f"{r.status_code} {r.text[:200]}")

    r = jget("/me/organizer", token=user_token)
    j = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and j.get("verified") is True
    log("4.3 GET /me/organizer (user) expect verified=true", ok, json.dumps(j)[:300])

    r = jpost(f"/admin/organizers/{user_id}/unverify", token=admin_token)
    ok = r.status_code == 200 and r.json().get("verified") is False
    log("4.4 POST /admin/organizers/{id}/unverify -> verified:false", ok, f"{r.status_code} {r.text[:200]}")

    r = jget("/me/organizer", token=user_token)
    j = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and j.get("verified") is False
    log("4.4b GET /me/organizer (user) expect verified=false after unverify", ok, json.dumps(j)[:300])

    r = jdelete(f"/admin/organizers/{user_id}", token=admin_token)
    ok = r.status_code == 200 and r.json().get("ok") is True and r.json().get("revoked") is True
    log("4.5 DELETE /admin/organizers/{id} -> {ok:true, revoked:true}", ok, f"{r.status_code} {r.text[:200]}")

    r = jpost("/events", token=user_token, body=make_event_payload(
        venue=f"After Revoke {uuid.uuid4().hex[:5]}",
        city="Milano",
        when=(datetime.utcnow() + timedelta(days=200)).replace(microsecond=0),
    ))
    ok = r.status_code == 403
    log("4.6 user POST /events after revoke -> 403", ok, f"{r.status_code} {r.text[:200]}")

    rnd = uuid.uuid4().hex[:6]
    email = f"plain_{rnd}@example.com"
    a = register_user(email, "pass1234", f"Plain {rnd}")
    plain_token = a["access_token"]
    r = jget("/admin/organizers", token=plain_token)
    ok = r.status_code == 403
    log("4.7 non-admin GET /admin/organizers -> 403", ok, f"{r.status_code} {r.text[:200]}")


def test_5_my_venues(admin_token):
    print("\n=== TEST 5: Regression /events/my/venues ===")
    r = jget("/events/my/venues", token=admin_token)
    ok = r.status_code == 200 and isinstance(r.json(), list)
    log("5.1 GET /events/my/venues (admin) returns list", ok, f"{r.status_code} count={len(r.json()) if ok else 0}")


def main():
    print(f"BASE: {BASE}")
    a = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_token = a["access_token"]
    log("0.0 admin login", True, f"name={a['user'].get('name')} role={a['user'].get('role')}")

    t1_user = test_1_organizer_activation()
    test_2_organizer_required()
    test_3_anti_duplicate(admin_token)
    test_4_admin_organizer_mgmt(admin_token, t1_user)
    test_5_my_venues(admin_token)

    print("\n========== SUMMARY ==========")
    pass_count = sum(1 for r in results if r["status"] == "PASS")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    print(f"PASS: {pass_count}  FAIL: {fail_count}")
    for r in results:
        if r["status"] == "FAIL":
            print(f"  FAIL: {r['test']}  ->  {r['detail']}")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
