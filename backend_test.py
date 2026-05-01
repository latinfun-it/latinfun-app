"""
LatinFun v1.1 backend tests.
- Event organizer_type / end_date
- Anti-flood (max 3 events / 24h for non-admin)
- GET /api/events/my/venues (autocomplete locali frequenti)
- Regression: GET /api/events still works
"""
import os
import sys
import time
import uuid
import json
import random
import string
import requests
from datetime import datetime, timezone, timedelta

BASE = "https://dj-italia-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@latinfun.it"
ADMIN_PASS = "admin123"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
INFO = "\033[94mINFO\033[0m"

results = []


def log(tag, msg):
    print(f"[{tag}] {msg}")


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    log(PASS if ok else FAIL, f"{name} — {detail}" if detail else name)


def login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
    r.raise_for_status()
    return r.json()["access_token"]


def register(email, password, name):
    r = requests.post(f"{BASE}/auth/register", json={"email": email, "password": password, "name": name}, timeout=20)
    if r.status_code == 400 and "already" in r.text.lower():
        return login(email, password)
    r.raise_for_status()
    return r.json()["access_token"]


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}"}


def base_event_payload(title="Test Latin Night V1.1", organizer_type="dj", with_end=True):
    payload = {
        "title": title,
        "description": "Serata test con nuovi campi v1.1",
        "city": "Roma",
        "venue": "Test Cafe",
        "address": "Via Test 1, Roma",
        "genre": "Bachata, Salsa, Reggaeton",
        "date": "2026-08-15T22:00:00",
        "image_url": "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
        "lineup": ["DJ Test"],
        "country": "IT",
    }
    if with_end:
        payload["end_date"] = "2026-08-16T04:00:00"
    if organizer_type is not None:
        payload["organizer_type"] = organizer_type
    return payload


def cleanup_events(tok, ids):
    for eid in ids:
        try:
            requests.delete(f"{BASE}/events/{eid}", headers=auth_h(tok), timeout=10)
        except Exception:
            pass


# --------------------------------------------------------------------
# Task 1
# --------------------------------------------------------------------
def task1_event_model_new_fields():
    print("\n=== TASK 1: Event model with organizer_type, end_date ===")
    try:
        tok = login(ADMIN_EMAIL, ADMIN_PASS)
    except Exception as e:
        record("Task1 admin login", False, f"Login failed: {e}")
        return

    created_ids = []
    # 1a: create with organizer_type + end_date
    payload = base_event_payload(title=f"Task1 With Fields {uuid.uuid4().hex[:6]}",
                                 organizer_type="dj", with_end=True)
    r = requests.post(f"{BASE}/events", json=payload, headers=auth_h(tok), timeout=20)
    if r.status_code != 200:
        record("POST /events with organizer_type+end_date returns 200", False,
               f"status={r.status_code} body={r.text[:300]}")
    else:
        body = r.json()
        eid = body.get("id")
        created_ids.append(eid)
        ot_ok = body.get("organizer_type") == "dj"
        ed = body.get("end_date")
        ed_ok = ed is not None and "2026-08-16" in str(ed)
        record("POST /events organizer_type=dj returned correctly",
               ot_ok, f"organizer_type={body.get('organizer_type')}")
        record("POST /events end_date returned correctly",
               ed_ok, f"end_date={ed}")

        # GET /events/{id} verify persistence
        r2 = requests.get(f"{BASE}/events/{eid}", timeout=20)
        if r2.status_code != 200:
            record("GET /events/{id} after create", False, f"status={r2.status_code}")
        else:
            b2 = r2.json()
            ok = (b2.get("organizer_type") == "dj"
                  and b2.get("end_date") is not None
                  and "2026-08-16" in str(b2.get("end_date")))
            record("GET /events/{id} persists organizer_type+end_date",
                   ok, f"organizer_type={b2.get('organizer_type')} end_date={b2.get('end_date')}")

    # 1b: create WITHOUT end_date / organizer_type — should still work
    payload2 = base_event_payload(title=f"Task1 No Optional {uuid.uuid4().hex[:6]}",
                                  organizer_type=None, with_end=False)
    r3 = requests.post(f"{BASE}/events", json=payload2, headers=auth_h(tok), timeout=20)
    if r3.status_code != 200:
        record("POST /events without organizer_type/end_date returns 200", False,
               f"status={r3.status_code} body={r3.text[:300]}")
    else:
        b3 = r3.json()
        created_ids.append(b3.get("id"))
        ok = b3.get("organizer_type") is None and b3.get("end_date") is None
        record("Optional fields default to None when omitted",
               ok, f"organizer_type={b3.get('organizer_type')} end_date={b3.get('end_date')}")

    cleanup_events(tok, created_ids)


