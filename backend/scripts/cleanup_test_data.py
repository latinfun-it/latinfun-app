"""
Script di pulizia dati di prova per LatinHub.
Uso:
  python3 /app/backend/scripts/cleanup_test_data.py --dry-run
  python3 /app/backend/scripts/cleanup_test_data.py --apply

Rimuove:
- Eventi con titolo contenente: 'test', 'prova', 'demo'
- DJ con nome contenente: 'test', 'prova', 'demo'
- Scuole con nome contenente: 'test', 'prova', 'demo'
- Relativi like / follow / inquiries / push queue

Mantiene:
- Utenti (non tocca mai gli account)
- Playlist editoriali
"""
import asyncio
import argparse
import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv

# Carica .env del backend
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "latinhub")

# Pattern per riconoscere contenuti di prova (case insensitive)
TEST_PATTERNS = re.compile(r"(test|prova|demo|dummy|lorem|asdf|xxx)", re.IGNORECASE)


async def cleanup(apply: bool):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # === EVENTS ===
    events_cursor = db.events.find({})
    events_to_remove = []
    async for ev in events_cursor:
        if TEST_PATTERNS.search(ev.get("title", "")) or TEST_PATTERNS.search(ev.get("description", "")):
            events_to_remove.append(ev)

    print(f"[EVENTI] da eliminare: {len(events_to_remove)}")
    for ev in events_to_remove:
        print(f"  - {ev.get('id')[:8]}... | {ev.get('title')[:60]}")

    # === DJs ===
    djs_cursor = db.djs.find({})
    djs_to_remove = []
    async for dj in djs_cursor:
        if TEST_PATTERNS.search(dj.get("name", "")) or TEST_PATTERNS.search(dj.get("bio", "")):
            djs_to_remove.append(dj)

    print(f"\n[DJ] da eliminare: {len(djs_to_remove)}")
    for dj in djs_to_remove:
        print(f"  - {dj.get('id')[:8]}... | {dj.get('name')[:60]}")

    # === SCHOOLS ===
    schools_cursor = db.schools.find({})
    schools_to_remove = []
    async for sc in schools_cursor:
        if TEST_PATTERNS.search(sc.get("name", "")) or TEST_PATTERNS.search(sc.get("bio", "")):
            schools_to_remove.append(sc)

    print(f"\n[SCUOLE] da eliminare: {len(schools_to_remove)}")
    for sc in schools_to_remove:
        print(f"  - {sc.get('id')[:8]}... | {sc.get('name')[:60]}")

    total = len(events_to_remove) + len(djs_to_remove) + len(schools_to_remove)
    print(f"\n{'=' * 50}\nTOTALE: {total} item(s) da rimuovere")

    if not apply:
        print("\n[DRY RUN] nessuna modifica applicata. Usa --apply per procedere.")
        return

    if total == 0:
        print("\nNessun contenuto di test trovato. Niente da fare.")
        return

    print("\n[APPLICAZIONE] rimuovo i dati...")
    for ev in events_to_remove:
        eid = ev["id"]
        await db.events.delete_one({"id": eid})
        await db.user_likes.delete_many({"event_id": eid})
        await db.event_inquiries.delete_many({"event_id": eid})

    for dj in djs_to_remove:
        did = dj["id"]
        await db.djs.delete_one({"id": did})
        await db.user_follows.delete_many({"dj_id": did})

    for sc in schools_to_remove:
        sid = sc["id"]
        await db.schools.delete_one({"id": sid})

    print(f"\n✅ Fatto. Rimossi {total} elementi + dati correlati.")


def main():
    parser = argparse.ArgumentParser(description="Pulizia dati di prova LatinHub")
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true", help="Mostra cosa verrebbe eliminato, senza applicare")
    g.add_argument("--apply", action="store_true", help="Applica la rimozione")
    args = parser.parse_args()
    asyncio.run(cleanup(apply=args.apply))


if __name__ == "__main__":
    main()
