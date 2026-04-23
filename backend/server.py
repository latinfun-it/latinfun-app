from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----------------------------- Mongo ---------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----------------------------- App -----------------------------------
app = FastAPI(title="LatinHub API")
api = APIRouter(prefix="/api")

# ----------------------------- Auth ----------------------------------
JWT_ALGO = "HS256"
security = HTTPBearer(auto_error=False)


def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----------------------------- Models --------------------------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "user"
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str


class DJ(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    bio: str
    city: str
    genres: List[str] = []
    image_url: str
    cover_url: Optional[str] = None
    instagram: Optional[str] = None
    spotify_playlist_url: Optional[str] = None
    tidal_playlist_url: Optional[str] = None
    verified_by_mauro: bool = False
    followers: int = 0


class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    city: str
    venue: str
    address: str
    genre: str  # bachata | reggaeton | salsa | latin
    date: datetime
    image_url: str
    lineup: List[str] = []  # DJ names
    ticket_url: Optional[str] = None
    organizer: str
    featured: bool = False
    boosted: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class EventCreate(BaseModel):
    title: str
    description: str
    city: str
    venue: str
    address: str
    genre: str
    date: datetime
    image_url: str
    lineup: List[str] = []
    ticket_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class Mix(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    dj_name: str
    genre: str
    duration_sec: int
    cover_url: str
    audio_url: str
    plays: int = 0
    description: Optional[str] = None


class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    cover_url: str
    platform: str = "spotify"  # spotify | tidal | apple_music
    embed_url: str  # https://open.spotify.com/embed/playlist/...
    external_url: str  # https://open.spotify.com/playlist/...
    curator: str = "Mauro Catalini"
    genre: str  # bachata | reggaeton | salsa | latin
    position: int = 0
    featured: bool = False


class PlaylistCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=3, max_length=600)
    cover_url: str
    platform: str = "spotify"
    embed_url: str
    external_url: str
    genre: str
    position: int = 0
    featured: bool = False


class School(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    city: str
    address: str
    bio: str
    image_url: str
    cover_url: Optional[str] = None
    styles: List[str] = []  # bachata, salsa, reggaeton, kizomba
    levels: List[str] = []  # principianti, intermedio, avanzato
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    owner_id: Optional[str] = None
    verified_by_mauro: bool = False
    students: int = 0


class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=60)
    address: str = Field(min_length=3, max_length=160)
    bio: str = Field(min_length=10, max_length=1200)
    image_url: str
    cover_url: Optional[str] = None
    styles: List[str] = []
    levels: List[str] = []
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None


# ----------------------------- Auth routes ---------------------------
@api.post("/auth/register", response_model=AuthResponse)
async def register(payload: UserRegister):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    user_out = {k: v for k, v in doc.items() if k != "password_hash"}
    return {"user": user_out, "access_token": token}


@api.post("/auth/login", response_model=AuthResponse)
async def login(payload: UserLogin):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    user_out = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"user": user_out, "access_token": token}


