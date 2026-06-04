"""
Backend tests for LatinFun - Locali endpoints (and regression).
Target backend: https://dj-italia-hub.preview.emergentagent.com/api
Login: admin@latinfun.it / admin123
"""
import json
import os
import sys

import requests

BASE = "https://dj-italia-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@latinfun.it"
ADMIN_PASS = "admin123"


def banner(title):
    print(f"\n{'=' * 70}\n{title}\n{'=' * 70}")


def show(label, r):
    body = ""
    try:
        body = json.dumps(r.json(), ensure_ascii=False)[:500]
    except Exception:
        body = (r.text or "")[:300]
    print(f"  [{r.status_code}] {label}: {body}")


results = {"pass": 0, "fail": 0, "errors": []}


def check(cond, label):
    if cond:
        results["pass"] += 1
        print(f"  ✅ PASS: {label}")
    else:
        results["fail"] += 1
        results["errors"].append(label)
        print(f"  ❌ FAIL: {label}")


def main():
    # ----- Login admin -----
    banner("LOGIN ADMIN")
    r = requests.post(f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    show("login", r)
    check(r.status_code == 200, "Admin login 200")
    if r.status_code != 200:
        print("Cannot proceed without auth")
        sys.exit(1)
    token = r.json()["access_token"]
    H = {"Authorization": f"Bearer {token}"}

    # ----- 1) GET /api/locali public (no auth) -----
    banner("1) GET /api/locali (public, no auth)")
    r = requests.get(f"{BASE}/locali", timeout=30)
    show("list locali", r)
    check(r.status_code == 200, "GET /locali public 200")
    check(isinstance(r.json(), list), "Response is a list")
    initial_count = len(r.json())
    print(f"  Initial locali count: {initial_count}")

    # ----- 2) POST /api/locali (admin) -----
    banner("2) POST /api/locali (auth admin)")
    payload = {
        "name": "El Sabor Cubano Test",
        "category": "ristorante",
        "cuisine": "Mix Cubana + Italiana",
        "city": "Milano",
        "address": "Via Roma 10",
        "bio": "Locale test creato dal testing agent per LatinFun",
        "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
        "price_range": "€€",
        "hours": "Mar-Dom 19:00-02:00",
        "phone": "+39 02 1234567",
    }
    r = requests.post(f"{BASE}/locali", json=payload, headers=H, timeout=30)
    show("create locale", r)
    check(r.status_code == 200, "POST /locali 200")
    locale_id = None
    if r.status_code == 200:
        body = r.json()
        locale_id = body.get("id")
        check(body.get("name") == "El Sabor Cubano Test", "name persisted")
        check(body.get("cuisine") == "Mix Cubana + Italiana", "cuisine free-text persisted")
        check(body.get("city") == "Milano", "city persisted")
        check(body.get("category") == "ristorante", "category persisted")
        check(body.get("price_range") == "€€", "price_range persisted")
        check(body.get("phone") == "+39 02 1234567", "phone persisted")
        check(bool(body.get("slug")), "slug auto-generated")
    else:
        # if duplicate from a prior test run, clean up and retry
        if r.status_code == 409:
            try:
                existing_id = r.json().get("detail", {}).get("existing_id")
                if existing_id:
                    print(f"  Existing duplicate id={existing_id}, deleting...")
                    requests.delete(f"{BASE}/locali/{existing_id}", headers=H, timeout=30)
                    r2 = requests.post(f"{BASE}/locali", json=payload, headers=H, timeout=30)
                    show("create locale retry", r2)
                    if r2.status_code == 200:
                        locale_id = r2.json()["id"]
                        results["pass"] += 1
                        print("  ✅ Re-create after cleanup succeeded")
            except Exception as e:
                print(f"  cleanup retry failed: {e}")

    if not locale_id:
        print("  Cannot continue without locale_id")
        sys.exit(1)

    # ----- 3) GET /api/locali/{id} -----
    banner(f"3) GET /api/locali/{locale_id}")
    r = requests.get(f"{BASE}/locali/{locale_id}", timeout=30)
    show("get locale", r)
    check(r.status_code == 200, "GET /locali/{id} 200")
    if r.status_code == 200:
        check(r.json().get("id") == locale_id, "id matches")

    # ----- 4) PATCH /api/locali/{id} -----
    banner(f"4) PATCH /api/locali/{locale_id} bio update")
    update_payload = dict(payload)  # full payload because PATCH expects LocaleCreate
    update_payload["bio"] = "Bio aggiornata dal testing agent - nuova descrizione del locale"
    r = requests.patch(f"{BASE}/locali/{locale_id}", json=update_payload, headers=H, timeout=30)
    show("patch locale", r)
    check(r.status_code == 200, "PATCH /locali/{id} 200")
    if r.status_code == 200:
        check(r.json().get("bio") == update_payload["bio"], "bio updated")

    # ----- 5) POST /api/locali/{id}/save -----
    banner(f"5) POST /api/locali/{locale_id}/save")
    r = requests.post(f"{BASE}/locali/{locale_id}/save", headers=H, timeout=30)
    show("save locale", r)
    check(r.status_code == 200, "POST save 200")
    check(r.json().get("ok") is True, "ok:true")

    # ----- 6) GET /api/my/saved-locali -----
    banner("6) GET /api/my/saved-locali")
    r = requests.get(f"{BASE}/my/saved-locali", headers=H, timeout=30)
    show("saved-locali", r)
    check(r.status_code == 200, "GET /my/saved-locali 200")
    if r.status_code == 200:
        check(locale_id in r.json(), "locale_id present in saved list")

    # ----- 7) DELETE /api/locali/{id}/save -----
    banner(f"7) DELETE /api/locali/{locale_id}/save (unsave)")
    r = requests.delete(f"{BASE}/locali/{locale_id}/save", headers=H, timeout=30)
    show("unsave", r)
    check(r.status_code == 200, "DELETE save 200")

    r2 = requests.get(f"{BASE}/my/saved-locali", headers=H, timeout=30)
    if r2.status_code == 200:
        check(locale_id not in r2.json(), "locale_id removed from saved list")

    # ----- 8) POST /api/locali/{id}/boost -----
    banner(f"8) POST /api/locali/{locale_id}/boost (Stripe checkout)")
    boost_payload = {"origin_url": "https://dj-italia-hub.preview.emergentagent.com", "package": "week"}
    r = requests.post(f"{BASE}/locali/{locale_id}/boost", json=boost_payload, headers=H, timeout=60)
    show("boost", r)
    check(r.status_code in (200, 400), f"boost returns 200 or 400, got {r.status_code}")
    if r.status_code == 200:
        body = r.json()
        check("checkout_url" in body, "checkout_url present")
        check("session_id" in body, "session_id present")
        if "checkout_url" in body:
            print(f"  checkout_url: {body['checkout_url'][:80]}...")

    # ----- 9) Filtering -----
    banner("9) GET /api/locali?category=ristorante&city=Milano")
    r = requests.get(f"{BASE}/locali", params={"category": "ristorante", "city": "Milano"}, timeout=30)
    show("filter", r)
    check(r.status_code == 200, "GET filter 200")
    if r.status_code == 200:
        items = r.json()
        check(any(it.get("id") == locale_id for it in items), "created locale in filtered list")
        check(all(it.get("category") == "ristorante" for it in items), "all items category=ristorante")
        check(all(it.get("city") == "Milano" for it in items), "all items city=Milano")

    # ----- 10) POST /api/reviews target_type=locale -----
    banner(f"10) POST /api/reviews target_type=locale")
    review_payload = {
        "target_type": "locale",
        "target_id": locale_id,
        "rating": 5,
        "comment": "Locale fantastico, cucina caribica eccezionale e musica latina dal vivo!",
    }
    r = requests.post(f"{BASE}/reviews", json=review_payload, headers=H, timeout=30)
    show("review", r)
    check(r.status_code == 200, "POST /reviews with locale target 200")
    review_id = None
    if r.status_code == 200:
        body = r.json()
        review_id = body.get("id")
        check(body.get("target_type") == "locale", "target_type=locale")
        check(body.get("rating") == 5, "rating=5")
        # check rating recomputed on locale doc
        gl = requests.get(f"{BASE}/locali/{locale_id}", timeout=30)
        if gl.status_code == 200:
            lc = gl.json()
            check(lc.get("avg_rating") == 5.0 and lc.get("reviews_count") == 1, "locale avg_rating/reviews_count recomputed")

    # Cleanup review (best-effort)
    if review_id:
        rdel = requests.delete(f"{BASE}/reviews/{review_id}", headers=H, timeout=30)
        print(f"  cleanup review: [{rdel.status_code}]")

    # ----- REGRESSION: Existing endpoints -----
    banner("REGRESSION: GET /api/events, /api/djs, /api/schools")
    for path in ["/events", "/djs", "/schools"]:
        r = requests.get(f"{BASE}{path}", timeout=30)
        print(f"  {path}: [{r.status_code}] len={len(r.json()) if r.status_code == 200 and isinstance(r.json(), list) else '?'}")
        check(r.status_code == 200, f"GET {path} 200")
        if r.status_code == 200:
            check(isinstance(r.json(), list), f"{path} returns list")

    # Auth regression
    banner("REGRESSION: Auth still works")
    r = requests.get(f"{BASE}/auth/me", headers=H, timeout=30)
    show("auth/me", r)
    check(r.status_code == 200, "GET /auth/me 200")
    if r.status_code == 200:
        check(r.json().get("email") == ADMIN_EMAIL, "auth/me returns admin")

    # 401 without token
    r = requests.get(f"{BASE}/my/saved-locali", timeout=30)
    check(r.status_code == 401, "Auth required on /my/saved-locali")

    # ----- 11) DELETE /api/locali/{id} -----
    banner(f"11) DELETE /api/locali/{locale_id} (cleanup)")
    r = requests.delete(f"{BASE}/locali/{locale_id}", headers=H, timeout=30)
    show("delete locale", r)
    check(r.status_code == 200, "DELETE /locali/{id} 200")
    # confirm 404 after delete
    r = requests.get(f"{BASE}/locali/{locale_id}", timeout=30)
    check(r.status_code == 404, "GET after delete returns 404")

    # ----- Summary -----
    banner("SUMMARY")
    print(f"PASS: {results['pass']}")
    print(f"FAIL: {results['fail']}")
    if results["fail"]:
        print("\nFailures:")
        for e in results["errors"]:
            print(f"  - {e}")
    return 0 if results["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