# --------------------------------------------------------------------
# Task 2 — Anti-flood
# --------------------------------------------------------------------
def task2_anti_flood():
    print("\n=== TASK 2: Anti-flood (max 3/day non-admin) ===")
    rnd = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    email = f"floodtest_{rnd}@example.com"
    pw = "floodtest123"
    name = f"Flood Tester {rnd}"

    try:
        tok = register(email, pw, name)
    except Exception as e:
        record("Task2 register flood user", False, f"{e}")
        return

    user_event_ids = []
    # 3 events should succeed
    for i in range(3):
        p = base_event_payload(title=f"Flood Event #{i+1} {rnd}", organizer_type="promoter")
        r = requests.post(f"{BASE}/events", json=p, headers=auth_h(tok), timeout=20)
        if r.status_code == 200:
            user_event_ids.append(r.json().get("id"))
            record(f"Non-admin event {i+1}/3 returns 200", True, "")
        else:
            record(f"Non-admin event {i+1}/3 returns 200", False,
                   f"status={r.status_code} body={r.text[:200]}")

    # 4th should be 429
    p4 = base_event_payload(title=f"Flood Event #4 {rnd}", organizer_type="promoter")
    r4 = requests.post(f"{BASE}/events", json=p4, headers=auth_h(tok), timeout=20)
    if r4.status_code == 429:
        msg_ok = "limite di 3 eventi al giorno" in r4.text.lower() or "limite di 3 eventi" in r4.text
        record("4th event returns HTTP 429", True, "")
        record("429 detail contains Italian rate-limit message",
               msg_ok, f"detail={r4.text[:200]}")
    else:
        record("4th event returns HTTP 429", False,
               f"got status={r4.status_code} body={r4.text[:200]}")

    cleanup_events(tok, user_event_ids)

    # Admin: 5 events should succeed
    try:
        admin_tok = login(ADMIN_EMAIL, ADMIN_PASS)
    except Exception as e:
        record("Task2 admin login", False, f"{e}")
        return

    admin_ids = []
    admin_ok = 0
    for i in range(5):
        p = base_event_payload(title=f"Admin Flood {rnd} #{i+1}", organizer_type="dj")
        r = requests.post(f"{BASE}/events", json=p, headers=auth_h(admin_tok), timeout=20)
        if r.status_code == 200:
            admin_ok += 1
            admin_ids.append(r.json().get("id"))
        else:
            log(INFO, f"Admin event {i+1}/5 status={r.status_code} body={r.text[:200]}")
    record("Admin can create 5 events without rate-limit",
           admin_ok == 5, f"{admin_ok}/5 succeeded")

    cleanup_events(admin_tok, admin_ids)


