"""Seed sample Locali (Latin restaurants/bars) for LatinFun demo.

Usage:
  cd /app/backend && python3 seed_locali.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "test_database")

LOCALI_SEED = [
    {
        "name": "La Bodeguita del Medio",
        "category": "ristorante",
        "cuisine": "Cubana autentica",
        "city": "Milano",
        "address": "Via Vincenzo Monti 24, 20123",
        "bio": "Il sapore di Cuba nel cuore di Milano. Cucina cubana tradizionale con mojito autentici, ropa vieja, moros y cristianos e serate di musica live ogni weekend.",
        "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
        "cover_url": "https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=1200",
        "price_range": "€€€",
        "hours": "Mar-Dom 19:00-02:00. Chiuso lunedì.",
        "phone": "+39 02 8456 7890",
        "email": "info@labodeguitamilano.it",
        "website": "labodeguitamilano.it",
        "instagram": "@labodeguita_milano",
        "facebook": "labodeguitamilano",
        "country": "IT",
        "verified_by_mauro": True,
        "boosted": True,
    },
    {
        "name": "Mojito Lounge Roma",
        "category": "lounge",
        "cuisine": "Caribica + cocktail tropicali",
        "city": "Roma",
        "address": "Piazza Trilussa 5, 00153",
        "bio": "Lounge bar in Trastevere con i migliori mojito di Roma. Tapas caribiche, cocktail tropicali e DJ set salsa/bachata ogni venerdì e sabato sera.",
        "image_url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800",
        "cover_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200",
        "price_range": "€€",
        "hours": "Tutti i giorni 18:00-03:00",
        "phone": "+39 06 5817 234",
        "instagram": "@mojito_lounge_roma",
        "country": "IT",
        "verified_by_mauro": True,
        "boosted": False,
    },
    {
        "name": "El Sabor Latino",
        "category": "discoteca_cena",
        "cuisine": "Mix Latin: Colombiana, Venezuelana, Dominicana",
        "city": "Torino",
        "address": "Via Po 32, 10124",
        "bio": "Cena + serata di ballo! Cucina latina fusion (arepas, empanadas, pabellón) seguita da pista salsa/bachata/reggaeton fino alle 4 del mattino.",
        "image_url": "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800",
        "cover_url": "https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=1200",
        "price_range": "€€",
        "hours": "Gio-Sab 20:00-04:00",
        "phone": "+39 011 887 2345",
        "website": "elsaborlatino.it",
        "instagram": "@elsabor_torino",
        "country": "IT",
        "verified_by_mauro": True,
        "boosted": True,
    },
    {
        "name": "Cubita Café",
        "category": "bar",
        "cuisine": "Caffetteria caraibica + tapas",
        "city": "Bologna",
        "address": "Via Marsala 14, 40126",
        "bio": "Caffè cubano, mojito, daiquiri e tapas leggere. Atmosfera rilassata di giorno, vibrazioni latine la sera con musica dal vivo ogni mercoledì.",
        "image_url": "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800",
        "price_range": "€€",
        "hours": "Lun-Dom 09:00-01:00",
        "phone": "+39 051 234 5678",
        "instagram": "@cubita_cafe_bo",
        "country": "IT",
        "verified_by_mauro": False,
        "boosted": False,
    },
    {
        "name": "La Habana Vieja",
        "category": "ristorante",
        "cuisine": "Cubana + Salsa dal vivo",
        "city": "Napoli",
        "address": "Via Chiaia 78, 80121",
        "bio": "Ristorante cubano nel cuore di Chiaia. Specialità: lechon asado, yuca con mojo, plátanos maduros. Serate salsa live con band dal venerdì alla domenica.",
        "image_url": "https://images.unsplash.com/photo-1502301197179-65228ab57f78?w=800",
        "cover_url": "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200",
        "price_range": "€€€",
        "hours": "Mar-Dom 19:30-01:00",
        "phone": "+39 081 421 3456",
        "website": "lahabanavieja.it",
        "instagram": "@lahabanavieja_napoli",
        "country": "IT",
        "verified_by_mauro": True,
        "boosted": False,
    },
    {
        "name": "Aji Latino",
        "category": "ristorante",
        "cuisine": "Peruviana + Cucina Nikkei",
        "city": "Firenze",
        "address": "Borgo San Frediano 67, 50124",
        "bio": "Cucina peruviana e Nikkei (peruviana-giapponese). Ceviche, tiradito, anticuchos e pisco sour. Esperienza gastronomica latina raffinata in Oltrarno.",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
        "price_range": "€€€",
        "hours": "Mar-Sab 19:00-23:30. Dom 12:30-15:00 + 19:00-23:00",
        "phone": "+39 055 234 5678",
        "instagram": "@ajilatino_firenze",
        "country": "IT",
        "verified_by_mauro": True,
        "boosted": False,
    },
]


def slugify(s: str) -> str:
    import re
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:100]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Find admin user to use as owner
    admin = await db.users.find_one({"role": "admin"})
    admin_id = admin["id"] if admin else None
    print(f"Admin owner_id: {admin_id}")

    inserted = 0
    skipped = 0
    for loc_data in LOCALI_SEED:
        # Check if already exists
        existing = await db.locali.find_one({
            "name": loc_data["name"],
            "city": loc_data["city"],
        })
        if existing:
            print(f"⏭️  Skip (already exists): {loc_data['name']} ({loc_data['city']})")
            skipped += 1
            continue

        slug = slugify(f"{loc_data['name']}-{loc_data['city']}")
        doc = {
            "id": str(uuid.uuid4()),
            "slug": slug,
            "owner_id": admin_id,
            "gallery": [],
            "saves": 0,
            "avg_rating": 0.0,
            "reviews_count": 0,
            "lat": None,
            "lng": None,
            "boosted_until": None,
            **loc_data,
        }
        await db.locali.insert_one(doc)
        print(f"✅ Inserted: {loc_data['name']} ({loc_data['city']})")
        inserted += 1

    print(f"\n📊 Done: {inserted} inserted, {skipped} skipped")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