@api.get("/auth/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


@api.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    return {"ok": True}


# ----------------------------- Events --------------------------------
@api.get("/events", response_model=List[Event])
async def list_events(
    city: Optional[str] = None, genre: Optional[str] = None, featured: Optional[bool] = None
):
    q: dict = {}
    if city:
        q["city"] = city
    if genre and genre != "all":
        q["genre"] = genre
    if featured is not None:
        q["featured"] = featured
    docs = await db.events.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    return [Event(**d) for d in docs]


@api.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    return Event(**doc)


@api.post("/events", response_model=Event)
async def create_event(payload: EventCreate, current_user: dict = Depends(get_current_user)):
    ev = Event(**payload.model_dump(), organizer=current_user["name"])
    await db.events.insert_one(ev.model_dump())
    return ev


@api.get("/cities", response_model=List[str])
async def list_cities():
    cities = await db.events.distinct("city")
    return sorted(cities)


# ----------------------------- DJs -----------------------------------
@api.get("/djs", response_model=List[DJ])
async def list_djs(city: Optional[str] = None, verified: Optional[bool] = None):
    q: dict = {}
    if city:
        q["city"] = city
    if verified is not None:
        q["verified_by_mauro"] = verified
    docs = await db.djs.find(q, {"_id": 0}).sort("followers", -1).to_list(500)
    return [DJ(**d) for d in docs]


@api.get("/djs/{dj_id}", response_model=DJ)
async def get_dj(dj_id: str):
    doc = await db.djs.find_one({"id": dj_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="DJ not found")
    return DJ(**doc)


# ----------------------------- Mixes (Radio) -------------------------
@api.get("/mixes", response_model=List[Mix])
async def list_mixes(genre: Optional[str] = None):
    q: dict = {}
    if genre and genre != "all":
        q["genre"] = genre
    docs = await db.mixes.find(q, {"_id": 0}).sort("plays", -1).to_list(200)
    return [Mix(**d) for d in docs]


@api.get("/mixes/{mix_id}", response_model=Mix)
async def get_mix(mix_id: str):
    doc = await db.mixes.find_one({"id": mix_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Mix not found")
    await db.mixes.update_one({"id": mix_id}, {"$inc": {"plays": 1}})
    doc["plays"] = doc.get("plays", 0) + 1
    return Mix(**doc)


# ----------------------------- Playlists (Musica) -------------------
@api.get("/playlists", response_model=List[Playlist])
async def list_playlists(genre: Optional[str] = None, featured: Optional[bool] = None):
    q: dict = {}
    if genre and genre != "all":
        q["genre"] = genre
    if featured is not None:
        q["featured"] = featured
    docs = await db.playlists.find(q, {"_id": 0}).sort("position", 1).to_list(300)
    return [Playlist(**d) for d in docs]


@api.get("/playlists/{playlist_id}", response_model=Playlist)
async def get_playlist(playlist_id: str):
    doc = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return Playlist(**doc)


@api.post("/playlists", response_model=Playlist)
async def create_playlist(payload: PlaylistCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can curate playlists")
    p = Playlist(**payload.model_dump(), curator=current_user["name"])
    await db.playlists.insert_one(p.model_dump())
    return p


@api.put("/playlists/{playlist_id}", response_model=Playlist)
async def update_playlist(
    playlist_id: str,
    payload: PlaylistCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can curate playlists")
    existing = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Playlist not found")
    updated = {**existing, **payload.model_dump()}
    await db.playlists.update_one({"id": playlist_id}, {"$set": payload.model_dump()})
    return Playlist(**updated)


@api.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can curate playlists")
    res = await db.playlists.delete_one({"id": playlist_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"ok": True}


# ----------------------------- Schools -------------------------------
def _slugify(value: str) -> str:
    base = "".join(c if c.isalnum() else "-" for c in value.lower()).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "scuola"


@api.get("/schools", response_model=List[School])
async def list_schools(city: Optional[str] = None, style: Optional[str] = None):
    q: dict = {}
    if city:
        q["city"] = city
    if style and style != "all":
        q["styles"] = style
    docs = await db.schools.find(q, {"_id": 0}).sort("students", -1).to_list(500)
    return [School(**d) for d in docs]


@api.get("/schools/{school_id}", response_model=School)
async def get_school(school_id: str):
    doc = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="School not found")
    return School(**doc)


@api.post("/schools", response_model=School)
async def create_school(payload: SchoolCreate, current_user: dict = Depends(get_current_user)):
    slug = _slugify(f"{payload.name}-{payload.city}")
    if await db.schools.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    school = School(
        **payload.model_dump(),
        slug=slug,
        owner_id=current_user["id"],
    )
    await db.schools.insert_one(school.model_dump())
    return school


@api.get("/my/school", response_model=Optional[School])
async def my_school(current_user: dict = Depends(get_current_user)):
    doc = await db.schools.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    return School(**doc) if doc else None


# ----------------------------- Root / Health -------------------------
@api.get("/")
async def root():
    return {"app": "LatinHub", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ----------------------------- Seed ----------------------------------
DEMO_DJS = [
    {
        "name": "Mauro Catalini",
        "slug": "mauro-catalini",
        "bio": "Founder di LatinHub. Voce e selector della scena latina italiana. Bachata & Urban Latin.",
        "city": "Milano",
        "genres": ["bachata", "reggaeton", "latin"],
        "image_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "instagram": "https://instagram.com/maurocatalini",
        "spotify_playlist_url": "https://open.spotify.com/embed/playlist/0ItuuWeQtp8f3XfsBrYnOe",
        "tidal_playlist_url": "https://tidal.com/browse/playlist/aa8f68f4-2e47-44ba-b6f8-6ee1b9b8c5c2",
        "verified_by_mauro": True,
        "followers": 48200,
    },
    {
        "name": "DJ Salsero",
        "slug": "dj-salsero",
        "bio": "Salsa cubana purissima. Residente al Cafe Latino Roma.",
        "city": "Roma",
        "genres": ["salsa"],
        "image_url": "https://images.unsplash.com/photo-1547210841-2ceb0c5f0679",
        "cover_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
        "instagram": "https://instagram.com/djsalsero",
        "spotify_playlist_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DWYkaDif7Ztbp",
        "verified_by_mauro": True,
        "followers": 18900,
    },
    {
        "name": "La Reina",
        "slug": "la-reina",
        "bio": "Reggaeton & urban queen. Da Napoli alle migliori piste d'Italia.",
        "city": "Napoli",
        "genres": ["reggaeton"],
        "image_url": "https://images.unsplash.com/photo-1545959570-a94084071b5d",
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "instagram": "https://instagram.com/lareina",
        "spotify_playlist_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DWY7IeIP1cdjF",
        "verified_by_mauro": False,
        "followers": 24300,
    },
    {
        "name": "Bachatero Bologna",
        "slug": "bachatero-bologna",
        "bio": "Bachata sensual specialist. Serate infuocate sotto i portici.",
        "city": "Bologna",
        "genres": ["bachata"],
        "image_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "instagram": "https://instagram.com/bachaterobo",
        "spotify_playlist_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DX10zKzsJ2jva",
        "verified_by_mauro": True,
        "followers": 12100,
    },
    {
        "name": "Caliente Torino",
        "slug": "caliente-torino",
        "bio": "Latin urban & afrobeat crossover. Vibes direttamente da Turin.",
        "city": "Torino",
        "genres": ["reggaeton", "latin"],
        "image_url": "https://images.unsplash.com/photo-1547210841-2ceb0c5f0679",
        "cover_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
        "instagram": "https://instagram.com/calientetorino",
        "verified_by_mauro": False,
        "followers": 9800,
    },
    {
        "name": "Kizomba Firenze",
        "slug": "kizomba-firenze",
        "bio": "Kizomba & bachata fusion. Resident al Club Havana Firenze.",
        "city": "Firenze",
        "genres": ["bachata", "latin"],
        "image_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "cover_url": "https://images.pexels.com/photos/31055824/pexels-photo-31055824.jpeg",
        "instagram": "https://instagram.com/kizombaflorence",
        "verified_by_mauro": True,
        "followers": 7650,
    },
]


def _make_events():
    now = datetime.now(timezone.utc)

    def d(days, hour=22):
        return (now + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)

    return [
        {
            "title": "LatinHub Opening Night",
            "description": "La serata ufficiale di lancio. Bachata, reggaeton e salsa fino all'alba con Mauro Catalini & guests.",
            "city": "Milano",
            "venue": "Cafe Cubano",
            "address": "Via Tortona 27, Milano",
            "genre": "latin",
            "date": d(3),
            "image_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
            "lineup": ["Mauro Catalini", "La Reina"],
            "ticket_url": "https://dice.fm/event/opening-latinhub",
            "organizer": "LatinHub",
            "featured": True,
            "boosted": True,
            "latitude": 45.4481,
            "longitude": 9.1687,
        },
        {
            "title": "Bachata Sensual Roma",
            "description": "Workshop 21:00 + social 22:30. Atmosfera intima e musica selezionata.",
            "city": "Roma",
            "venue": "Sala Tropical",
            "address": "Via Casilina 401, Roma",
            "genre": "bachata",
            "date": d(5, 21),
            "image_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
            "lineup": ["Bachatero Bologna", "DJ Salsero"],
            "ticket_url": "https://eventbrite.it/e/bachata-sensual-roma",
            "organizer": "Tropical Events",
            "featured": True,
            "boosted": False,
            "latitude": 41.8784,
            "longitude": 12.5432,
        },
        {
            "title": "Reggaeton Fire Napoli",
            "description": "La notte piu hot del sud. Reggaeton, dembow e perreo no stop.",
            "city": "Napoli",
            "venue": "Duel Beat",
            "address": "Via Coroglio 57, Napoli",
            "genre": "reggaeton",
            "date": d(7),
            "image_url": "https://images.unsplash.com/photo-1547210841-2ceb0c5f0679",
            "lineup": ["La Reina", "Caliente Torino"],
            "ticket_url": "https://dice.fm/event/reggaeton-fire",
            "organizer": "Fire Crew",
            "featured": True,
            "boosted": True,
            "latitude": 40.8103,
            "longitude": 14.1793,
        },
        {
            "title": "Salsa Cubana Bologna",
            "description": "Salsa cubana autentica con band dal vivo e DJ set dopo il concerto.",
            "city": "Bologna",
            "venue": "Estragon",
            "address": "Piazza Lucio Dalla 1, Bologna",
            "genre": "salsa",
            "date": d(10),
            "image_url": "https://images.pexels.com/photos/31055824/pexels-photo-31055824.jpeg",
            "lineup": ["DJ Salsero"],
            "ticket_url": "https://ticketone.it/event/salsa-cubana-bologna",
            "organizer": "Estragon Club",
            "featured": False,
            "boosted": False,
            "latitude": 44.5077,
            "longitude": 11.3391,
        },
        {
            "title": "Latin Weekend Torino",
            "description": "Due piste: sala 1 bachata, sala 2 reggaeton. Welcome shot incluso.",
            "city": "Torino",
            "venue": "Hiroshima Mon Amour",
            "address": "Via Bossoli 83, Torino",
            "genre": "latin",
            "date": d(12),
            "image_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
            "lineup": ["Caliente Torino", "Bachatero Bologna"],
            "ticket_url": "https://dice.fm/event/latin-weekend-torino",
            "organizer": "Latin Crew TO",
            "featured": False,
            "boosted": True,
            "latitude": 45.0385,
            "longitude": 7.6776,
        },
        {
            "title": "Kizomba & Bachata Firenze",
            "description": "Sessione slow & sensual con i migliori ballerini toscani.",
            "city": "Firenze",
            "venue": "Tenax",
            "address": "Via Pratese 46, Firenze",
            "genre": "bachata",
            "date": d(14, 21),
            "image_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
            "lineup": ["Kizomba Firenze"],
            "ticket_url": "https://eventbrite.it/e/kizomba-bachata-firenze",
            "organizer": "Club Havana",
            "featured": True,
            "boosted": False,
            "latitude": 43.7859,
            "longitude": 11.1831,
        },
        {
            "title": "Perreo Night Milano",
            "description": "Reggaeton latino anni 2000 + 2020 hit. Dress code: total black.",
            "city": "Milano",
            "venue": "Magazzini Generali",
            "address": "Via Pietrasanta 16, Milano",
            "genre": "reggaeton",
            "date": d(16),
            "image_url": "https://images.unsplash.com/photo-1545959570-a94084071b5d",
            "lineup": ["La Reina", "Mauro Catalini"],
            "ticket_url": "https://dice.fm/event/perreo-milano",
            "organizer": "Perreo Milano",
            "featured": False,
            "boosted": True,
            "latitude": 45.4517,
            "longitude": 9.1993,
        },
        {
            "title": "Sabor Latino Verona",
            "description": "Mix di salsa, bachata e merengue a Verona. Ingresso omaggio fino alle 23.",
            "city": "Verona",
            "venue": "Berfi's Club",
            "address": "Via Lussemburgo 1, Verona",
            "genre": "salsa",
            "date": d(18),
            "image_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
            "lineup": ["DJ Salsero"],
            "ticket_url": "https://ticketone.it/event/sabor-latino-verona",
            "organizer": "Sabor Events",
            "featured": False,
            "boosted": False,
            "latitude": 45.4384,
            "longitude": 10.9916,
        },
    ]

DEMO_SCHOOLS = [
    {
        "name": "Academia Salsa Milano",
        "city": "Milano",
        "address": "Via Padova 112, Milano",
        "bio": "La prima academia di salsa cubana a Milano. Corsi principianti, intermedi e avanzati 7 giorni su 7. Maestri certificati dall'Havana.",
        "image_url": "https://images.pexels.com/photos/1540338/pexels-photo-1540338.jpeg",
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "styles": ["salsa", "bachata", "cha-cha"],
        "levels": ["principianti", "intermedio", "avanzato"],
        "phone": "+39 02 1234567",
        "email": "info@salsa-milano.it",
        "website": "https://salsa-milano.it",
        "instagram": "https://instagram.com/salsamilano",
        "verified_by_mauro": True,
        "students": 420,
    },
    {
        "name": "Bachata Academy Roma",
        "city": "Roma",
        "address": "Via Prenestina 204, Roma",
        "bio": "Specializzati in bachata sensual e moderna. Workshop con maestri dominicani ogni 2 mesi. Iscrizioni aperte tutto l'anno.",
        "image_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
        "cover_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "styles": ["bachata", "kizomba"],
        "levels": ["principianti", "intermedio", "avanzato"],
        "phone": "+39 06 9876543",
        "email": "info@bachataroma.it",
        "website": "https://bachataroma.it",
        "instagram": "https://instagram.com/bachataroma",
        "verified_by_mauro": True,
        "students": 310,
    },
    {
        "name": "Reggaeton Fire Napoli",
        "city": "Napoli",
        "address": "Via Toledo 85, Napoli",
        "bio": "La scuola di reggaeton e dembow piu hot del sud Italia. Crew di competizione e lezioni drop-in ogni giorno.",
        "image_url": "https://images.unsplash.com/photo-1547210841-2ceb0c5f0679",
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "styles": ["reggaeton", "dembow", "urban"],
        "levels": ["principianti", "intermedio", "avanzato"],
        "phone": "+39 081 2468135",
        "email": "hello@reggaetonfire.it",
        "instagram": "https://instagram.com/reggaetonfire",
        "verified_by_mauro": False,
        "students": 185,
    },
    {
        "name": "Cuban Heat Bologna",
        "city": "Bologna",
        "address": "Via Zamboni 63, Bologna",
        "bio": "Salsa cubana e rueda de casino in centro Bologna. Atmosfera calda e community fortissima.",
        "image_url": "https://images.pexels.com/photos/31055824/pexels-photo-31055824.jpeg",
        "cover_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
        "styles": ["salsa", "rueda", "cha-cha"],
        "levels": ["principianti", "intermedio"],
        "phone": "+39 051 123456",
        "email": "ciao@cubanheat.it",
        "website": "https://cubanheat.it",
        "instagram": "https://instagram.com/cubanheatbo",
        "verified_by_mauro": True,
        "students": 155,
    },
    {
        "name": "Latin Dance Torino",
        "city": "Torino",
        "address": "Corso Francia 321, Torino",
        "bio": "Scuola multidisciplinare: salsa, bachata, kizomba, reggaeton. Open day ogni primo sabato del mese.",
        "image_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "cover_url": "https://images.pexels.com/photos/31055824/pexels-photo-31055824.jpeg",
        "styles": ["salsa", "bachata", "kizomba", "reggaeton"],
        "levels": ["principianti", "intermedio", "avanzato"],
        "phone": "+39 011 7654321",
        "email": "info@latindance-to.it",
        "instagram": "https://instagram.com/latindanceto",
        "verified_by_mauro": False,
        "students": 240,
    },
]




DEMO_PLAYLISTS = [
    {
        "title": "LatinHub Official - Mauro's Picks",
        "description": "La playlist personale di Mauro Catalini: bachata, urban latin e reggaeton selezionati per la community LatinHub.",
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "platform": "spotify",
        "embed_url": "https://open.spotify.com/embed/playlist/0ItuuWeQtp8f3XfsBrYnOe",
        "external_url": "https://open.spotify.com/playlist/0ItuuWeQtp8f3XfsBrYnOe",
        "genre": "latin",
        "position": 1,
        "featured": True,
    },
    {
        "title": "Bachata Sensual 2026",
        "description": "Le piu belle bachate del momento. Romeo Santos, Prince Royce, Daniel Santacruz e nuove promesse.",
        "cover_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
        "platform": "spotify",
        "embed_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DX10zKzsJ2jva",
        "external_url": "https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva",
        "genre": "bachata",
        "position": 2,
        "featured": True,
    },
    {
        "title": "Reggaeton Fuego",
        "description": "Il reggaeton che spacca le piste. Bad Bunny, J Balvin, Karol G, Maluma e tanto altro.",
        "cover_url": "https://images.unsplash.com/photo-1547210841-2ceb0c5f0679",
        "platform": "spotify",
        "embed_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DWY7IeIP1cdjF",
        "external_url": "https://open.spotify.com/playlist/37i9dQZF1DWY7IeIP1cdjF",
        "genre": "reggaeton",
        "position": 3,
        "featured": True,
    },
    {
        "title": "Salsa Cubana Classica",
        "description": "Tutto il sabor cubano. Los Van Van, Havana D'Primera, Pupy, Manolito Simonet.",
        "cover_url": "https://images.pexels.com/photos/31055824/pexels-photo-31055824.jpeg",
        "platform": "spotify",
        "embed_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DWYkaDif7Ztbp",
        "external_url": "https://open.spotify.com/playlist/37i9dQZF1DWYkaDif7Ztbp",
        "genre": "salsa",
        "position": 4,
        "featured": False,
    },
    {
        "title": "Latin Pop Hits",
        "description": "Le hit latin pop del 2026. Shakira, Rosalia, Rauw Alejandro, Peso Pluma.",
        "cover_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "platform": "spotify",
        "embed_url": "https://open.spotify.com/embed/playlist/37i9dQZF1DWVcbzTgVpNRm",
        "external_url": "https://open.spotify.com/playlist/37i9dQZF1DWVcbzTgVpNRm",
        "genre": "latin",
        "position": 5,
        "featured": False,
    },
]



DEMO_MIXES = [
    {
        "title": "Bachata Sensual Mega Mix 2026",
        "dj_name": "Mauro Catalini",
        "genre": "bachata",
        "duration_sec": 3600,
        "cover_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "plays": 18400,
        "description": "60 minuti di bachata moderna & sensual. Live dal Cafe Cubano Milano.",
    },
    {
        "title": "Reggaeton Fire Vol. 7",
        "dj_name": "La Reina",
        "genre": "reggaeton",
        "duration_sec": 2700,
        "cover_url": "https://images.pexels.com/photos/14699922/pexels-photo-14699922.jpeg",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "plays": 12050,
        "description": "Il mejor reggaeton del momento. 45 minuti senza respiro.",
    },
    {
        "title": "Salsa Cubana Clasica",
        "dj_name": "DJ Salsero",
        "genre": "salsa",
        "duration_sec": 3200,
        "cover_url": "https://images.pexels.com/photos/31055824/pexels-photo-31055824.jpeg",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "plays": 9870,
        "description": "Solo classici cubani. Van Van, Los Van Van, timba.",
    },
    {
        "title": "Latin Urban Drive",
        "dj_name": "Caliente Torino",
        "genre": "latin",
        "duration_sec": 2400,
        "cover_url": "https://images.unsplash.com/photo-1547210841-2ceb0c5f0679",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "plays": 7320,
        "description": "Afrobeat + reggaeton. Perfetto per il pre-serata.",
    },
    {
        "title": "Bachata Moderna Hits",
        "dj_name": "Bachatero Bologna",
        "genre": "bachata",
        "duration_sec": 3000,
        "cover_url": "https://images.pexels.com/photos/14925309/pexels-photo-14925309.jpeg",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        "plays": 6210,
        "description": "Romeo Santos, Prince Royce e nuove promesse.",
    },
]


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@latinhub.it")
    pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": "Mauro Catalini",
                "password_hash": hash_password(pw),
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
            }
        )
        logger.info("Seeded admin user %s", email)
    elif not verify_password(pw, existing["password_hash"]):
        await db.users.update_one(
            {"email": email}, {"$set": {"password_hash": hash_password(pw)}}
        )
        logger.info("Updated admin password for %s", email)


async def seed_content():
    if await db.djs.count_documents({}) == 0:
        await db.djs.insert_many([DJ(**d).model_dump() for d in DEMO_DJS])
        logger.info("Seeded %d DJs", len(DEMO_DJS))
    else:
        # Keep verified DJs' playlist URLs in sync with the latest seed (idempotent refresh)
        for d in DEMO_DJS:
            await db.djs.update_one(
                {"slug": d["slug"]},
                {"$set": {
                    "spotify_playlist_url": d.get("spotify_playlist_url"),
                    "tidal_playlist_url": d.get("tidal_playlist_url"),
                }},
            )
    if await db.events.count_documents({}) == 0:
        await db.events.insert_many([Event(**e).model_dump() for e in _make_events()])
        logger.info("Seeded events")
    if await db.mixes.count_documents({}) == 0:
        await db.mixes.insert_many([Mix(**m).model_dump() for m in DEMO_MIXES])
        logger.info("Seeded mixes")
    if await db.playlists.count_documents({}) == 0:
        await db.playlists.insert_many([Playlist(**p).model_dump() for p in DEMO_PLAYLISTS])
        logger.info("Seeded %d playlists", len(DEMO_PLAYLISTS))
    else:
        # idempotent refresh of curator playlists (keeps admin-curated URLs in sync with seed)
        for p in DEMO_PLAYLISTS:
            await db.playlists.update_one(
                {"embed_url": p["embed_url"]},
                {"$set": {k: v for k, v in p.items() if k in ("title", "description", "cover_url", "external_url", "genre", "position", "featured")}},
                upsert=False,
            )
    if await db.schools.count_documents({}) == 0:
        for s in DEMO_SCHOOLS:
            slug = _slugify(f"{s['name']}-{s['city']}")
            await db.schools.insert_one(School(**s, slug=slug).model_dump())
        logger.info("Seeded %d schools", len(DEMO_SCHOOLS))


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.events.create_index("city")
    await db.events.create_index("date")
    await db.djs.create_index("slug", unique=True)
    await db.schools.create_index("slug", unique=True)
    await db.schools.create_index("owner_id")
    await seed_admin()
    await seed_content()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
