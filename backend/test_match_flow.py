"""End-to-end test of MATCH system on PREVIEW.

Creates 2 fake users in Milano, completes their dancer profiles,
makes them swipe each other, verifies the match, sends chat messages.
"""
import requests
import time

BASE = "http://localhost:8001/api"

USERS = [
    {
        "name": "Sofia Test",
        "email": f"sofia-test-{int(time.time())}@latinfun.it",
        "password": "TestSofia123!",
        "profile": {
            "display_name": "Sofia",
            "age": 28,
            "gender": "female",
            "city": "Milano",
            "bio": "Bachata sensual addicted, cerco follower per esibizioni",
            "styles": ["bachata", "salsa"],
            "level": "advanced",
            "looking_for": ["partner"],
            "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
        },
    },
    {
        "name": "Marco Test",
        "email": f"marco-test-{int(time.time())}@latinfun.it",
        "password": "TestMarco123!",
        "profile": {
            "display_name": "Marco",
            "age": 32,
            "gender": "male",
            "city": "Milano",
            "bio": "Salsa cubana, in cerca di partner per gare",
            "styles": ["salsa", "bachata"],
            "level": "intermediate",
            "looking_for": ["partner"],
            "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        },
    },
]


def register_and_setup(u):
    """Register, login, create dancer profile."""
    # Register (may fail if exists, then login)
    r = requests.post(f"{BASE}/auth/register", json={
        "name": u["name"], "email": u["email"], "password": u["password"]
    })
    if r.status_code == 200:
        token = r.json()["access_token"]
        user_id = r.json()["user"]["id"]
        print(f"  ✅ Registered: {u['name']} (id: {user_id})")
    else:
        # Try login
        r = requests.post(f"{BASE}/auth/login", json={"email": u["email"], "password": u["password"]})
        r.raise_for_status()
        token = r.json()["access_token"]
        user_id = r.json()["user"]["id"]
        print(f"  ✅ Logged: {u['name']} (id: {user_id})")
    headers = {"Authorization": f"Bearer {token}"}
    # Create dancer profile
    r = requests.post(f"{BASE}/dancer/profile", json=u["profile"], headers=headers)
    if r.status_code == 200:
        print(f"  ✅ Profile dancer created for {u['name']}")
    else:
        print(f"  ❌ Profile error: {r.status_code} - {r.text[:120]}")
    return user_id, headers


def main():
    print("\n=== STEP 1: Register users ===")
    sofia_id, sofia_h = register_and_setup(USERS[0])
    marco_id, marco_h = register_and_setup(USERS[1])

    print("\n=== STEP 2: Sofia scopre profili ===")
    r = requests.get(f"{BASE}/dancer/discover", headers=sofia_h)
    candidates = r.json() if r.status_code == 200 else []
    print(f"  ✅ Sofia vede {len(candidates)} ballerini")
    marco_in_list = any(c["user_id"] == marco_id for c in candidates)
    print(f"  {'✅' if marco_in_list else '❌'} Marco {'compare' if marco_in_list else 'NON compare'} nella lista")

    print("\n=== STEP 3: Sofia LIKE Marco ===")
    r = requests.post(f"{BASE}/dancer/{marco_id}/swipe", json={"direction": "like"}, headers=sofia_h)
    print(f"  Result: {r.status_code} → {r.json()}")

    print("\n=== STEP 4: Marco LIKE Sofia (MATCH!) ===")
    r = requests.post(f"{BASE}/dancer/{sofia_id}/swipe", json={"direction": "like"}, headers=marco_h)
    print(f"  Result: {r.status_code} → {r.json()}")

    print("\n=== STEP 5: Verifica match in entrambi i profili ===")
    rs = requests.get(f"{BASE}/dancer/matches", headers=sofia_h).json()
    rm = requests.get(f"{BASE}/dancer/matches", headers=marco_h).json()
    print(f"  Sofia ha {len(rs)} match")
    print(f"  Marco ha {len(rm)} match")
    sofia_sees_marco = any(m.get("user_id") == marco_id for m in rs)
    marco_sees_sofia = any(m.get("user_id") == sofia_id for m in rm)
    print(f"  {'✅' if sofia_sees_marco else '❌'} Sofia vede Marco nei match")
    print(f"  {'✅' if marco_sees_sofia else '❌'} Marco vede Sofia nei match")

    print("\n=== STEP 6: Chat tra match ===")
    r = requests.post(f"{BASE}/dancer/chat/{marco_id}",
                      json={"text": "Ciao Marco! Vuoi venire alla serata di sabato?"},
                      headers=sofia_h)
    print(f"  Sofia → Marco: {r.status_code} {'✅' if r.status_code == 200 else r.text[:150]}")
    r = requests.post(f"{BASE}/dancer/chat/{sofia_id}",
                      json={"text": "Ciao Sofia! Certo, con piacere :)"},
                      headers=marco_h)
    print(f"  Marco → Sofia: {r.status_code} {'✅' if r.status_code == 200 else r.text[:150]}")

    r = requests.get(f"{BASE}/dancer/chat/{marco_id}", headers=sofia_h)
    msgs = r.json() if r.status_code == 200 else []
    print(f"  ✅ Conversazione ha {len(msgs)} messaggi")
    for m in msgs:
        print(f"    [{m.get('sender_id', '?')[:8]}] {m.get('body','')[:60]}")

    print("\n=== STEP 7: Unread count ===")
    r = requests.get(f"{BASE}/dancer/chat-unread-count", headers=sofia_h)
    print(f"  Sofia unread: {r.json()}")

    print("\n📊 TEST COMPLETATO")


if __name__ == "__main__":
    main()