# --------------------------------------------------------------------
# Task 3 — venues autocomplete
# --------------------------------------------------------------------
def task3_my_venues():
    print("\n=== TASK 3: GET /api/events/my/venues ===")

    # Unauthenticated
    r = requests.get(f"{BASE}/events/my/venues", timeout=15)
    record("Unauthenticated GET /events/my/venues returns 401",
           r.status_code in (401, 403),
           f"status={r.status_code}")

    # Use a fresh non-admin user but admin is exempt from rate-limit so easier;
    # task said login as admin and post 4 events, so use admin
    try:
        tok = login(ADMIN_EMAIL, ADMIN_PASS)
    except Exception as e:
        record("Task3 admin login", False, f"{e}")
        return

    # To avoid noise from existing admin events polluting top of list,
    # we use a unique venue name
    rnd = uuid.uuid4().hex[:6]
    habana_name = f"Habana Cafe Roma {rnd}"
    tropi_name = f"Tropicana Milano {rnd}"

    created = []
    # 3x Habana
    for i in range(3):
        p = base_event_payload(title=f"Habana #{i+1} {rnd}", organizer_type="gestore_locale")
        p["venue"] = habana_name
        p["city"] = "Roma"
        p["address"] = "Via Habana 10, Roma"
        r = requests.post(f"{BASE}/events", json=p, headers=auth_h(tok), timeout=20)
        if r.status_code == 200:
            created.append(r.json().get("id"))
        else:
            log(INFO, f"Habana create {i+1} status={r.status_code} {r.text[:200]}")
    # 1x Tropicana
    p = base_event_payload(title=f"Tropicana #1 {rnd}", organizer_type="gestore_locale")
    p["venue"] = tropi_name
    p["city"] = "Milano"
    p["address"] = "Via Tropicana 1, Milano"
    r = requests.post(f"{BASE}/events", json=p, headers=auth_h(tok), timeout=20)
    if r.status_code == 200:
        created.append(r.json().get("id"))
    else:
        log(INFO, f"Tropicana create status={r.status_code} {r.text[:200]}")

    # GET /events/my/venues
    r = requests.get(f"{BASE}/events/my/venues", headers=auth_h(tok), timeout=20)
    if r.status_code != 200:
        record("GET /events/my/venues returns 200", False, f"status={r.status_code} body={r.text[:300]}")
        cleanup_events(tok, created)
        return
    record("GET /events/my/venues returns 200", True, "")

    body = r.json()
    if not isinstance(body, list):
        record("Response is a list", False, f"type={type(body)}")
        cleanup_events(tok, created)
        return
    record("Response is a list", True, f"len={len(body)}")
    record("Max 10 items", len(body) <= 10, f"len={len(body)}")

    # find our entries
    habana = next((v for v in body if v.get("venue") == habana_name), None)
    tropi = next((v for v in body if v.get("venue") == tropi_name), None)

    if habana is None:
        record("Habana entry present", False, "not found")
    else:
        keys_ok = all(k in habana for k in ("venue", "city", "address", "count"))
        record("Habana entry has venue/city/address/count", keys_ok, f"keys={list(habana.keys())}")
        record("Habana count == 3", habana.get("count") == 3, f"count={habana.get('count')}")

    if tropi is None:
        record("Tropicana entry present", False, "not found")
    else:
        record("Tropicana count == 1", tropi.get("count") == 1, f"count={tropi.get('count')}")

    if habana and tropi:
        # check ordering: habana index < tropi index in list (count desc)
        idx_h = body.index(habana)
        idx_t = body.index(tropi)
        record("Sorted by count desc (Habana before Tropicana)",
               idx_h < idx_t, f"habana_idx={idx_h} tropi_idx={idx_t}")

    cleanup_events(tok, created)


# --------------------------------------------------------------------
# Task 4 — regression: GET /events still works
# --------------------------------------------------------------------
def task4_regression():
    print("\n=== TASK 4: Regression GET /api/events ===")
    r = requests.get(f"{BASE}/events", timeout=20)
    if r.status_code != 200:
        record("GET /events returns 200", False, f"status={r.status_code} body={r.text[:300]}")
        return
    record("GET /events returns 200", True, "")
    try:
        body = r.json()
    except Exception as e:
        record("GET /events JSON parse", False, f"{e}")
        return
    record("Response is a list", isinstance(body, list), f"len={len(body) if isinstance(body, list) else 'N/A'}")
    if isinstance(body, list) and body:
        # Validate we can read fields including potentially-null organizer_type/end_date
        sample = body[0]
        ok = "id" in sample and "title" in sample and "date" in sample
        record("Events have required fields", ok, f"sample_keys={list(sample.keys())[:10]}")
        # any with null organizer_type/end_date
        nulls = [e for e in body if e.get("organizer_type") is None or e.get("end_date") is None]
        log(INFO, f"{len(nulls)}/{len(body)} events have organizer_type or end_date as None (OK for legacy)")


def main():
    print(f"Testing against: {BASE}")
    task1_event_model_new_fields()
    task2_anti_flood()
    task3_my_venues()
    task4_regression()

    print("\n========== SUMMARY ==========")
    p = sum(1 for _, ok, _ in results if ok)
    f = sum(1 for _, ok, _ in results if not ok)
    for name, ok, detail in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail and not ok else ""))
    print(f"\nTotal: {p} passed, {f} failed")
    return 0 if f == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
