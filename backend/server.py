from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re as _re
import uuid
import math
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import httpx
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)
import stripe as stripe_sdk  # Official Stripe SDK - used as fallback for status checks
                              # because the emergentintegrations library sometimes
                              # returns stale "pending" status on the new API version.

# ----------------------------- Mongo ---------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----------------------------- App -----------------------------------
app = FastAPI(title="LatinFun API")
api = APIRouter(prefix="/api")

# ----------------------------- Fatture in Cloud (FIC) ----------------
# Italian fiscal invoice integration via Fatture in Cloud OAuth 2.0.
# Triggered by Stripe webhook on successful payment to issue automatic
# corrispettivo (B2C) or fattura (B2B) and transmit to SdI.
# Credentials managed via Emergent secrets (Custom keys).
FIC_CLIENT_ID = os.getenv("FIC_CLIENT_ID", "")
FIC_CLIENT_SECRET = os.getenv("FIC_CLIENT_SECRET", "")
FIC_COMPANY_ID = os.getenv("FIC_COMPANY_ID", "")

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
    referral_code: Optional[str] = None  # codice referral inserito al signup


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "user"
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str


# ============== ORGANIZER PROFILE (attivazione creazione contenuti) ==============
class OrganizerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organizer_type: str  # dj | gestore_locale | promoter | festival | scuola_ballo | privato
    business_name: str
    phone: str
    tax_id: Optional[str] = None  # P.IVA o Codice Fiscale
    instagram: Optional[str] = None
    website: Optional[str] = None
    verified: bool = False  # badge ⭐ admin-approved
    active: bool = True  # admin può revocare
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizerProfileIn(BaseModel):
    organizer_type: str
    business_name: str
    phone: str
    tax_id: Optional[str] = None
    instagram: Optional[str] = None
    website: Optional[str] = None


async def require_organizer(current_user: dict) -> dict:
    """Verifica che l'utente corrente sia un organizer attivo o admin.
    Ritorna il profilo organizer (o None per admin).
    Solleva 403 se non autorizzato."""
    if current_user.get("role") == "admin":
        return current_user
    prof = await db.organizer_profiles.find_one({"user_id": current_user["id"], "active": True})
    if not prof:
        raise HTTPException(
            status_code=403,
            detail="Devi attivare il profilo Organizzatore per creare contenuti. Vai su Profilo > Diventa Organizzatore.",
        )
    return prof


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
    owner_id: Optional[str] = None
    boosted: bool = False
    boosted_until: Optional[datetime] = None
    avg_rating: float = 0.0
    reviews_count: int = 0
    country: str = "IT"


class DJCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    bio: str = Field(min_length=10, max_length=1200)
    city: str = Field(min_length=2, max_length=60)
    genres: List[str] = []
    image_url: str
    cover_url: Optional[str] = None
    instagram: Optional[str] = None
    spotify_playlist_url: Optional[str] = None
    tidal_playlist_url: Optional[str] = None
    country: str = "IT"


class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    city: str
    venue: str
    address: str
    genre: str  # free text comma-separated: "Bachata, Salsa, Reggaeton"
    date: datetime  # start datetime
    end_date: Optional[datetime] = None  # end datetime (optional)
    image_url: str
    lineup: List[str] = []  # DJ names
    ticket_url: Optional[str] = None
    organizer: str
    organizer_type: Optional[str] = None  # dj | gestore_locale | promoter | festival | scuola_ballo | privato
    featured: bool = False
    boosted: bool = False
    boosted_until: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    owner_id: Optional[str] = None
    likes: int = 0
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    avg_rating: float = 0.0
    reviews_count: int = 0
    country: str = "IT"  # ISO-3166-1 alpha-2: IT | ES | AR


class EventCreate(BaseModel):
    title: str
    description: str
    city: str
    venue: str
    address: str
    genre: str
    date: datetime
    end_date: Optional[datetime] = None
    image_url: str
    lineup: List[str] = []
    ticket_url: Optional[str] = None
    organizer_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    country: str = "IT"


INQUIRY_TYPES = {"info", "reservation", "guestlist"}


class EventInquiryCreate(BaseModel):
    event_id: str
    type: str = Field(pattern=r"^(info|reservation|guestlist)$")
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=4, max_length=180)
    phone: Optional[str] = Field(default=None, max_length=40)
    people: int = Field(default=1, ge=1, le=50)
    message: str = Field(min_length=2, max_length=800)


class EventInquiryOut(BaseModel):
    id: str
    event_id: str
    event_title: Optional[str] = None
    type: str
    name: str
    email: str
    phone: Optional[str] = None
    people: int
    message: str
    user_id: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None


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
    boosted: bool = False
    boosted_until: Optional[datetime] = None
    saves: int = 0
    avg_rating: float = 0.0
    reviews_count: int = 0
    country: str = "IT"


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
    country: str = "IT"


# ----------------------------- Locali (Restaurants/Bars Latin) -------
class Locale(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    category: str  # ristorante | bar | lounge | discoteca_cena | altro
    cuisine: str  # CAMPO LIBERO (es: "Cubana", "Mix Caribe + Italiana", ...)
    city: str
    address: str
    bio: str
    image_url: str  # logo o foto principale
    cover_url: Optional[str] = None
    gallery: List[str] = []  # urls foto galleria
    price_range: Optional[str] = None  # "€", "€€", "€€€", "€€€€"
    hours: Optional[str] = None  # formato libero "Lun-Ven 18-02, Sab-Dom 19-04"
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    owner_id: Optional[str] = None
    verified_by_mauro: bool = False
    boosted: bool = False
    boosted_until: Optional[datetime] = None
    saves: int = 0
    avg_rating: float = 0.0
    reviews_count: int = 0
    country: str = "IT"


class LocaleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=40)
    cuisine: str = Field(min_length=1, max_length=120)  # campo libero
    city: str = Field(min_length=2, max_length=60)
    address: str = Field(min_length=3, max_length=200)
    bio: str = Field(min_length=10, max_length=1500)
    image_url: str
    cover_url: Optional[str] = None
    gallery: List[str] = []
    price_range: Optional[str] = None
    hours: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    country: str = "IT"


# ----------------------------- Auth routes ---------------------------
@api.post("/auth/register", response_model=AuthResponse)
async def register(payload: UserRegister):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())

    # Genera codice referral unico
    import secrets
    while True:
        ref_code = secrets.token_urlsafe(6).replace("_", "").replace("-", "").upper()[:8]
        if not await db.users.find_one({"referral_code": ref_code}):
            break

    # Risolvi referrer (se passato)
    referred_by_id = None
    if payload.referral_code:
        clean = payload.referral_code.strip().upper()
        ref_user = await db.users.find_one({"referral_code": clean}, {"_id": 0, "id": 1})
        if ref_user:
            referred_by_id = ref_user["id"]

    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "referral_code": ref_code,
        "referred_by": referred_by_id,
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
@api.head("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


@api.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    return {"ok": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@api.post("/auth/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change the authenticated user's own password."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 8 caratteri")
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Password attuale errata")
    new_hash = hash_password(body.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash, "password_changed_at": datetime.utcnow()}},
    )
    return {"ok": True, "message": "Password aggiornata con successo"}


@api.delete("/auth/me")
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    """
    Hard-delete the authenticated user's account and ALL related personal data.

    Required by Apple App Store guideline 5.1.1(v) - account deletion.
    The admin account (role == admin) cannot delete itself for safety.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Utente non valido")

    # Safety: admin cannot self-destruct (would lock everyone out of the app)
    if current_user.get("role") == "admin":
        raise HTTPException(
            status_code=403,
            detail="L'account admin non puo essere eliminato da questa schermata. Contatta il supporto.",
        )

    summary = {
        "events": 0,
        "djs": 0,
        "schools": 0,
        "follows": 0,
        "likes": 0,
        "saved_schools": 0,
        "saved_playlists": 0,
        "reviews": 0,
        "organizer_profile": 0,
        "contact_messages": 0,
        "dancer_chats": 0,
        "dancer_profile": 0,
        "user": 0,
    }

    # Helper that swallows errors per-collection so a single failure does not block the rest
    async def _safe_delete_many(coll_name: str, filt: dict, summary_key: str):
        try:
            coll = getattr(db, coll_name)
            res = await coll.delete_many(filt)
            summary[summary_key] = getattr(res, "deleted_count", 0) or 0
        except Exception:
            # Collection might not exist on this instance, just continue
            pass

    # 1) Content owned by the user
    await _safe_delete_many("events", {"owner_id": user_id}, "events")
    await _safe_delete_many("djs", {"owner_id": user_id}, "djs")
    await _safe_delete_many("schools", {"owner_id": user_id}, "schools")
    await _safe_delete_many("locali", {"owner_id": user_id}, "events")

    # 2) User-generated personal data
    await _safe_delete_many("user_follows", {"user_id": user_id}, "follows")
    await _safe_delete_many("user_likes", {"user_id": user_id}, "likes")
    await _safe_delete_many("user_saved_schools", {"user_id": user_id}, "saved_schools")
    await _safe_delete_many("user_saved_playlists", {"user_id": user_id}, "saved_playlists")
    await _safe_delete_many("user_saved_locali", {"user_id": user_id}, "saved_schools")
    await _safe_delete_many("reviews", {"user_id": user_id}, "reviews")
    await _safe_delete_many("organizer_profiles", {"user_id": user_id}, "organizer_profile")
    await _safe_delete_many("contact_messages", {"user_id": user_id}, "contact_messages")

    # 3) Dancer / Match partner area (chats + profile)
    try:
        await db.dancer_chats.delete_many(
            {"$or": [{"user_a": user_id}, {"user_b": user_id}, {"from_user": user_id}, {"to_user": user_id}]}
        )
    except Exception:
        pass
    await _safe_delete_many("dancer_profiles", {"user_id": user_id}, "dancer_profile")
    await _safe_delete_many("dancer_likes", {"$or": [{"from_user": user_id}, {"to_user": user_id}]}, "dancer_chats")

    # 4) Finally remove the user document itself
    try:
        ures = await db.users.delete_one({"id": user_id})
        summary["user"] = getattr(ures, "deleted_count", 0) or 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'eliminazione: {e}")

    if summary["user"] == 0:
        raise HTTPException(status_code=404, detail="Account gia eliminato o non trovato")

    return {"ok": True, "deleted": summary}


# ----------------------------- Admin (users) ------------------------
def _require_admin(current_user: dict):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo l'admin puo accedere a questa area")


class AdminUserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: Optional[datetime] = None
    has_push_token: bool = False
    notifications_enabled: bool = False
    notifications_radius_km: Optional[int] = None
    city: Optional[str] = None
    has_location: bool = False


class BroadcastIn(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    body: str = Field(min_length=2, max_length=240)
    city: Optional[str] = None
    only_with_notifications: bool = True


@api.get("/admin/users", response_model=List[AdminUserOut])
async def admin_list_users(
    q: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    query: dict = {}
    if q:
        query = {
            "$or": [
                {"email": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
            ]
        }
    docs = await db.users.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    out: List[AdminUserOut] = []
    for d in docs:
        out.append(AdminUserOut(
            id=d.get("id", ""),
            name=d.get("name", ""),
            email=d.get("email", ""),
            role=d.get("role", "user"),
            created_at=d.get("created_at"),
            has_push_token=bool(d.get("push_token")),
            notifications_enabled=bool(d.get("notifications_enabled")),
            notifications_radius_km=d.get("notifications_radius_km"),
            city=d.get("city"),
            has_location=d.get("latitude") is not None and d.get("longitude") is not None,
        ))
    return out


@api.get("/admin/users/export.csv")
async def admin_export_users_csv(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    docs = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)

    def _csv_escape(v) -> str:
        if v is None:
            return ""
        s = str(v)
        if any(c in s for c in [",", '"', "\n", "\r"]):
            s = '"' + s.replace('"', '""') + '"'
        return s

    header = [
        "id", "name", "email", "role", "created_at", "has_push_token",
        "notifications_enabled", "radius_km", "city", "has_location",
    ]
    lines = [",".join(header)]
    for d in docs:
        row = [
            d.get("id", ""),
            d.get("name", ""),
            d.get("email", ""),
            d.get("role", "user"),
            d.get("created_at").isoformat() if d.get("created_at") else "",
            "yes" if d.get("push_token") else "no",
            "yes" if d.get("notifications_enabled") else "no",
            d.get("notifications_radius_km") or "",
            d.get("city") or "",
            "yes" if (d.get("latitude") is not None and d.get("longitude") is not None) else "no",
        ]
        lines.append(",".join(_csv_escape(v) for v in row))
    body = "\n".join(lines) + "\n"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="latinfun_users_{stamp}.csv"',
        },
    )


@api.post("/admin/broadcast")
async def admin_broadcast(
    payload: BroadcastIn,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    q: dict = {"push_token": {"$ne": None, "$exists": True}}
    if payload.only_with_notifications:
        q["notifications_enabled"] = True
    if payload.city:
        q["city"] = payload.city
    cursor = db.users.find(q, {"_id": 0, "push_token": 1})
    tokens: List[str] = [d["push_token"] async for d in cursor if d.get("push_token")]
    if tokens:
        asyncio.create_task(
            _send_expo_push(tokens, payload.title, payload.body, {"broadcast": True})
        )
    return {"ok": True, "recipients": len(tokens)}


# ----------------------------- Notifications ------------------------
class PushTokenIn(BaseModel):
    token: str = Field(min_length=4, max_length=300)


class LocationIn(BaseModel):
    latitude: float
    longitude: float


class TestPushIn(BaseModel):
    title: str = "LatinFun"
    body: str = "Test notification"


class NotifSettingsIn(BaseModel):
    enabled: bool
    radius_km: int = Field(default=50, ge=5, le=500)


@api.post("/users/push-token")
async def save_push_token(payload: PushTokenIn, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"push_token": payload.token, "push_updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True}


@api.post("/users/location")
async def save_location(payload: LocationIn, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"latitude": payload.latitude, "longitude": payload.longitude}},
    )
    return {"ok": True}


@api.post("/users/notifications")
async def update_notif_settings(
    payload: NotifSettingsIn, current_user: dict = Depends(get_current_user)
):
    update = {
        "notifications_enabled": payload.enabled,
        "notifications_radius_km": payload.radius_km,
    }
    if not payload.enabled:
        update["push_token"] = None
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    return {"ok": True, **update}


@api.get("/users/notifications")
async def get_notif_settings(current_user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": current_user["id"]}, {"_id": 0}) or {}
    return {
        "enabled": bool(doc.get("notifications_enabled")),
        "radius_km": int(doc.get("notifications_radius_km") or 50),
        "has_token": bool(doc.get("push_token")),
        "has_location": doc.get("latitude") is not None and doc.get("longitude") is not None,
    }


async def _send_expo_push(tokens: List[str], title: str, body: str, data: dict = None):
    """Send an Expo Push notification batch. Fire-and-forget (errors logged)."""
    tokens = [t for t in tokens if t and t.startswith("ExponentPushToken")]
    if not tokens:
        return
    messages = [
        {"to": t, "sound": "default", "title": title, "body": body, "data": data or {}}
        for t in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
            if r.status_code >= 300:
                logger.warning("Expo push non-2xx: %s %s", r.status_code, r.text[:200])
    except Exception as e:
        logger.warning("Expo push failed: %s", e)


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    to_rad = math.radians
    dlat = to_rad(lat2 - lat1)
    dlng = to_rad(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(dlng / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


async def _notify_nearby_users_about_event(ev: dict):
    """Find users with push_token+location within their radius and send Expo push."""
    if ev.get("latitude") is None or ev.get("longitude") is None:
        return
    cursor = db.users.find(
        {
            "push_token": {"$ne": None, "$exists": True},
            "notifications_enabled": True,
            "latitude": {"$ne": None},
            "longitude": {"$ne": None},
        },
        {"_id": 0, "push_token": 1, "latitude": 1, "longitude": 1, "notifications_radius_km": 1},
    )
    targets: List[str] = []
    async for u in cursor:
        try:
            d = _haversine_km(ev["latitude"], ev["longitude"], u["latitude"], u["longitude"])
            if d <= float(u.get("notifications_radius_km") or 50):
                targets.append(u["push_token"])
        except Exception:
            continue
    if targets:
        title = f"Nuovo evento a {ev.get('city', '')}"
        body = f"{ev.get('title', '')} - {ev.get('genre', '').upper()}"
        asyncio.create_task(
            _send_expo_push(targets, title, body, {"event_id": ev["id"]})
        )


@api.post("/notifications/test")
async def send_test_push(
    payload: TestPushIn,
    current_user: dict = Depends(get_current_user),
):
    doc = await db.users.find_one({"id": current_user["id"]}, {"_id": 0}) or {}
    token = doc.get("push_token")
    if not token:
        raise HTTPException(status_code=400, detail="Nessun token push registrato")
    asyncio.create_task(_send_expo_push([token], payload.title, payload.body, {"test": True}))
    return {"ok": True}


# ----------------------------- Events --------------------------------
def _country_filter_from_request(request: Request) -> Optional[str]:
    """Extract X-Country header (IT / ES / AR / INT). Returns None if INT (no filter)."""
    try:
        c = (request.headers.get("x-country") or "").upper().strip()
        if c in ("IT", "ES", "AR"):
            return c
    except Exception:
        pass
    return None


@api.get("/events", response_model=List[Event])
async def list_events(
    request: Request,
    city: Optional[str] = None,
    genre: Optional[str] = None,
    featured: Optional[bool] = None,
    country: Optional[str] = None,
):
    q: dict = {}
    if city:
        q["city"] = city
    if genre and genre != "all":
        q["genre"] = genre
    # When the caller asks for "featured", include events that are EITHER manually
    # marked as featured OR currently BOOSTED (paid promotion).
    extra_filters: List[dict] = []
    if featured is True:
        extra_filters.append({"$or": [{"featured": True}, {"boosted": True}]})
    elif featured is False:
        extra_filters.append({"featured": {"$ne": True}})
        extra_filters.append({"boosted": {"$ne": True}})
    # Country filter: query param wins, otherwise X-Country header
    effective_country = (country or "").upper() if country else _country_filter_from_request(request)
    if effective_country and effective_country != "INT":
        # Match events whose country is the requested one OR legacy events without country (treated as IT)
        if effective_country == "IT":
            extra_filters.append({"$or": [{"country": "IT"}, {"country": {"$exists": False}}, {"country": None}]})
        else:
            q["country"] = effective_country
    if extra_filters:
        if len(extra_filters) == 1:
            q.update(extra_filters[0])
        else:
            q["$and"] = extra_filters
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
    # Deve essere organizer attivo o admin
    await require_organizer(current_user)
    # Anti-flood: max 3 events per day per user (admin esente)
    if current_user.get("role") != "admin":
        since = datetime.utcnow() - timedelta(days=1)
        recent = await db.events.count_documents({
            "owner_id": current_user["id"],
            "created_at_ts": {"$gte": since},
        })
        if recent >= 3:
            raise HTTPException(
                status_code=429,
                detail="Hai raggiunto il limite di 3 eventi al giorno. Riprova domani.",
            )

    # Anti-duplicazione: stesso giorno + stessa città + stesso locale (case-insensitive)
    try:
        day_start = payload.date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
    except Exception:
        day_start = payload.date
        day_end = payload.date
    dup = await db.events.find_one({
        "city": {"$regex": f"^{payload.city.strip()}$", "$options": "i"},
        "venue": {"$regex": f"^{payload.venue.strip()}$", "$options": "i"},
        "date": {"$gte": day_start, "$lt": day_end},
    })
    if dup:
        raise HTTPException(
            status_code=409,
            detail=f"Esiste già un evento in '{dup.get('venue')}' il {day_start.strftime('%d/%m/%Y')} ({dup.get('title')}). Contatta l'organizzatore per collaborare invece di creare un duplicato.",
        )
    ev = Event(
        **payload.model_dump(),
        organizer=current_user["name"],
        owner_id=current_user["id"],
    )
    doc = ev.model_dump()
    doc["created_at_ts"] = datetime.utcnow()
    await db.events.insert_one(doc)
    # fire-and-forget push notifications to nearby users
    try:
        asyncio.create_task(_notify_nearby_users_about_event(ev.model_dump()))
    except Exception as e:
        logger.warning("notify_nearby failed: %s", e)
    return ev


# ----- Edit content (event/dj/school) — owner or admin only -----
_EVENT_EDITABLE_FIELDS = {
    "title", "description", "city", "venue", "address", "genre",
    "date", "end_date", "image_url", "lineup", "ticket_url",
    "organizer_type", "latitude", "longitude", "contact_email",
    "contact_phone", "country",
}
_DJ_EDITABLE_FIELDS = {
    "name", "bio", "city", "genres", "image_url", "cover_url",
    "instagram", "spotify_playlist_url", "tidal_playlist_url", "country",
}
_SCHOOL_EDITABLE_FIELDS = {
    "name", "city", "address", "bio", "image_url", "cover_url",
    "styles", "levels", "phone", "email", "website", "instagram", "country",
}


async def _check_owner_or_admin(coll_name: str, entity_id: str, user: dict) -> dict:
    coll = getattr(db, coll_name)
    doc = await coll.find_one({"id": entity_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    is_admin = user.get("role") == "admin"
    is_owner = doc.get("owner_id") == user.get("id")
    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="Non sei il proprietario di questo contenuto")
    return doc


def _clean_update_payload(payload: dict, allowed: set) -> dict:
    cleaned: dict = {}
    for k, v in (payload or {}).items():
        if k in allowed and v is not None:
            cleaned[k] = v
    return cleaned


@api.patch("/events/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    await _check_owner_or_admin("events", event_id, current_user)
    update_fields = _clean_update_payload(payload, _EVENT_EDITABLE_FIELDS)
    if not update_fields:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.events.update_one({"id": event_id}, {"$set": update_fields})
    fresh = await db.events.find_one({"id": event_id}, {"_id": 0})
    return Event(**fresh)


@api.patch("/djs/{dj_id}", response_model=DJ)
async def update_dj(
    dj_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    await _check_owner_or_admin("djs", dj_id, current_user)
    update_fields = _clean_update_payload(payload, _DJ_EDITABLE_FIELDS)
    if not update_fields:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.djs.update_one({"id": dj_id}, {"$set": update_fields})
    fresh = await db.djs.find_one({"id": dj_id}, {"_id": 0})
    return DJ(**fresh)


@api.patch("/schools/{school_id}", response_model=School)
async def update_school(
    school_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    await _check_owner_or_admin("schools", school_id, current_user)
    update_fields = _clean_update_payload(payload, _SCHOOL_EDITABLE_FIELDS)
    if not update_fields:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.schools.update_one({"id": school_id}, {"$set": update_fields})
    fresh = await db.schools.find_one({"id": school_id}, {"_id": 0})
    return School(**fresh)


@api.get("/events/my/venues")
async def my_recent_venues(current_user: dict = Depends(get_current_user)):
    """Restituisce i locali usati di recente dall'utente per autocomplete del form."""
    pipeline = [
        {"$match": {"owner_id": current_user["id"]}},
        {"$group": {
            "_id": {"venue": "$venue", "city": "$city", "address": "$address"},
            "count": {"$sum": 1},
            "last_used": {"$max": "$date"},
        }},
        {"$sort": {"count": -1, "last_used": -1}},
        {"$limit": 10},
    ]
    cursor = db.events.aggregate(pipeline)
    venues = []
    async for r in cursor:
        venues.append({
            "venue": r["_id"].get("venue"),
            "city": r["_id"].get("city"),
            "address": r["_id"].get("address"),
            "count": r.get("count", 0),
        })
    return venues


# ================== ORGANIZER ACTIVATION ==================
@api.get("/me/organizer")
async def get_my_organizer(current_user: dict = Depends(get_current_user)):
    """Restituisce il profilo organizzatore dell'utente corrente o None.
    Admin sono sempre considerati organizer con 'admin: true'."""
    if current_user.get("role") == "admin":
        return {
            "is_organizer": True,
            "verified": True,
            "admin": True,
            "business_name": current_user.get("name", "Admin"),
            "organizer_type": "admin",
        }
    prof = await db.organizer_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not prof:
        return {"is_organizer": False}
    return {
        "is_organizer": bool(prof.get("active", True)),
        "verified": bool(prof.get("verified", False)),
        "admin": False,
        **{k: v for k, v in prof.items() if k in ("id", "organizer_type", "business_name", "phone", "tax_id", "instagram", "website", "created_at")},
    }


@api.post("/me/organizer", response_model=OrganizerProfile)
async def become_organizer(payload: OrganizerProfileIn, current_user: dict = Depends(get_current_user)):
    """Crea o aggiorna il profilo organizzatore. Il telefono è obbligatorio."""
    if not payload.phone or len(payload.phone.strip()) < 6:
        raise HTTPException(status_code=400, detail="Numero di telefono obbligatorio (min 6 caratteri)")
    if not payload.business_name or len(payload.business_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Nome artista/attività obbligatorio")
    existing = await db.organizer_profiles.find_one({"user_id": current_user["id"]})
    now = datetime.utcnow()
    if existing:
        await db.organizer_profiles.update_one(
            {"user_id": current_user["id"]},
            {"$set": {
                "organizer_type": payload.organizer_type,
                "business_name": payload.business_name.strip(),
                "phone": payload.phone.strip(),
                "tax_id": (payload.tax_id or "").strip() or None,
                "instagram": (payload.instagram or "").strip() or None,
                "website": (payload.website or "").strip() or None,
                "active": True,
            }},
        )
        doc = await db.organizer_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
        return OrganizerProfile(**doc)
    prof = OrganizerProfile(
        user_id=current_user["id"],
        organizer_type=payload.organizer_type,
        business_name=payload.business_name.strip(),
        phone=payload.phone.strip(),
        tax_id=(payload.tax_id or "").strip() or None,
        instagram=(payload.instagram or "").strip() or None,
        website=(payload.website or "").strip() or None,
    )
    await db.organizer_profiles.insert_one(prof.model_dump())
    return prof


# ================== ADMIN PANEL: organizer management ==================
@api.get("/admin/organizers")
async def admin_list_organizers(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    cursor = db.organizer_profiles.find({}, {"_id": 0}).sort("created_at", -1)
    out = []
    async for doc in cursor:
        u = await db.users.find_one({"id": doc.get("user_id")}, {"_id": 0, "password_hash": 0})
        out.append({**doc, "user": u})
    return out


@api.post("/admin/organizers/{user_id}/verify")
async def admin_verify_organizer(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    r = await db.organizer_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"verified": True}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organizzatore non trovato")
    # Propagate verified flag to all owned DJs and Schools so it shows on cards
    await db.djs.update_many({"owner_id": user_id}, {"$set": {"verified_by_mauro": True}})
    await db.schools.update_many({"owner_id": user_id}, {"$set": {"verified_by_mauro": True}})
    return {"ok": True, "verified": True}


@api.post("/admin/organizers/{user_id}/unverify")
async def admin_unverify_organizer(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    r = await db.organizer_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"verified": False}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organizzatore non trovato")
    # Remove verified flag from owned DJs and Schools
    await db.djs.update_many({"owner_id": user_id}, {"$set": {"verified_by_mauro": False}})
    await db.schools.update_many({"owner_id": user_id}, {"$set": {"verified_by_mauro": False}})
    return {"ok": True, "verified": False}


@api.delete("/admin/organizers/{user_id}")
async def admin_revoke_organizer(user_id: str, current_user: dict = Depends(get_current_user)):
    """Revoca il ruolo organizer (active=False). Non cancella contenuti esistenti."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    r = await db.organizer_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"active": False}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organizzatore non trovato")
    return {"ok": True, "revoked": True}


@api.post("/admin/boost/force")
async def admin_force_boost(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Admin-only safety net: manually attach a BOOST to an entity, useful when
    a Stripe payment went through but the webhook/sync failed.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    kind = (payload.get("kind") or "").strip()
    entity_id = (payload.get("entity_id") or "").strip()
    days = int(payload.get("days") or 7)
    session_id = (payload.get("session_id") or "").strip()

    coll = _ENTITY_COLLECTIONS.get(kind)
    if not coll or not entity_id:
        raise HTTPException(status_code=400, detail="kind and entity_id required")

    boosted_until = datetime.now(timezone.utc) + timedelta(days=days)
    r = await db[coll].update_one(
        {"id": entity_id},
        {"$set": {"boosted": True, "boosted_until": boosted_until}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"{kind} not found")

    if session_id:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "complete",
                "payment_status": "paid",
                "boosted_until": boosted_until,
                "updated_at": datetime.now(timezone.utc),
                "manual_admin_override": True,
            }},
        )

    return {
        "ok": True,
        "kind": kind,
        "entity_id": entity_id,
        "boosted_until": boosted_until.isoformat(),
        "session_id_marked_paid": bool(session_id),
    }



# ----------------------------- Payments / BOOST ----------------------
# Fixed server-side pricing catalog (never trust client-provided amounts).
BOOST_PACKAGES: dict = {
    "week":         {"days": 7,   "price": 4.99,  "label": "1 settimana"},
    "month":        {"days": 30,  "price": 14.99, "label": "1 mese"},
    "three_months": {"days": 90,  "price": 34.99, "label": "3 mesi"},
    "six_months":   {"days": 180, "price": 59.99, "label": "6 mesi"},
    "year":         {"days": 365, "price": 99.99, "label": "1 anno"},
}


class BoostRequest(BaseModel):
    origin_url: str
    package: str = "week"


class BoostPackage(BaseModel):
    key: str
    days: int
    price: float
    label: str


class CheckoutStatusOut(BaseModel):
    status: str
    payment_status: str
    amount_total: int
    currency: str
    metadata: dict
    event_id: Optional[str] = None
    boosted: bool = False
    boosted_until: Optional[datetime] = None


def _stripe_client(http_request: Request) -> StripeCheckout:
    host = str(http_request.base_url).rstrip("/")
    return StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_secret=os.environ.get("STRIPE_WEBHOOK_SECRET") or None,
        webhook_url=f"{host}/api/webhook/stripe",
    )


@api.get("/boost/packages", response_model=List[BoostPackage])
async def list_boost_packages():
    return [BoostPackage(key=k, **v) for k, v in BOOST_PACKAGES.items()]


@api.post("/events/{event_id}/boost")
async def boost_event(
    event_id: str,
    payload: BoostRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    if ev.get("owner_id") and ev["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo l'organizzatore o l'admin puo promuovere l'evento")
    return await _create_boost_checkout(
        kind="event", entity_id=event_id, back_path=f"/event/{event_id}",
        payload=payload, http_request=http_request, current_user=current_user,
    )


@api.post("/djs/{dj_id}/boost")
async def boost_dj(
    dj_id: str,
    payload: BoostRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    dj = await db.djs.find_one({"id": dj_id}, {"_id": 0})
    if not dj:
        raise HTTPException(status_code=404, detail="DJ not found")
    if dj.get("owner_id") and dj["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo il DJ proprietario o l'admin puo promuovere il profilo")
    return await _create_boost_checkout(
        kind="dj", entity_id=dj_id, back_path=f"/dj/{dj_id}",
        payload=payload, http_request=http_request, current_user=current_user,
    )


@api.post("/schools/{school_id}/boost")
async def boost_school(
    school_id: str,
    payload: BoostRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    sc = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not sc:
        raise HTTPException(status_code=404, detail="School not found")
    if sc.get("owner_id") and sc["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo il titolare della scuola o l'admin puo promuovere")
    return await _create_boost_checkout(
        kind="school", entity_id=school_id, back_path=f"/school/{school_id}",
        payload=payload, http_request=http_request, current_user=current_user,
    )


async def _create_boost_checkout(
    *, kind: str, entity_id: str, back_path: str,
    payload: BoostRequest, http_request: Request, current_user: dict,
):
    pkg_key = payload.package
    if pkg_key not in BOOST_PACKAGES:
        raise HTTPException(status_code=400, detail=f"Pacchetto non valido: {pkg_key}")
    pkg = BOOST_PACKAGES[pkg_key]

    origin = payload.origin_url.rstrip("/")
    # Backend-hosted success page that auto-activates the BOOST and shows a
    # nice confirmation screen. The page lives on emergent.host so it always
    # works regardless of which mobile origin (deep link / web) was used.
    base = str(http_request.base_url).rstrip("/")
    success_url = f"{base}/api/payments/success/{{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base}/api/payments/cancel?back={origin}{back_path}"
    metadata = {
        "kind": kind,
        "entity_id": entity_id,
        # keep back-compat with old clients that only read event_id
        "event_id": entity_id if kind == "event" else "",
        "user_id": current_user["id"],
        "purpose": f"boost_{kind}",
        "package": pkg_key,
        "days": str(pkg["days"]),
    }
    stripe = _stripe_client(http_request)
    req = CheckoutSessionRequest(
        amount=pkg["price"],
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": current_user["id"],
        "kind": kind,
        "entity_id": entity_id,
        "event_id": entity_id if kind == "event" else None,
        "amount": pkg["price"],
        "currency": "eur",
        "status": "initiated",
        "payment_status": "pending",
        "metadata": metadata,
        "package": pkg_key,
        "days": pkg["days"],
        "created_at": datetime.now(timezone.utc),
    })
    return {
        "checkout_url": session.url,
        "session_id": session.session_id,
        "amount": pkg["price"],
        "currency": "eur",
        "package": pkg_key,
        "days": pkg["days"],
        "label": pkg["label"],
    }


def _apply_boost_if_paid(tx: dict) -> Optional[datetime]:
    """Return new boosted_until datetime if a paid tx should upgrade the event."""
    days = int(tx.get("days") or tx.get("metadata", {}).get("days") or 7)
    return datetime.now(timezone.utc) + timedelta(days=days)


@api.get("/payments/success/{session_id}")
async def payment_success_page(session_id: str, http_request: Request):
    """
    Backend-hosted success page shown to the user immediately after a successful
    Stripe payment. It activates the BOOST server-side (idempotent) and shows a
    clean confirmation screen with a button to go back to the LatinFun app.
    """
    from fastapi.responses import HTMLResponse

    stripe_sdk.api_key = os.environ["STRIPE_API_KEY"]

    # 1) Try to fetch and reconcile the transaction in the DB
    paid = False
    amount_eur = 0.0
    pkg_label = ""
    try:
        sess = stripe_sdk.checkout.Session.retrieve(session_id)
        paid = (sess.payment_status == "paid")
        amount_eur = (sess.amount_total or 0) / 100
        tx = await db.payment_transactions.find_one({"session_id": session_id})
        if tx and paid and tx.get("payment_status") != "paid":
            boosted_until = _apply_boost_if_paid(tx)
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "complete",
                    "payment_status": "paid",
                    "amount_total": sess.amount_total or 0,
                    "boosted_until": boosted_until,
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            await _mark_entity_boosted(tx, boosted_until)
        if tx:
            pkg_key = tx.get("package", "week")
            pkg_label = BOOST_PACKAGES.get(pkg_key, {}).get("label", "")
    except Exception as e:
        logger.warning("payment_success_page: failed to reconcile %s: %s", session_id, e)

    if paid:
        title = "Pagamento riuscito"
        emoji = "✅"
        message = "Il tuo evento è ora <strong>BOOSTED</strong> 🔥"
        sub = f"Pacchetto: <strong>{pkg_label}</strong> · €{amount_eur:.2f}"
        accent = "#10B981"  # green
    else:
        title = "Pagamento in elaborazione"
        emoji = "⏳"
        message = "Stiamo verificando il tuo pagamento. Torna nell'app tra qualche secondo per vedere il BOOST attivo."
        sub = ""
        accent = "#F59E0B"  # amber

    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>LatinFun · {title}</title>
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F0F12; color: #fff; }}
  .wrap {{ min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; }}
  .badge {{ width: 96px; height: 96px; border-radius: 48px; background: {accent}; display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }}
  h1 {{ font-size: 28px; margin: 0 0 12px 0; font-weight: 800; letter-spacing: -0.5px; }}
  .msg {{ font-size: 16px; color: #B9BBC2; line-height: 1.5; max-width: 380px; margin: 0 0 8px 0; }}
  .sub {{ font-size: 14px; color: #80838B; margin: 0 0 28px 0; }}
  .btn {{ display: inline-flex; align-items: center; gap: 8px; background: #E52947; color: #fff; padding: 16px 28px; border-radius: 999px; text-decoration: none; font-weight: 800; font-size: 15px; box-shadow: 0 4px 16px rgba(229,41,71,0.4); min-height: 52px; }}
  .btn:active {{ transform: scale(0.98); }}
  .hint {{ font-size: 12px; color: #5b5e66; margin-top: 24px; max-width: 320px; line-height: 1.5; }}
  .logo {{ font-weight: 900; font-size: 18px; letter-spacing: 1.5px; color: #E52947; margin-bottom: 40px; }}
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">LATINFUN</div>
    <div class="badge">{emoji}</div>
    <h1>{title}</h1>
    <p class="msg">{message}</p>
    <p class="sub">{sub}</p>
    <a class="btn" href="latinfun://" onclick="setTimeout(function(){{window.location.href='https://apps.apple.com/app/latinfun/id6764812867';}}, 1500);">
      Torna all'app →
    </a>
    <p class="hint">Se l'app non si apre automaticamente, chiudi questa finestra e apri LatinFun manualmente dal tuo telefono.</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)


@api.get("/payments/cancel")
async def payment_cancel_page(back: str = ""):
    from fastapi.responses import HTMLResponse
    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>LatinFun · Pagamento annullato</title>
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F0F12; color: #fff; }}
  .wrap {{ min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; }}
  .badge {{ width: 96px; height: 96px; border-radius: 48px; background: #6B7280; display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 24px; }}
  h1 {{ font-size: 26px; margin: 0 0 12px 0; font-weight: 800; }}
  .msg {{ font-size: 16px; color: #B9BBC2; line-height: 1.5; max-width: 380px; margin: 0 0 28px 0; }}
  .btn {{ display: inline-flex; align-items: center; gap: 8px; background: #E52947; color: #fff; padding: 16px 28px; border-radius: 999px; text-decoration: none; font-weight: 800; font-size: 15px; min-height: 52px; }}
  .logo {{ font-weight: 900; font-size: 18px; letter-spacing: 1.5px; color: #E52947; margin-bottom: 40px; }}
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">LATINFUN</div>
    <div class="badge">✕</div>
    <h1>Pagamento annullato</h1>
    <p class="msg">Hai annullato il pagamento. Nessun addebito è stato effettuato. Puoi tornare all'app e riprovare quando vuoi.</p>
    <a class="btn" href="latinfun://" onclick="setTimeout(function(){{window.location.href='https://apps.apple.com/app/latinfun/id6764812867';}}, 1500);">
      Torna all'app
    </a>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)


@api.get("/payments/status/{session_id}", response_model=CheckoutStatusOut)
async def payment_status(session_id: str, http_request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Use the OFFICIAL Stripe SDK directly to avoid stale status from the
    # intermediate library when running against the latest API version.
    stripe_sdk.api_key = os.environ["STRIPE_API_KEY"]
    try:
        session_obj = stripe_sdk.checkout.Session.retrieve(session_id)
        status_str = session_obj.status or "open"
        payment_status_str = session_obj.payment_status or "unpaid"
        amount_total_cents = session_obj.amount_total or 0
        currency_str = (session_obj.currency or "eur").lower()
        try:
            md = dict(session_obj.metadata) if session_obj.metadata else {}
        except Exception:
            md = tx.get("metadata") or {}
    except Exception as e:
        logger.warning("Stripe Session.retrieve failed for %s: %s", session_id, e)
        return CheckoutStatusOut(
            status=tx.get("status", "initiated"),
            payment_status=tx.get("payment_status", "pending"),
            amount_total=int(float(tx.get("amount", 0)) * 100),
            currency=tx.get("currency", "eur"),
            metadata=tx.get("metadata") or {},
            event_id=tx.get("event_id"),
            boosted=tx.get("payment_status") == "paid",
            boosted_until=tx.get("boosted_until"),
        )

    already_paid = tx.get("payment_status") == "paid"
    update_fields = {
        "status": status_str,
        "payment_status": payment_status_str,
        "amount_total": amount_total_cents,
        "updated_at": datetime.now(timezone.utc),
    }
    boosted_until = tx.get("boosted_until")
    if payment_status_str == "paid" and not already_paid:
        boosted_until = _apply_boost_if_paid(tx)
        update_fields["boosted_until"] = boosted_until
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_fields})
        await _mark_entity_boosted(tx, boosted_until)
    else:
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_fields})

    return CheckoutStatusOut(
        status=status_str,
        payment_status=payment_status_str,
        amount_total=amount_total_cents,
        currency=currency_str,
        metadata=md,
        event_id=tx.get("event_id"),
        boosted=payment_status_str == "paid",
        boosted_until=boosted_until,
    )


_ENTITY_COLLECTIONS = {"event": "events", "dj": "djs", "school": "schools", "locale": "locali"}


async def _mark_entity_boosted(tx: dict, boosted_until):
    kind = tx.get("kind") or ("event" if tx.get("event_id") else None)
    # Lead unlock: tx.kind == "lead_unlock"
    if kind == "lead_unlock":
        lead_id = tx.get("lead_id")
        if lead_id:
            await db.school_leads.update_one(
                {"id": lead_id},
                {"$set": {"unlocked": True, "unlocked_at": datetime.now(timezone.utc)}},
            )
    else:
        entity_id = tx.get("entity_id") or tx.get("event_id")
        if not kind or not entity_id:
            pass
        else:
            coll = _ENTITY_COLLECTIONS.get(kind)
            if coll:
                await db[coll].update_one(
                    {"id": entity_id},
                    {"$set": {"boosted": True, "boosted_until": boosted_until}},
                )
    # Affiliate: 10% del PRIMO pagamento del referee
    try:
        await _credit_referral_commission(tx)
    except Exception as e:
        logger.warning("Affiliate commission fail: %s", e)


AFFILIATE_PERCENT = 0.10  # legacy fallback (10% del primo pagamento)

# ============= NEW AFFILIATE SYSTEM (TIER + LAUNCH BOOST + RECURRING) ====
# Launch boost: durante questa finestra TUTTI ricevono % extra sul primo pagamento
AFFILIATE_LAUNCH_BOOST_PERCENT = 0.20  # 20% durante il lancio
AFFILIATE_LAUNCH_BOOST_UNTIL = datetime(2026, 8, 31, 23, 59, 59, tzinfo=timezone.utc)

# Tier system in base ai referral attivi (= invitati che hanno pagato almeno una volta)
AFFILIATE_TIERS = [
    {"key": "bronze",  "label": "Bronze",  "min_active_referrals": 0,  "first_pct": 0.10, "recurring_pct": 0.05},
    {"key": "silver",  "label": "Argento", "min_active_referrals": 4,  "first_pct": 0.12, "recurring_pct": 0.05},
    {"key": "gold",    "label": "Oro",     "min_active_referrals": 10, "first_pct": 0.15, "recurring_pct": 0.05},
]


def _is_launch_boost_active() -> bool:
    return datetime.now(timezone.utc) <= AFFILIATE_LAUNCH_BOOST_UNTIL


async def _count_active_referrals(referrer_id: str) -> int:
    """Conta gli invitati che hanno almeno una commissione (= hanno pagato)."""
    return len(
        await db.referral_commissions.distinct("referee_id", {"referrer_id": referrer_id})
    )


def _tier_for_active_count(active: int) -> dict:
    chosen = AFFILIATE_TIERS[0]
    for t in AFFILIATE_TIERS:
        if active >= t["min_active_referrals"]:
            chosen = t
    return chosen


def _next_tier(active: int) -> Optional[dict]:
    for t in AFFILIATE_TIERS:
        if t["min_active_referrals"] > active:
            return t
    return None


async def _credit_referral_commission(tx: dict):
    """
    Sistema affiliati TIER + LAUNCH BOOST + RECURRING.
    - Primo pagamento di un referee: rate = max(launch_boost, tier.first_pct)
    - Pagamenti successivi: rate = tier.recurring_pct (5%)
    """
    user_id = tx.get("user_id")
    if not user_id:
        return
    user = await db.users.find_one(
        {"id": user_id}, {"_id": 0, "id": 1, "referred_by": 1, "name": 1, "email": 1}
    )
    if not user or not user.get("referred_by"):
        return

    # Conta tx 'paid' precedenti di questo referee
    other_paid = await db.payment_transactions.count_documents({
        "user_id": user_id,
        "payment_status": "paid",
        "session_id": {"$ne": tx.get("session_id")},
    })
    is_first_payment = other_paid == 0

    amount = float(tx.get("amount") or 0)
    if amount <= 0:
        return

    # Evita doppia commissione se già esistente per questa session
    existing = await db.referral_commissions.find_one(
        {"source_session_id": tx.get("session_id")}
    )
    if existing:
        return

    # Calcola tier del referrer
    referrer_id = user["referred_by"]
    active_referrals = await _count_active_referrals(referrer_id)
    tier = _tier_for_active_count(active_referrals)

    # Determina la percentuale da applicare
    if is_first_payment:
        # Launch boost se attivo, altrimenti tier first_pct
        applied_pct = max(
            AFFILIATE_LAUNCH_BOOST_PERCENT if _is_launch_boost_active() else 0,
            tier["first_pct"],
        )
    else:
        applied_pct = tier["recurring_pct"]

    commission = round(amount * applied_pct, 2)
    if commission <= 0:
        return

    doc = {
        "id": str(uuid.uuid4()),
        "referrer_id": referrer_id,
        "referee_id": user["id"],
        "referee_name": user.get("name"),
        "referee_email": user.get("email"),
        "source_session_id": tx.get("session_id"),
        "source_kind": tx.get("kind"),
        "source_amount": amount,
        "commission_amount": commission,
        "applied_percent": applied_pct,
        "tier_at_credit": tier["key"],
        "is_first_payment": is_first_payment,
        "launch_boost_active": _is_launch_boost_active() and is_first_payment,
        "status": "pending",  # pending | paid_out
        "created_at": datetime.now(timezone.utc),
        "paid_at": None,
    }
    await db.referral_commissions.insert_one(doc)
    logger.info(
        "Affiliate commission %.2f EUR (%.0f%%) for referrer %s (referee %s, tier=%s, first=%s, launch=%s)",
        commission, applied_pct * 100, referrer_id, user["id"],
        tier["key"], is_first_payment, doc["launch_boost_active"],
    )

    # Push notifica al referrer
    try:
        ref_user = await db.users.find_one(
            {"id": referrer_id},
            {"_id": 0, "push_token": 1, "notifications_enabled": 1},
        )
        if ref_user and ref_user.get("push_token") and ref_user.get("notifications_enabled", True):
            title = "🎉 Hai guadagnato!" if is_first_payment else "💰 Nuova commissione!"
            who = user.get("name") or "un tuo invitato"
            body = (
                f"+{commission:.2f}€ dal primo pagamento di {who}"
                if is_first_payment
                else f"+{commission:.2f}€ ricorrente da {who}"
            )
            if doc["launch_boost_active"]:
                body = f"🚀 LAUNCH BOOST {int(applied_pct*100)}% · " + body
            asyncio.create_task(
                _send_expo_push(
                    [ref_user["push_token"]],
                    title,
                    body,
                    {"type": "affiliate_commission"},
                )
            )
    except Exception as e:
        logger.warning("Push affiliate fail: %s", e)


@api.post("/webhook/stripe")
async def stripe_webhook(http_request: Request):
    """
    Stripe webhook handler.
    Uses the official Stripe SDK to verify the signature and parse events,
    avoiding any compatibility issues with intermediate libraries on the
    latest Stripe API version.
    """
    body = await http_request.body()
    signature = http_request.headers.get("Stripe-Signature", "")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    stripe_sdk.api_key = os.environ["STRIPE_API_KEY"]

    event_session_id: Optional[str] = None
    event_payment_status: Optional[str] = None

    try:
        if webhook_secret and signature:
            event = stripe_sdk.Webhook.construct_event(
                payload=body, sig_header=signature, secret=webhook_secret
            )
            etype = event.get("type") if isinstance(event, dict) else event.type
            data_obj = (event.get("data") or {}).get("object") if isinstance(event, dict) else event.data.object
        else:
            # Fallback if webhook_secret missing - parse the JSON event without verification
            import json as _json
            event = _json.loads(body.decode("utf-8") or "{}")
            etype = event.get("type", "")
            data_obj = (event.get("data") or {}).get("object") or {}

        # Normalize data_obj to a dict
        if hasattr(data_obj, "to_dict_recursive"):
            obj = data_obj.to_dict_recursive()
        elif hasattr(data_obj, "id"):
            obj = {k: getattr(data_obj, k, None) for k in ("id", "payment_status", "status", "amount_total")}
        else:
            obj = dict(data_obj) if data_obj else {}

        if etype in (
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
            "payment_intent.succeeded",
        ):
            # For checkout.session.* the object id IS the session id.
            # For payment_intent.succeeded we fall back to retrieving the session.
            sid = obj.get("id", "") or ""
            if sid.startswith("cs_"):
                event_session_id = sid
                event_payment_status = obj.get("payment_status") or "paid"
            elif sid:
                # Look up the session by payment_intent
                try:
                    sessions = stripe_sdk.checkout.Session.list(payment_intent=sid, limit=1)
                    if sessions and sessions.data:
                        s = sessions.data[0]
                        event_session_id = s.id
                        event_payment_status = s.payment_status or "paid"
                except Exception as _e:
                    logger.warning("Unable to lookup session for payment_intent %s: %s", sid, _e)
    except Exception as e:
        logger.warning("Stripe webhook processing failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    if event_payment_status == "paid" and event_session_id:
        tx = await db.payment_transactions.find_one({"session_id": event_session_id})
        if tx and tx.get("payment_status") != "paid":
            boosted_until = _apply_boost_if_paid(tx)
            await db.payment_transactions.update_one(
                {"session_id": event_session_id},
                {"$set": {
                    "status": "complete",
                    "payment_status": "paid",
                    "boosted_until": boosted_until,
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            await _mark_entity_boosted(tx, boosted_until)
            logger.info("Webhook: BOOST attivato per session %s", event_session_id)

            # --- Fatturazione automatica Fatture in Cloud ---
            try:
                await _emit_fic_document_for_payment(tx)
            except Exception as e:
                logger.warning("FIC document emission failed: %s", e)
    return {"ok": True}


async def _emit_fic_document_for_payment(tx: dict):
    """Issue a fattura/corrispettivo on Fatture in Cloud for a paid transaction.

    Mix automatico:
    - If user has vat_number (P.IVA) on profile → fattura elettronica
    - Otherwise → ricevuta/corrispettivo

    Result is logged into db.fic_emitted regardless of success/failure
    so admin can retry or audit.
    """
    # Skip if FIC not connected (e.g. local/dev)
    try:
        connected = await fic.is_connected(db)
    except Exception:
        connected = False
    if not connected:
        logger.info("FIC not connected → skip emission for tx %s", tx.get("session_id"))
        return

    user_id = tx.get("user_id")
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0}) if user_id else None
    customer_name = (user_doc or {}).get("name") or (user_doc or {}).get("email") or "Cliente App"
    customer_email = (user_doc or {}).get("email") or tx.get("customer_email") or ""
    customer_vat = (user_doc or {}).get("vat_number") or tx.get("vat_number")
    customer_tax_code = (user_doc or {}).get("tax_code")
    customer_address = (user_doc or {}).get("address")

    amount_eur = float(tx.get("amount") or tx.get("amount_total", 0) or 0)
    if amount_eur > 1000:  # Stripe amount might be in cents
        amount_eur = amount_eur / 100.0
    if amount_eur <= 0:
        amount_eur = float(tx.get("amount_eur") or 4.99)

    description = (
        tx.get("description")
        or f"BOOST {tx.get('entity_type', 'evento')} - {tx.get('plan', 'standard')}"
        or "Servizio digitale LatinFun"
    )

    result = await fic.create_document_from_payment(
        db,
        amount_eur=amount_eur,
        description=description,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_vat=customer_vat,
        customer_tax_code=customer_tax_code,
        customer_address=customer_address,
        stripe_payment_id=tx.get("session_id"),
    )

    # Log emission
    await db.fic_emitted.insert_one({
        "stripe_payment_id": tx.get("session_id"),
        "user_id": user_id,
        "customer_email": customer_email,
        "amount_gross": amount_eur,
        "document_type": result.get("type"),
        "document_id": result.get("document_id"),
        "document_number": result.get("number"),
        "ok": result.get("ok", False),
        "error": result.get("error"),
        "created_at": datetime.utcnow(),
    })

    if result.get("ok"):
        logger.info("FIC document issued: %s #%s for tx %s",
                    result.get("type"), result.get("number"), tx.get("session_id"))
    else:
        logger.warning("FIC emission failed for tx %s: %s",
                       tx.get("session_id"), result.get("error"))


@api.get("/cities", response_model=List[str])
async def list_cities():
    cities = await db.events.distinct("city")
    return sorted(cities)


# ----------------------------- DJs -----------------------------------
@api.get("/djs", response_model=List[DJ])
async def list_djs(request: Request, city: Optional[str] = None, verified: Optional[bool] = None, country: Optional[str] = None):
    q: dict = {}
    if city:
        q["city"] = city
    if verified is not None:
        q["verified_by_mauro"] = verified
    effective_country = (country or "").upper() if country else _country_filter_from_request(request)
    if effective_country and effective_country != "INT":
        if effective_country == "IT":
            q["$or"] = [{"country": "IT"}, {"country": {"$exists": False}}, {"country": None}]
        else:
            q["country"] = effective_country
    docs = await db.djs.find(q, {"_id": 0}).sort([("boosted", -1), ("followers", -1)]).to_list(500)
    return [DJ(**d) for d in docs]


@api.get("/djs/{dj_id}", response_model=DJ)
async def get_dj(dj_id: str):
    doc = await db.djs.find_one({"id": dj_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="DJ not found")
    return DJ(**doc)


@api.post("/djs", response_model=DJ)
async def create_dj(
    payload: DJCreate,
    current_user: dict = Depends(get_current_user),
    force: bool = False,
):
    await require_organizer(current_user)
    # Anti-duplication: check existing DJ with same name + city (case-insensitive)
    if not force or current_user.get("role") != "admin":
        existing = await db.djs.find_one(
            {
                "name": {"$regex": f"^{_re_escape(payload.name.strip())}$", "$options": "i"},
                "city": {"$regex": f"^{_re_escape(payload.city.strip())}$", "$options": "i"},
            },
            {"_id": 0, "id": 1, "name": 1, "city": 1, "owner_id": 1},
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "duplicate",
                    "message": f"Esiste gia un DJ chiamato '{existing.get('name')}' a {existing.get('city')}. Se sei il proprietario, contatta il supporto.",
                    "existing_id": existing.get("id"),
                    "is_owner": existing.get("owner_id") == current_user.get("id"),
                },
            )
    base_slug = _slugify(f"{payload.name}-{payload.city}")
    slug = base_slug
    if await db.djs.find_one({"slug": slug}):
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    dj = DJ(**payload.model_dump(), slug=slug, owner_id=current_user["id"])
    await db.djs.insert_one(dj.model_dump())
    return dj


@api.get("/my/dj", response_model=Optional[DJ])
async def my_dj(current_user: dict = Depends(get_current_user)):
    doc = await db.djs.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    return DJ(**doc) if doc else None


# ----------------------------- Follow / Like ------------------------
@api.post("/djs/{dj_id}/follow")
async def follow_dj(dj_id: str, current_user: dict = Depends(get_current_user)):
    dj = await db.djs.find_one({"id": dj_id}, {"_id": 0, "id": 1})
    if not dj:
        raise HTTPException(status_code=404, detail="DJ not found")
    existing = await db.user_follows.find_one(
        {"user_id": current_user["id"], "dj_id": dj_id}
    )
    if existing:
        return {"ok": True, "following": True}
    await db.user_follows.insert_one(
        {
            "user_id": current_user["id"],
            "dj_id": dj_id,
            "created_at": datetime.now(timezone.utc),
        }
    )
    await db.djs.update_one({"id": dj_id}, {"$inc": {"followers": 1}})
    return {"ok": True, "following": True}


@api.delete("/djs/{dj_id}/follow")
async def unfollow_dj(dj_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.user_follows.delete_one(
        {"user_id": current_user["id"], "dj_id": dj_id}
    )
    if res.deleted_count:
        await db.djs.update_one({"id": dj_id}, {"$inc": {"followers": -1}})
    return {"ok": True, "following": False}


@api.get("/my/follows", response_model=List[str])
async def my_follows(current_user: dict = Depends(get_current_user)):
    cursor = db.user_follows.find({"user_id": current_user["id"]}, {"_id": 0, "dj_id": 1})
    return [d["dj_id"] async for d in cursor]


@api.post("/events/{event_id}/like")
async def like_event(event_id: str, current_user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0, "id": 1})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    existing = await db.user_likes.find_one(
        {"user_id": current_user["id"], "event_id": event_id}
    )
    if existing:
        return {"ok": True, "liked": True}
    await db.user_likes.insert_one(
        {
            "user_id": current_user["id"],
            "event_id": event_id,
            "created_at": datetime.now(timezone.utc),
        }
    )
    await db.events.update_one({"id": event_id}, {"$inc": {"likes": 1}})
    return {"ok": True, "liked": True}


@api.delete("/events/{event_id}/like")
async def unlike_event(event_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.user_likes.delete_one(
        {"user_id": current_user["id"], "event_id": event_id}
    )
    if res.deleted_count:
        await db.events.update_one({"id": event_id}, {"$inc": {"likes": -1}})
    return {"ok": True, "liked": False}


@api.get("/my/likes", response_model=List[str])
async def my_likes(current_user: dict = Depends(get_current_user)):
    cursor = db.user_likes.find({"user_id": current_user["id"]}, {"_id": 0, "event_id": 1})
    return [d["event_id"] async for d in cursor]


@api.post("/schools/{school_id}/save")
async def save_school(school_id: str, current_user: dict = Depends(get_current_user)):
    school = await db.schools.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="Scuola non trovata")
    existing = await db.user_saved_schools.find_one(
        {"user_id": current_user["id"], "school_id": school_id}
    )
    if existing:
        return {"saved": True}
    await db.user_saved_schools.insert_one(
        {"user_id": current_user["id"], "school_id": school_id, "created_at": datetime.utcnow()}
    )
    new_count = (school.get("saves") or 0) + 1
    await db.schools.update_one({"id": school_id}, {"$set": {"saves": new_count}})
    return {"saved": True, "saves": new_count}


@api.delete("/schools/{school_id}/save")
async def unsave_school(school_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.user_saved_schools.delete_one(
        {"user_id": current_user["id"], "school_id": school_id}
    )
    if res.deleted_count:
        await db.schools.update_one({"id": school_id}, {"$inc": {"saves": -1}})
    return {"saved": False}


@api.get("/my/saved-schools", response_model=List[str])
async def my_saved_schools(current_user: dict = Depends(get_current_user)):
    cursor = db.user_saved_schools.find(
        {"user_id": current_user["id"]}, {"_id": 0, "school_id": 1}
    )
    return [d["school_id"] async for d in cursor]


@api.post("/playlists/{playlist_id}/save")
async def save_playlist(playlist_id: str, current_user: dict = Depends(get_current_user)):
    pl = await db.playlists.find_one({"id": playlist_id})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist non trovata")
    existing = await db.user_saved_playlists.find_one(
        {"user_id": current_user["id"], "playlist_id": playlist_id}
    )
    if existing:
        return {"saved": True}
    await db.user_saved_playlists.insert_one(
        {"user_id": current_user["id"], "playlist_id": playlist_id, "created_at": datetime.utcnow()}
    )
    return {"saved": True}


@api.delete("/playlists/{playlist_id}/save")
async def unsave_playlist(playlist_id: str, current_user: dict = Depends(get_current_user)):
    await db.user_saved_playlists.delete_one(
        {"user_id": current_user["id"], "playlist_id": playlist_id}
    )
    return {"saved": False}


@api.get("/my/saved-playlists", response_model=List[str])
async def my_saved_playlists(current_user: dict = Depends(get_current_user)):
    cursor = db.user_saved_playlists.find(
        {"user_id": current_user["id"]}, {"_id": 0, "playlist_id": 1}
    )
    return [d["playlist_id"] async for d in cursor]


@api.get("/my/favorites")
async def my_favorites(current_user: dict = Depends(get_current_user)):
    follows = [d["dj_id"] async for d in db.user_follows.find(
        {"user_id": current_user["id"]}, {"_id": 0, "dj_id": 1}
    )]
    likes = [d["event_id"] async for d in db.user_likes.find(
        {"user_id": current_user["id"]}, {"_id": 0, "event_id": 1}
    )]
    saved_schools = [d["school_id"] async for d in db.user_saved_schools.find(
        {"user_id": current_user["id"]}, {"_id": 0, "school_id": 1}
    )]
    saved_playlists = [d["playlist_id"] async for d in db.user_saved_playlists.find(
        {"user_id": current_user["id"]}, {"_id": 0, "playlist_id": 1}
    )]
    djs = await db.djs.find({"id": {"$in": follows}}, {"_id": 0}).to_list(500)
    events = await db.events.find({"id": {"$in": likes}}, {"_id": 0}).to_list(500)
    schools = await db.schools.find({"id": {"$in": saved_schools}}, {"_id": 0}).to_list(500)
    playlists = await db.playlists.find({"id": {"$in": saved_playlists}}, {"_id": 0}).to_list(500)
    return {"djs": djs, "events": events, "schools": schools, "playlists": playlists}


# ----------------------------- Event Inquiries ---------------------
@api.post("/events/{event_id}/inquiries", response_model=EventInquiryOut)
async def create_event_inquiry(
    event_id: str,
    payload: EventInquiryCreate,
    current_user: dict = Depends(get_current_user),
):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    if payload.type not in INQUIRY_TYPES:
        raise HTTPException(status_code=400, detail="Tipo richiesta non valido")
    doc = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "event_title": ev.get("title"),
        "type": payload.type,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "phone": (payload.phone or "").strip() or None,
        "people": payload.people,
        "message": payload.message.strip(),
        "user_id": current_user["id"],
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.event_inquiries.insert_one(doc)
    # Notify event owner via push if token is available
    owner_id = ev.get("owner_id")
    if owner_id and owner_id != current_user["id"]:
        try:
            owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "push_token": 1})
            if owner and owner.get("push_token"):
                label = {
                    "info": "richiesta info",
                    "reservation": "richiesta tavolo",
                    "guestlist": "richiesta lista",
                }.get(payload.type, "richiesta")
                asyncio.create_task(
                    _send_expo_push(
                        [owner["push_token"]],
                        f"Nuova {label}",
                        f"{payload.name} per '{ev.get('title', '')}'",
                        {"event_id": event_id, "inquiry_id": doc["id"]},
                    )
                )
        except Exception as e:
            logger.warning("inquiry push failed: %s", e)
    return EventInquiryOut(**doc)


@api.get("/events/{event_id}/inquiries", response_model=List[EventInquiryOut])
async def list_event_inquiries(
    event_id: str,
    current_user: dict = Depends(get_current_user),
):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    if ev.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo l'organizzatore puo vedere le richieste")
    cursor = db.event_inquiries.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1)
    return [EventInquiryOut(**d) async for d in cursor]


@api.post("/events/inquiries/{inquiry_id}/read")
async def mark_inquiry_read(
    inquiry_id: str,
    current_user: dict = Depends(get_current_user),
):
    inq = await db.event_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    ev = await db.events.find_one({"id": inq["event_id"]}, {"_id": 0, "owner_id": 1})
    if not ev or (ev.get("owner_id") != current_user["id"] and current_user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Non autorizzato")
    await db.event_inquiries.update_one({"id": inquiry_id}, {"$set": {"read": True}})
    return {"ok": True}


@api.get("/my/inquiries-count")
async def my_inquiries_count(current_user: dict = Depends(get_current_user)):
    """Total unread inquiries across all events owned by current user."""
    ids = [e["id"] async for e in db.events.find(
        {"owner_id": current_user["id"]}, {"_id": 0, "id": 1}
    )]
    if not ids:
        return {"total": 0, "unread": 0}
    total = await db.event_inquiries.count_documents({"event_id": {"$in": ids}})
    unread = await db.event_inquiries.count_documents(
        {"event_id": {"$in": ids}, "read": {"$ne": True}}
    )
    return {"total": total, "unread": unread}


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
def _re_escape(value: str) -> str:
    """Escape a string for safe use inside a MongoDB $regex."""
    return _re.escape(str(value or ""))


def _slugify(value: str) -> str:
    base = "".join(c if c.isalnum() else "-" for c in value.lower()).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "scuola"


@api.get("/schools", response_model=List[School])
async def list_schools(request: Request, city: Optional[str] = None, style: Optional[str] = None, country: Optional[str] = None):
    q: dict = {}
    if city:
        q["city"] = city
    if style and style != "all":
        q["styles"] = style
    effective_country = (country or "").upper() if country else _country_filter_from_request(request)
    if effective_country and effective_country != "INT":
        if effective_country == "IT":
            q["$or"] = [{"country": "IT"}, {"country": {"$exists": False}}, {"country": None}]
        else:
            q["country"] = effective_country
    docs = await db.schools.find(q, {"_id": 0}).sort([("boosted", -1), ("students", -1)]).to_list(500)
    return [School(**d) for d in docs]


@api.get("/schools/{school_id}", response_model=School)
async def get_school(school_id: str):
    doc = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="School not found")
    return School(**doc)


@api.post("/schools", response_model=School)
async def create_school(
    payload: SchoolCreate,
    current_user: dict = Depends(get_current_user),
    force: bool = False,
):
    await require_organizer(current_user)
    # Anti-duplication: check existing school with same name + city (case-insensitive)
    if not force or current_user.get("role") != "admin":
        existing = await db.schools.find_one(
            {
                "name": {"$regex": f"^{_re_escape(payload.name.strip())}$", "$options": "i"},
                "city": {"$regex": f"^{_re_escape(payload.city.strip())}$", "$options": "i"},
            },
            {"_id": 0, "id": 1, "name": 1, "city": 1, "owner_id": 1},
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "duplicate",
                    "message": f"Esiste gia una scuola chiamata '{existing.get('name')}' a {existing.get('city')}. Se sei il proprietario, contatta il supporto.",
                    "existing_id": existing.get("id"),
                    "is_owner": existing.get("owner_id") == current_user.get("id"),
                },
            )
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


# ---- Delete endpoints (owner or admin only) ----
async def _assert_owner_or_admin(entity: dict, current_user: dict, label: str):
    if not entity:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    if entity.get("owner_id") and entity["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail=f"Solo il proprietario o l'admin puo eliminare questo {label.lower()}")


@api.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    await _assert_owner_or_admin(ev, current_user, "Evento")
    await db.events.delete_one({"id": event_id})
    # pulisci collezioni correlate
    await db.user_likes.delete_many({"event_id": event_id})
    await db.event_inquiries.delete_many({"event_id": event_id})
    return {"ok": True}


@api.delete("/djs/{dj_id}")
async def delete_dj(dj_id: str, current_user: dict = Depends(get_current_user)):
    dj = await db.djs.find_one({"id": dj_id}, {"_id": 0})
    await _assert_owner_or_admin(dj, current_user, "DJ")
    await db.djs.delete_one({"id": dj_id})
    await db.user_follows.delete_many({"dj_id": dj_id})
    return {"ok": True}


@api.delete("/schools/{school_id}")
async def delete_school(school_id: str, current_user: dict = Depends(get_current_user)):
    sc = await db.schools.find_one({"id": school_id}, {"_id": 0})
    await _assert_owner_or_admin(sc, current_user, "Scuola")
    await db.schools.delete_one({"id": school_id})
    return {"ok": True}


# ----------------------------- Locali (Restaurants/Bars) endpoints ----
@api.get("/locali", response_model=List[Locale])
async def list_locali(
    request: Request,
    city: Optional[str] = None,
    category: Optional[str] = None,
    country: Optional[str] = None,
):
    q: dict = {}
    if city:
        q["city"] = city
    if category and category != "all":
        q["category"] = category
    effective_country = (country or "").upper() if country else _country_filter_from_request(request)
    if effective_country and effective_country != "INT":
        if effective_country == "IT":
            q["$or"] = [{"country": "IT"}, {"country": {"$exists": False}}, {"country": None}]
        else:
            q["country"] = effective_country
    docs = await db.locali.find(q, {"_id": 0}).sort([("boosted", -1), ("avg_rating", -1), ("saves", -1)]).to_list(500)
    return [Locale(**d) for d in docs]


@api.get("/locali/{locale_id}", response_model=Locale)
async def get_locale(locale_id: str):
    doc = await db.locali.find_one({"id": locale_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Locale not found")
    return Locale(**doc)


@api.post("/locali", response_model=Locale)
async def create_locale(
    payload: LocaleCreate,
    current_user: dict = Depends(get_current_user),
    force: bool = False,
):
    # Per ora chiunque sia loggato puo creare. In futuro restringere a admin/organizer business.
    if current_user.get("role") != "admin":
        await require_organizer(current_user)
    # Anti-duplication
    if not force or current_user.get("role") != "admin":
        existing = await db.locali.find_one(
            {
                "name": {"$regex": f"^{_re_escape(payload.name.strip())}$", "$options": "i"},
                "city": {"$regex": f"^{_re_escape(payload.city.strip())}$", "$options": "i"},
            },
            {"_id": 0, "id": 1, "name": 1, "city": 1, "owner_id": 1},
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "duplicate",
                    "message": f"Esiste gia un locale chiamato '{existing.get('name')}' a {existing.get('city')}.",
                    "existing_id": existing.get("id"),
                    "is_owner": existing.get("owner_id") == current_user.get("id"),
                },
            )
    slug = _slugify(f"{payload.name}-{payload.city}")
    if await db.locali.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    locale = Locale(
        **payload.model_dump(),
        slug=slug,
        owner_id=current_user["id"],
    )
    await db.locali.insert_one(locale.model_dump())
    return locale


@api.patch("/locali/{locale_id}", response_model=Locale)
async def update_locale(
    locale_id: str,
    payload: LocaleCreate,
    current_user: dict = Depends(get_current_user),
):
    await _check_owner_or_admin("locali", locale_id, current_user)
    allowed = set(LocaleCreate.model_fields.keys())
    update_fields = _clean_update_payload(payload.model_dump(exclude_unset=True), allowed)
    if update_fields:
        await db.locali.update_one({"id": locale_id}, {"$set": update_fields})
    fresh = await db.locali.find_one({"id": locale_id}, {"_id": 0})
    return Locale(**fresh)


@api.delete("/locali/{locale_id}")
async def delete_locale(locale_id: str, current_user: dict = Depends(get_current_user)):
    lc = await db.locali.find_one({"id": locale_id}, {"_id": 0})
    await _assert_owner_or_admin(lc, current_user, "Locale")
    await db.locali.delete_one({"id": locale_id})
    await db.user_saved_locali.delete_many({"locale_id": locale_id})
    return {"ok": True}


@api.post("/locali/{locale_id}/boost")
async def boost_locale(
    locale_id: str,
    payload: BoostRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    lc = await db.locali.find_one({"id": locale_id}, {"_id": 0})
    if not lc:
        raise HTTPException(status_code=404, detail="Locale not found")
    if lc.get("owner_id") and lc["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo il titolare del locale o l'admin puo promuovere")
    return await _create_boost_checkout(
        kind="locale", entity_id=locale_id, back_path=f"/locale/{locale_id}",
        payload=payload, http_request=http_request, current_user=current_user,
    )


@api.post("/locali/{locale_id}/save")
async def save_locale(locale_id: str, current_user: dict = Depends(get_current_user)):
    locale = await db.locali.find_one({"id": locale_id})
    if not locale:
        raise HTTPException(status_code=404, detail="Locale not found")
    existing = await db.user_saved_locali.find_one(
        {"user_id": current_user["id"], "locale_id": locale_id}
    )
    if existing:
        return {"ok": True, "saves": locale.get("saves", 0)}
    new_count = (locale.get("saves") or 0) + 1
    await db.user_saved_locali.insert_one(
        {"user_id": current_user["id"], "locale_id": locale_id, "created_at": datetime.now(timezone.utc)}
    )
    await db.locali.update_one({"id": locale_id}, {"$set": {"saves": new_count}})
    return {"ok": True, "saves": new_count}


@api.delete("/locali/{locale_id}/save")
async def unsave_locale(locale_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.user_saved_locali.delete_one(
        {"user_id": current_user["id"], "locale_id": locale_id}
    )
    if res.deleted_count:
        await db.locali.update_one({"id": locale_id}, {"$inc": {"saves": -1}})
    return {"ok": True}


@api.get("/my/saved-locali", response_model=List[str])
async def my_saved_locali(current_user: dict = Depends(get_current_user)):
    cursor = db.user_saved_locali.find(
        {"user_id": current_user["id"]}, {"_id": 0, "locale_id": 1}
    )
    return [d["locale_id"] async for d in cursor]


@api.get("/my/locale", response_model=Optional[Locale])
async def my_locale(current_user: dict = Depends(get_current_user)):
    doc = await db.locali.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    return Locale(**doc) if doc else None


# ----------------------------- Reviews -------------------------------
class ReviewIn(BaseModel):
    target_type: str  # "event" | "dj" | "school"
    target_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=600)


class Review(BaseModel):
    id: str
    user_id: str
    user_name: str
    target_type: str
    target_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime


VALID_TARGETS = {"event": "events", "dj": "djs", "school": "schools", "locale": "locali"}


async def _recompute_rating(target_type: str, target_id: str):
    """Aggiorna avg_rating e reviews_count del target."""
    coll = VALID_TARGETS.get(target_type)
    if not coll:
        return
    pipe = [
        {"$match": {"target_type": target_type, "target_id": target_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.reviews.aggregate(pipe).to_list(length=1)
    if agg:
        avg = round(float(agg[0]["avg"]), 2)
        cnt = int(agg[0]["count"])
    else:
        avg, cnt = 0.0, 0
    await db[coll].update_one(
        {"id": target_id}, {"$set": {"avg_rating": avg, "reviews_count": cnt}}
    )


@api.post("/reviews", response_model=Review)
async def create_review(payload: ReviewIn, current_user: dict = Depends(get_current_user)):
    if payload.target_type not in VALID_TARGETS:
        raise HTTPException(status_code=400, detail="target_type non valido")
    coll = VALID_TARGETS[payload.target_type]
    target = await db[coll].find_one({"id": payload.target_id})
    if not target:
        raise HTTPException(status_code=404, detail="Elemento non trovato")
    # blocca recensioni multiple dello stesso utente sullo stesso target
    existing = await db.reviews.find_one({
        "user_id": current_user["id"],
        "target_type": payload.target_type,
        "target_id": payload.target_id,
    })
    if existing:
        await db.reviews.update_one(
            {"id": existing["id"]},
            {"$set": {
                "rating": payload.rating,
                "comment": payload.comment,
                "created_at": datetime.utcnow(),
            }},
        )
        rid = existing["id"]
    else:
        rid = str(uuid.uuid4())
        await db.reviews.insert_one({
            "id": rid,
            "user_id": current_user["id"],
            "user_name": current_user.get("name") or "Utente",
            "target_type": payload.target_type,
            "target_id": payload.target_id,
            "rating": payload.rating,
            "comment": payload.comment,
            "created_at": datetime.utcnow(),
        })
    await _recompute_rating(payload.target_type, payload.target_id)
    out = await db.reviews.find_one({"id": rid}, {"_id": 0})
    return out


@api.get("/reviews", response_model=List[Review])
async def list_reviews(target_type: str, target_id: str, limit: int = 100):
    if target_type not in VALID_TARGETS:
        raise HTTPException(status_code=400, detail="target_type non valido")
    cursor = db.reviews.find(
        {"target_type": target_type, "target_id": target_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@api.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Recensione non trovata")
    if review["user_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    await db.reviews.delete_one({"id": review_id})
    await _recompute_rating(review["target_type"], review["target_id"])
    return {"ok": True}


# ----------------------------- Dance Partner --------------------------
class DancerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    display_name: str
    bio: str = ""
    city: str
    age: Optional[int] = None
    photo_url: str
    styles: List[str] = []  # bachata, salsa, kizomba, reggaeton, merengue
    level: str = "intermedio"  # principiante | intermedio | avanzato | pro
    looking_for: List[str] = []  # ["pratica", "social", "competizione"]
    instagram: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DancerProfileIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=60)
    bio: str = Field(default="", max_length=600)
    city: str = Field(min_length=2, max_length=60)
    age: Optional[int] = Field(default=None, ge=14, le=99)
    photo_url: str
    styles: List[str] = []
    level: str = "intermedio"
    looking_for: List[str] = []
    instagram: Optional[str] = None
    is_active: bool = True


class SwipeIn(BaseModel):
    direction: str  # "like" | "pass"


@api.post("/dancer/profile", response_model=DancerProfile)
async def upsert_dancer_profile(
    payload: DancerProfileIn, current_user: dict = Depends(get_current_user)
):
    existing = await db.dancer_profiles.find_one({"user_id": current_user["id"]})
    data = payload.model_dump()
    if existing:
        await db.dancer_profiles.update_one(
            {"id": existing["id"]}, {"$set": data}
        )
        out = await db.dancer_profiles.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        new = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "created_at": datetime.utcnow(),
            **data,
        }
        await db.dancer_profiles.insert_one(new)
        out = await db.dancer_profiles.find_one({"id": new["id"]}, {"_id": 0})
    return out


@api.get("/dancer/profile/me")
async def my_dancer_profile(current_user: dict = Depends(get_current_user)):
    p = await db.dancer_profiles.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    return p


@api.get("/dancer/discover", response_model=List[DancerProfile])
async def discover_dancers(
    limit: int = 30,
    current_user: dict = Depends(get_current_user),
):
    me = await db.dancer_profiles.find_one({"user_id": current_user["id"]})
    if not me:
        raise HTTPException(
            status_code=400, detail="Crea prima il tuo profilo ballerino"
        )
    # Esclude profili gia' swipati
    swiped = [
        s["target_user_id"]
        async for s in db.dancer_swipes.find(
            {"user_id": current_user["id"]}, {"_id": 0, "target_user_id": 1}
        )
    ]
    swiped.append(current_user["id"])  # se stesso

    query = {
        "user_id": {"$nin": swiped},
        "is_active": True,
    }
    cursor = db.dancer_profiles.find(query, {"_id": 0})
    profiles = await cursor.to_list(length=200)
    # ordina: stessa citta' prima, stili in comune
    my_styles = set(me.get("styles") or [])
    my_city = me.get("city", "").lower()

    def score(p):
        common = len(set(p.get("styles") or []) & my_styles)
        same_city = 1 if p.get("city", "").lower() == my_city else 0
        return same_city * 10 + common
    profiles.sort(key=score, reverse=True)
    return profiles[:limit]


@api.post("/dancer/{target_user_id}/swipe")
async def swipe_dancer(
    target_user_id: str,
    payload: SwipeIn,
    current_user: dict = Depends(get_current_user),
):
    if payload.direction not in {"like", "pass"}:
        raise HTTPException(status_code=400, detail="direction non valido")
    if target_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Non puoi swipare te stesso")
    target = await db.dancer_profiles.find_one({"user_id": target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Profilo non trovato")

    await db.dancer_swipes.update_one(
        {"user_id": current_user["id"], "target_user_id": target_user_id},
        {"$set": {
            "user_id": current_user["id"],
            "target_user_id": target_user_id,
            "direction": payload.direction,
            "created_at": datetime.utcnow(),
        }},
        upsert=True,
    )

    # Verifica reciprocity per "like"
    if payload.direction == "like":
        reverse = await db.dancer_swipes.find_one({
            "user_id": target_user_id,
            "target_user_id": current_user["id"],
            "direction": "like",
        })
        if reverse:
            # crea match se non esiste
            pair_id = "_".join(sorted([current_user["id"], target_user_id]))
            await db.dancer_matches.update_one(
                {"pair_id": pair_id},
                {"$setOnInsert": {
                    "pair_id": pair_id,
                    "user_a": current_user["id"],
                    "user_b": target_user_id,
                    "created_at": datetime.utcnow(),
                }},
                upsert=True,
            )

            # Push notifica nuovo match a entrambi gli utenti
            try:
                me_doc = await db.users.find_one(
                    {"id": current_user["id"]}, {"_id": 0, "name": 1}
                )
                target_user = await db.users.find_one(
                    {"id": target_user_id},
                    {"_id": 0, "push_token": 1, "notifications_enabled": 1, "name": 1},
                )
                me_user_full = await db.users.find_one(
                    {"id": current_user["id"]},
                    {"_id": 0, "push_token": 1, "notifications_enabled": 1},
                )
                # Notifica al target
                if (
                    target_user
                    and target_user.get("push_token")
                    and target_user.get("notifications_enabled", True)
                ):
                    me_name = (me_doc or {}).get("name") or "Un ballerino"
                    asyncio.create_task(
                        _send_expo_push(
                            [target_user["push_token"]],
                            "💃 Nuovo Match!",
                            f"Hai fatto match con {me_name} su LatinFun!",
                            {"type": "match", "peer_user_id": current_user["id"]},
                        )
                    )
                # Notifica a chi ha appena fatto like (conferma del match)
                if (
                    me_user_full
                    and me_user_full.get("push_token")
                    and me_user_full.get("notifications_enabled", True)
                ):
                    target_name = (target_user or {}).get("name") or "Un ballerino"
                    asyncio.create_task(
                        _send_expo_push(
                            [me_user_full["push_token"]],
                            "💃 Nuovo Match!",
                            f"È match con {target_name}! Inizia a chattare 🔥",
                            {"type": "match", "peer_user_id": target_user_id},
                        )
                    )
            except Exception as e:
                logger.warning("Push match fail: %s", e)

            return {
                "match": True,
                "with_user_id": target_user_id,
                "with_profile": {k: v for k, v in target.items() if k != "_id"},
            }
    return {"match": False}


@api.get("/dancer/matches")
async def my_matches(current_user: dict = Depends(get_current_user)):
    cursor = db.dancer_matches.find(
        {"$or": [
            {"user_a": current_user["id"]},
            {"user_b": current_user["id"]},
        ]},
        {"_id": 0},
    ).sort("created_at", -1)
    matches = await cursor.to_list(length=200)
    other_ids = [m["user_b"] if m["user_a"] == current_user["id"] else m["user_a"] for m in matches]
    profiles = await db.dancer_profiles.find(
        {"user_id": {"$in": other_ids}}, {"_id": 0}
    ).to_list(length=500)
    by_user = {p["user_id"]: p for p in profiles}
    return [
        {
            "match_at": m["created_at"],
            "profile": by_user.get(m["user_b"] if m["user_a"] == current_user["id"] else m["user_a"]),
        }
        for m in matches
        if by_user.get(m["user_b"] if m["user_a"] == current_user["id"] else m["user_a"])
    ]


# ----------------------------- Dancer Chat ---------------------------
class ChatMessage(BaseModel):
    id: str
    pair_id: str
    sender_id: str
    text: str
    read: bool = False
    created_at: datetime


class ChatMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def _pair_id(uid_a: str, uid_b: str) -> str:
    return "_".join(sorted([uid_a, uid_b]))


async def _verify_match(current_user_id: str, peer_user_id: str) -> str:
    """Return pair_id se i due utenti sono in match, else 403."""
    pid = _pair_id(current_user_id, peer_user_id)
    m = await db.dancer_matches.find_one({"pair_id": pid})
    if not m:
        raise HTTPException(status_code=403, detail="Non sei in match con questo utente")
    return pid


@api.post("/dancer/chat/{peer_user_id}", response_model=ChatMessage)
async def send_chat_message(
    peer_user_id: str,
    payload: ChatMessageIn,
    current_user: dict = Depends(get_current_user),
):
    pid = await _verify_match(current_user["id"], peer_user_id)
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Messaggio vuoto")
    doc = {
        "id": str(uuid.uuid4()),
        "pair_id": pid,
        "sender_id": current_user["id"],
        "recipient_id": peer_user_id,
        "text": text[:2000],
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.chat_messages.insert_one(doc)

    # Push notification to peer (if has token & notifications enabled)
    try:
        peer = await db.users.find_one(
            {"id": peer_user_id},
            {"_id": 0, "push_token": 1, "notifications_enabled": 1},
        )
        if peer and peer.get("push_token") and peer.get("notifications_enabled", True):
            sender_name = current_user.get("name") or "Un partner"
            preview = text[:100] + ("..." if len(text) > 100 else "")
            asyncio.create_task(
                _send_expo_push(
                    [peer["push_token"]],
                    f"{sender_name}",
                    preview,
                    {"type": "chat", "peer_user_id": current_user["id"]},
                )
            )
    except Exception as e:
        logger.warning("Push chat fail: %s", e)

    doc.pop("_id", None)
    doc.pop("recipient_id", None)
    return ChatMessage(**doc)


@api.get("/dancer/chat/{peer_user_id}", response_model=List[ChatMessage])
async def get_chat_messages(
    peer_user_id: str,
    current_user: dict = Depends(get_current_user),
):
    pid = await _verify_match(current_user["id"], peer_user_id)
    msgs = (
        await db.chat_messages.find({"pair_id": pid})
        .sort("created_at", 1)
        .to_list(length=2000)
    )
    # Mark unread (received) messages as read
    await db.chat_messages.update_many(
        {"pair_id": pid, "sender_id": peer_user_id, "read": False},
        {"$set": {"read": True}},
    )
    out = []
    for m in msgs:
        m.pop("_id", None)
        m.pop("recipient_id", None)
        out.append(ChatMessage(**m))
    return out


@api.get("/dancer/chat-unread-count")
async def chat_unread_count(current_user: dict = Depends(get_current_user)):
    n = await db.chat_messages.count_documents({
        "recipient_id": current_user["id"],
        "read": False,
    })
    return {"unread": n}


# ----------------------------- Admin: Match Health Dashboard ----------
@api.get("/admin/match-health")
async def admin_match_health(current_user: dict = Depends(get_current_user)):
    """Dashboard admin con metriche complete sul sistema MATCH."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")

    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)

    # Profili totali
    profiles_total = await db.dancer_profiles.count_documents({})
    profiles_active = await db.dancer_profiles.count_documents({"is_active": True})
    profiles_new_7d = await db.dancer_profiles.count_documents({"created_at": {"$gte": last_7d}})

    # Per città/stili
    cities_agg = await db.dancer_profiles.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(20)
    styles_agg = await db.dancer_profiles.aggregate([
        {"$match": {"is_active": True}},
        {"$unwind": "$styles"},
        {"$group": {"_id": "$styles", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(20)

    # Swipes
    swipes_total = await db.dancer_swipes.count_documents({})
    swipes_24h = await db.dancer_swipes.count_documents({"created_at": {"$gte": last_24h}})
    likes_total = await db.dancer_swipes.count_documents({"direction": "like"})
    passes_total = await db.dancer_swipes.count_documents({"direction": "pass"})
    like_ratio = (likes_total / swipes_total * 100) if swipes_total else 0

    # Matches
    matches_total = await db.dancer_matches.count_documents({})
    matches_24h = await db.dancer_matches.count_documents({"created_at": {"$gte": last_24h}})
    matches_7d = await db.dancer_matches.count_documents({"created_at": {"$gte": last_7d}})

    # Conversion rate (match per swipe)
    match_rate = (matches_total * 2 / swipes_total * 100) if swipes_total else 0

    # Chat
    msgs_total = await db.chat_messages.count_documents({})
    msgs_24h = await db.chat_messages.count_documents({"sent_at": {"$gte": last_24h}})

    # Match con chat attiva (% di match che effettivamente chattano)
    matches_with_chat = len(await db.chat_messages.distinct("pair_id"))
    chat_engagement = (matches_with_chat / matches_total * 100) if matches_total else 0

    # Recent matches (ultimi 10)
    recent_matches_raw = await db.dancer_matches.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    recent_matches = []
    for m in recent_matches_raw:
        users = m.get("user_ids", [])
        if len(users) == 2:
            u1 = await db.users.find_one({"id": users[0]}, {"_id": 0, "name": 1})
            u2 = await db.users.find_one({"id": users[1]}, {"_id": 0, "name": 1})
            recent_matches.append({
                "pair_id": m.get("pair_id"),
                "user_1": (u1 or {}).get("name", "?"),
                "user_2": (u2 or {}).get("name", "?"),
                "created_at": m.get("created_at"),
            })

    # Profili senza foto / bio (segnali di setup incompleto)
    no_photo = await db.dancer_profiles.count_documents({"photo_url": {"$in": [None, ""]}})
    short_bio = await db.dancer_profiles.count_documents({"bio": {"$regex": "^.{0,20}$"}})

    return {
        "profiles": {
            "total": profiles_total,
            "active": profiles_active,
            "new_last_7d": profiles_new_7d,
            "incomplete_no_photo": no_photo,
            "incomplete_short_bio": short_bio,
        },
        "by_city": [{"city": c["_id"], "count": c["count"]} for c in cities_agg],
        "by_style": [{"style": s["_id"], "count": s["count"]} for s in styles_agg],
        "swipes": {
            "total": swipes_total,
            "last_24h": swipes_24h,
            "likes": likes_total,
            "passes": passes_total,
            "like_ratio_pct": round(like_ratio, 1),
        },
        "matches": {
            "total": matches_total,
            "last_24h": matches_24h,
            "last_7d": matches_7d,
            "match_rate_pct": round(match_rate, 2),
        },
        "chat": {
            "messages_total": msgs_total,
            "messages_last_24h": msgs_24h,
            "matches_with_chat": matches_with_chat,
            "chat_engagement_pct": round(chat_engagement, 1),
        },
        "recent_matches": recent_matches,
        "alerts": _compute_match_alerts(
            profiles_active, matches_24h, swipes_24h, no_photo, profiles_total,
        ),
    }


def _compute_match_alerts(active_profiles: int, matches_24h: int, swipes_24h: int,
                          no_photo: int, total_profiles: int) -> List[dict]:
    """Genera alert intelligenti per l'admin."""
    alerts = []
    if active_profiles < 10:
        alerts.append({
            "level": "warning",
            "icon": "people-outline",
            "title": "Pochi profili attivi",
            "message": f"Solo {active_profiles} profili. Serve incentivare la registrazione.",
        })
    if total_profiles and no_photo / total_profiles > 0.2:
        alerts.append({
            "level": "warning",
            "icon": "image-outline",
            "title": "Molti profili senza foto",
            "message": f"{no_photo} profili senza foto. Considera notifica push per completarli.",
        })
    if swipes_24h == 0 and active_profiles > 5:
        alerts.append({
            "level": "error",
            "icon": "alert-circle-outline",
            "title": "Nessuno swipe nelle ultime 24h",
            "message": "Il sistema discover potrebbe non funzionare o ci sono troppi pochi profili in zona.",
        })
    if active_profiles > 10 and matches_24h == 0 and swipes_24h > 20:
        alerts.append({
            "level": "warning",
            "icon": "heart-dislike-outline",
            "title": "Tanti swipe ma zero match",
            "message": "Verifica che il sistema di match (like reciproci) funzioni.",
        })
    if not alerts:
        alerts.append({
            "level": "success",
            "icon": "checkmark-circle-outline",
            "title": "Sistema MATCH in salute",
            "message": "Tutti gli indicatori sono nella norma.",
        })
    return alerts


# ----------------------------- School Leads (paid) ------------------
LEAD_UNLOCK_PRICE_EUR = 2.00


class SchoolLeadIn(BaseModel):
    sender_name: str = Field(min_length=1, max_length=100)
    sender_email: EmailStr
    sender_phone: Optional[str] = Field(default=None, max_length=30)
    level: str = Field(default="principiante")  # principiante|intermedio|avanzato
    styles: List[str] = []
    message: str = Field(min_length=10, max_length=2000)


class SchoolLead(BaseModel):
    id: str
    school_id: str
    school_name: str
    sender_user_id: Optional[str] = None
    sender_name: str
    sender_email: Optional[str] = None  # nascosto se !unlocked
    sender_phone: Optional[str] = None  # nascosto se !unlocked
    level: str
    styles: List[str] = []
    message: str
    unlocked: bool = False
    unlocked_at: Optional[datetime] = None
    contacted: bool = False
    created_at: datetime


@api.post("/schools/{school_id}/leads", response_model=SchoolLead)
async def submit_school_lead(
    school_id: str,
    payload: SchoolLeadIn,
    current_user: dict = Depends(get_current_user),
):
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Scuola non trovata")
    doc = {
        "id": str(uuid.uuid4()),
        "school_id": school_id,
        "school_name": school.get("name") or "",
        "sender_user_id": current_user.get("id") if current_user else None,
        "sender_name": payload.sender_name.strip()[:100],
        "sender_email": str(payload.sender_email),
        "sender_phone": (payload.sender_phone or "").strip()[:30] or None,
        "level": (payload.level or "principiante").lower(),
        "styles": [s.strip() for s in (payload.styles or []) if s.strip()][:6],
        "message": payload.message.strip()[:2000],
        "unlocked": False,
        "unlocked_at": None,
        "contacted": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.school_leads.insert_one(doc)

    # Push notifica all'owner (e admin)
    try:
        owner_id = school.get("owner_id")
        targets: List[str] = []
        if owner_id:
            owner = await db.users.find_one(
                {"id": owner_id},
                {"_id": 0, "push_token": 1, "notifications_enabled": 1},
            )
            if owner and owner.get("push_token") and owner.get("notifications_enabled", True):
                targets.append(owner["push_token"])
        admins = await db.users.find(
            {"role": "admin", "push_token": {"$ne": None, "$exists": True}},
            {"_id": 0, "push_token": 1},
        ).to_list(50)
        targets.extend([a["push_token"] for a in admins if a.get("push_token")])
        targets = list({t for t in targets})
        if targets:
            asyncio.create_task(
                _send_expo_push(
                    targets,
                    f"📨 Nuovo lead - {school.get('name')}",
                    f"{doc['sender_name']} ({doc['level']}): {doc['message'][:80]}",
                    {"type": "school_lead", "school_id": school_id, "lead_id": doc["id"]},
                )
            )
    except Exception as e:
        logger.warning("Push lead fail: %s", e)

    doc.pop("_id", None)
    return SchoolLead(**doc)


def _mask_lead_for_owner(doc: dict, owner: bool) -> dict:
    """Restituisce la versione del lead da mostrare. Se non sbloccato, oscura email/phone."""
    out = dict(doc)
    out.pop("_id", None)
    if not out.get("unlocked"):
        out["sender_email"] = None
        out["sender_phone"] = None
    return out


@api.get("/schools/{school_id}/leads", response_model=List[SchoolLead])
async def list_school_leads(
    school_id: str,
    current_user: dict = Depends(get_current_user),
):
    school = await db.schools.find_one({"id": school_id}, {"_id": 0, "owner_id": 1})
    if not school:
        raise HTTPException(status_code=404, detail="Scuola non trovata")
    is_owner = (school.get("owner_id") == current_user["id"])
    is_admin = current_user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Non sei il titolare di questa scuola")
    leads = await db.school_leads.find({"school_id": school_id}).sort("created_at", -1).to_list(500)
    return [SchoolLead(**_mask_lead_for_owner(l, True)) for l in leads]


@api.get("/my/school-leads", response_model=List[SchoolLead])
async def my_school_leads(
    current_user: dict = Depends(get_current_user),
):
    """Tutti i lead delle scuole che il current user possiede."""
    my_schools = await db.schools.find(
        {"owner_id": current_user["id"]}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(50)
    school_ids = [s["id"] for s in my_schools]
    if not school_ids:
        return []
    leads = await db.school_leads.find({"school_id": {"$in": school_ids}}).sort("created_at", -1).to_list(500)
    return [SchoolLead(**_mask_lead_for_owner(l, True)) for l in leads]


@api.post("/schools/{school_id}/leads/{lead_id}/unlock")
async def unlock_lead_checkout(
    school_id: str,
    lead_id: str,
    payload: dict,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Crea checkout Stripe per sbloccare un lead. Costo fisso EUR 2."""
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Scuola non trovata")
    is_owner = (school.get("owner_id") == current_user["id"])
    is_admin = current_user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Solo il titolare puo sbloccare i lead")
    lead = await db.school_leads.find_one({"id": lead_id, "school_id": school_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    if lead.get("unlocked"):
        return {"already_unlocked": True}

    # admin sblocca gratis
    if is_admin and not is_owner:
        await db.school_leads.update_one(
            {"id": lead_id},
            {"$set": {"unlocked": True, "unlocked_at": datetime.now(timezone.utc)}},
        )
        return {"unlocked": True, "free_admin": True}

    origin = (payload.get("origin_url") or str(http_request.base_url)).rstrip("/")
    success_url = f"{origin}/lead-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/school/leads"
    metadata = {
        "purpose": "lead_unlock",
        "user_id": current_user["id"],
        "school_id": school_id,
        "lead_id": lead_id,
    }
    stripe = _stripe_client(http_request)
    req = CheckoutSessionRequest(
        amount=LEAD_UNLOCK_PRICE_EUR,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": current_user["id"],
        "kind": "lead_unlock",
        "school_id": school_id,
        "lead_id": lead_id,
        "amount": LEAD_UNLOCK_PRICE_EUR,
        "currency": "eur",
        "status": "open",
        "payment_status": "pending",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    return {"session_id": session.session_id, "url": session.url}


@api.post("/schools/{school_id}/leads/{lead_id}/contacted")
async def mark_lead_contacted(
    school_id: str,
    lead_id: str,
    current_user: dict = Depends(get_current_user),
):
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Scuola non trovata")
    if school.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    r = await db.school_leads.update_one(
        {"id": lead_id, "school_id": school_id},
        {"$set": {"contacted": True}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trovato")
    return {"ok": True}


# ----------------------------- Affiliate Program --------------------
@api.get("/affiliate/info/{code}")
async def affiliate_invite_info(code: str):
    """Info pubblica su un codice referral (per landing/preview)."""
    clean = code.strip().upper()
    user = await db.users.find_one(
        {"referral_code": clean},
        {"_id": 0, "id": 1, "name": 1},
    )
    if not user:
        raise HTTPException(status_code=404, detail="Codice non valido")
    launch_active = _is_launch_boost_active()
    bonus_pct = AFFILIATE_LAUNCH_BOOST_PERCENT if launch_active else AFFILIATE_TIERS[0]["first_pct"]
    return {
        "referral_code": clean,
        "referrer_name": user.get("name"),
        "launch_boost_active": launch_active,
        "bonus_pct": bonus_pct,
        "message": (
            f"Ti ha invitato {user.get('name') or 'un amico'} su LatinFun! "
            f"Iscriviti ora{' e attiverai un BOOST speciale di lancio' if launch_active else ''}."
        ),
    }


@api.get("/my/referrals")
async def my_referrals(current_user: dict = Depends(get_current_user)):
    """Statistiche e lista referral dell'utente corrente."""
    me = await db.users.find_one(
        {"id": current_user["id"]},
        {"_id": 0, "referral_code": 1, "name": 1},
    )
    code = me.get("referral_code") if me else None

    # Auto-generate referral_code if missing (e.g. for users seeded before
    # the referral feature was introduced like the admin user).
    if me and not code:
        import secrets, string
        alphabet = string.ascii_uppercase + string.digits
        for _ in range(10):
            new_code = "".join(secrets.choice(alphabet) for _ in range(8))
            # Ensure uniqueness
            if not await db.users.find_one({"referral_code": new_code}):
                await db.users.update_one(
                    {"id": current_user["id"]},
                    {"$set": {"referral_code": new_code}},
                )
                code = new_code
                break

    # Lista invitati
    invited = await db.users.find(
        {"referred_by": current_user["id"]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "created_at": 1},
    ).to_list(500)

    # Commissioni
    commissions = await db.referral_commissions.find(
        {"referrer_id": current_user["id"]}
    ).sort("created_at", -1).to_list(500)
    for c in commissions:
        c.pop("_id", None)
    total_pending = sum(c["commission_amount"] for c in commissions if c["status"] == "pending")
    total_paid = sum(c["commission_amount"] for c in commissions if c["status"] == "paid_out")

    # Quanti invitati hanno effettivamente pagato
    paid_referees = {c["referee_id"] for c in commissions}
    active_referrals_count = len(paid_referees)

    # Tier corrente e prossimo
    current_tier = _tier_for_active_count(active_referrals_count)
    next_tier = _next_tier(active_referrals_count)
    launch_active = _is_launch_boost_active()

    return {
        "referral_code": code,
        "share_url": f"https://latinfun.it/r/{code}" if code else None,
        "deep_link": f"latinfun://register?ref={code}" if code else None,
        "tier": {
            "key": current_tier["key"],
            "label": current_tier["label"],
            "first_pct": current_tier["first_pct"],
            "recurring_pct": current_tier["recurring_pct"],
        },
        "next_tier": (
            {
                "key": next_tier["key"],
                "label": next_tier["label"],
                "first_pct": next_tier["first_pct"],
                "referrals_needed": next_tier["min_active_referrals"] - active_referrals_count,
                "min_active_referrals": next_tier["min_active_referrals"],
            } if next_tier else None
        ),
        "launch_boost": {
            "active": launch_active,
            "percent": AFFILIATE_LAUNCH_BOOST_PERCENT,
            "until": AFFILIATE_LAUNCH_BOOST_UNTIL.isoformat() if launch_active else None,
        },
        "stats": {
            "invited": len(invited),
            "paying": active_referrals_count,
            "earned_pending": round(total_pending, 2),
            "earned_paid": round(total_paid, 2),
            "earned_total": round(total_pending + total_paid, 2),
        },
        "invited": invited,
        "commissions": commissions,
    }


@api.get("/admin/referrals/payouts")
async def admin_referral_payouts(current_user: dict = Depends(get_current_user)):
    """Admin: lista referrer con saldo pending da pagare."""
    _require_admin(current_user)
    pipeline = [
        {"$match": {"status": "pending"}},
        {"$group": {
            "_id": "$referrer_id",
            "total": {"$sum": "$commission_amount"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"total": -1}},
    ]
    rows = await db.referral_commissions.aggregate(pipeline).to_list(500)
    out = []
    for r in rows:
        u = await db.users.find_one(
            {"id": r["_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "referral_code": 1},
        )
        if not u:
            continue
        out.append({
            "user": u,
            "pending_total": round(r["total"], 2),
            "pending_count": r["count"],
        })
    return out


@api.post("/admin/referrals/{referrer_user_id}/mark-paid")
async def admin_mark_paid(
    referrer_user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Admin marca tutte le commissioni pending del referrer come pagate."""
    _require_admin(current_user)
    r = await db.referral_commissions.update_many(
        {"referrer_id": referrer_user_id, "status": "pending"},
        {"$set": {
            "status": "paid_out",
            "paid_at": datetime.now(timezone.utc),
        }},
    )
    return {"updated": r.modified_count}


# ----------------------------- Sponsors ------------------------------
class Sponsor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: Optional[str] = None
    brand: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    cta_label: Optional[str] = "Scopri"
    position: str = "home_top"  # home_top | home_middle | home_bottom
    priority: int = 0
    active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    # Rich detail page fields
    description: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    whatsapp: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tickets_url: Optional[str] = None
    signup_url: Optional[str] = None
    event_id: Optional[str] = None
    clicks: int = 0
    impressions: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SponsorIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    subtitle: Optional[str] = Field(default=None, max_length=160)
    brand: Optional[str] = Field(default=None, max_length=80)
    image_url: str
    link_url: Optional[str] = None
    cta_label: Optional[str] = Field(default="Scopri", max_length=30)
    position: str = "home_top"
    priority: int = 0
    active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    whatsapp: Optional[str] = Field(default=None, max_length=40)
    phone: Optional[str] = Field(default=None, max_length=40)
    email: Optional[str] = Field(default=None, max_length=120)
    address: Optional[str] = Field(default=None, max_length=200)
    tickets_url: Optional[str] = None
    signup_url: Optional[str] = None
    event_id: Optional[str] = None


@api.get("/sponsors", response_model=List[Sponsor])
async def list_sponsors_public(position: Optional[str] = None):
    now = datetime.utcnow()
    q: dict = {"active": True}
    q["$and"] = [
        {"$or": [{"starts_at": None}, {"starts_at": {"$lte": now}}]},
        {"$or": [{"ends_at": None}, {"ends_at": {"$gte": now}}]},
    ]
    if position:
        q["position"] = position
    cursor = db.sponsors.find(q, {"_id": 0}).sort([("priority", -1), ("created_at", -1)])
    return await cursor.to_list(length=100)


@api.get("/sponsors/{sponsor_id}", response_model=Sponsor)
async def get_sponsor_public(sponsor_id: str):
    doc = await db.sponsors.find_one({"id": sponsor_id, "active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Sponsor non trovato")
    return doc


@api.get("/admin/sponsors", response_model=List[Sponsor])
async def list_sponsors_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    cursor = db.sponsors.find({}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(length=500)


@api.post("/admin/sponsors", response_model=Sponsor)
async def create_sponsor(payload: SponsorIn, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    new = {
        "id": str(uuid.uuid4()),
        "clicks": 0,
        "impressions": 0,
        "created_at": datetime.utcnow(),
        **payload.model_dump(),
    }
    await db.sponsors.insert_one(new)
    return await db.sponsors.find_one({"id": new["id"]}, {"_id": 0})


@api.put("/admin/sponsors/{sponsor_id}", response_model=Sponsor)
async def update_sponsor(
    sponsor_id: str, payload: SponsorIn, current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    res = await db.sponsors.update_one({"id": sponsor_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sponsor non trovato")
    return await db.sponsors.find_one({"id": sponsor_id}, {"_id": 0})


@api.delete("/admin/sponsors/{sponsor_id}")
async def delete_sponsor(sponsor_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    res = await db.sponsors.delete_one({"id": sponsor_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sponsor non trovato")
    return {"ok": True}


@api.post("/sponsors/{sponsor_id}/click")
async def click_sponsor(sponsor_id: str):
    await db.sponsors.update_one({"id": sponsor_id}, {"$inc": {"clicks": 1}})
    return {"ok": True}


@api.post("/sponsors/{sponsor_id}/view")
async def view_sponsor(sponsor_id: str):
    await db.sponsors.update_one({"id": sponsor_id}, {"$inc": {"impressions": 1}})
    return {"ok": True}


# ----------------------------- Contact Messages ----------------------
CONTACT_CATEGORIES = [
    "bug",
    "suggerimento",
    "collaborazione",
    "sponsorship",
    "altro",
]


class ContactMessage(BaseModel):
    id: str
    sender_id: Optional[str] = None
    sender_name: str
    sender_email: EmailStr
    category: str
    subject: str
    message: str
    read: bool = False
    created_at: datetime


class ContactMessageCreate(BaseModel):
    category: str
    subject: str
    message: str
    # email opzionale: se non passata, useremo current_user.email
    sender_email: Optional[EmailStr] = None


@api.post("/contact", response_model=ContactMessage)
async def submit_contact_message(
    payload: ContactMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Devi essere loggato")
    cat = (payload.category or "altro").lower().strip()
    if cat not in CONTACT_CATEGORIES:
        cat = "altro"
    subject = (payload.subject or "").strip()[:120]
    message = (payload.message or "").strip()[:4000]
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Oggetto e messaggio richiesti")
    doc = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user.get("id"),
        "sender_name": current_user.get("name") or current_user.get("email"),
        "sender_email": payload.sender_email or current_user.get("email"),
        "category": cat,
        "subject": subject,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.contact_messages.insert_one(doc)

    # Notifica push agli admin (se hanno token)
    try:
        admins = await db.users.find(
            {
                "role": "admin",
                "push_token": {"$ne": None, "$exists": True},
            },
            {"_id": 0, "push_token": 1},
        ).to_list(50)
        admin_tokens = [a["push_token"] for a in admins if a.get("push_token")]
        if admin_tokens:
            asyncio.create_task(
                _send_expo_push(
                    admin_tokens,
                    f"📬 Nuovo messaggio: {cat}",
                    f"Da {doc['sender_name']}: {subject[:60]}",
                    {"type": "contact_message", "message_id": doc["id"]},
                )
            )
    except Exception as e:
        logger.warning("Push contact admin fail: %s", e)

    doc.pop("_id", None)
    return ContactMessage(**doc)


@api.get("/admin/contact", response_model=List[ContactMessage])
async def admin_list_contact_messages(
    only_unread: bool = False,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    q = {}
    if only_unread:
        q["read"] = False
    msgs = await db.contact_messages.find(q).sort("created_at", -1).to_list(500)
    out = []
    for m in msgs:
        m.pop("_id", None)
        out.append(ContactMessage(**m))
    return out


@api.get("/admin/contact/unread-count")
async def admin_contact_unread_count(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    n = await db.contact_messages.count_documents({"read": False})
    return {"unread": n}


@api.patch("/admin/contact/{msg_id}/read")
async def admin_mark_contact_read(
    msg_id: str,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    r = await db.contact_messages.update_one({"id": msg_id}, {"$set": {"read": True}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    return {"ok": True}


@api.delete("/admin/contact/{msg_id}")
async def admin_delete_contact(
    msg_id: str,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    r = await db.contact_messages.delete_one({"id": msg_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    return {"ok": True}


# ----------------------------- Root / Health -------------------------
@api.get("/")
async def root():
    return {"app": "LatinFun", "status": "ok"}


# ----------------------------- Fatture in Cloud Integration --------------
import fic_integration as fic
import secrets as _secrets
from fastapi.responses import RedirectResponse, HTMLResponse


def _public_base_url(request: Request) -> str:
    """Returns the public base URL of this backend for OAuth callbacks."""
    # Prefer the explicit env if set, else derive from request headers.
    explicit = os.getenv("PUBLIC_BACKEND_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    # Honor X-Forwarded-Proto / Host if behind proxy
    fwd_proto = request.headers.get("x-forwarded-proto")
    fwd_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = fwd_proto or request.url.scheme
    host = fwd_host or request.url.netloc
    return f"{scheme}://{host}"


@api.get("/integrations/fic/status")
async def fic_status(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    return await fic.get_status(db)


@api.get("/integrations/fic/authorize")
async def fic_authorize(request: Request, current_user: dict = Depends(get_current_user)):
    """Admin-only: returns the authorize URL to begin OAuth flow."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    if not fic.is_configured():
        raise HTTPException(status_code=400, detail="FIC_CLIENT_ID/SECRET non configurati")
    state = _secrets.token_urlsafe(24)
    # Persist state for CSRF protection (5-minute expiry)
    await db.fic_oauth_states.insert_one({
        "state": state,
        "user_id": current_user.get("id"),
        "created_at": datetime.utcnow(),
    })
    base = _public_base_url(request)
    url = fic.build_authorize_url(base, state=state)
    return {"authorize_url": url, "state": state}


@api.get("/integrations/fic/callback")
async def fic_callback(request: Request, code: Optional[str] = None,
                        state: Optional[str] = None, error: Optional[str] = None):
    """Public callback from Fatture in Cloud OAuth."""
    if error:
        return HTMLResponse(f"<h1>Errore autorizzazione</h1><p>{error}</p>", status_code=400)
    if not code or not state:
        return HTMLResponse("<h1>Parametri mancanti</h1>", status_code=400)
    # Validate state (CSRF)
    st = await db.fic_oauth_states.find_one({"state": state})
    if not st:
        return HTMLResponse("<h1>State non valido o scaduto</h1>", status_code=400)
    # Cleanup state
    await db.fic_oauth_states.delete_one({"state": state})

    base = _public_base_url(request)
    try:
        result = await fic.exchange_code(db, code, base)
    except Exception as e:
        logger.exception("FIC exchange failed")
        return HTMLResponse(f"<h1>Errore exchange token</h1><pre>{str(e)[:300]}</pre>", status_code=500)

    return HTMLResponse(f"""
    <!DOCTYPE html>
    <html lang="it"><head><meta charset="utf-8"><title>FIC connesso</title>
    <style>body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0a0a0c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}}
    .card{{background:#111114;border:1px solid #E11D48;border-radius:18px;padding:40px;max-width:480px}}
    h1{{color:#E11D48;font-size:26px;margin:0 0 12px}} p{{color:#d4d4d8;font-size:15px;line-height:1.5;margin:0 0 6px}}
    .ok{{font-size:60px;margin-bottom:18px}} code{{background:#1f1f23;padding:3px 8px;border-radius:6px;color:#E11D48}}</style>
    </head><body><div class="card">
    <div class="ok">✅</div>
    <h1>Fatture in Cloud connesso!</h1>
    <p>Azienda ID: <code>{result.get('company_id') or 'N/A'}</code></p>
    <p>Tutti i pagamenti Stripe verranno ora fatturati automaticamente.</p>
    <p style="margin-top:20px;font-size:13px;color:#71717A">Puoi chiudere questa pagina e tornare all'app.</p>
    </div></body></html>""")


@api.post("/integrations/fic/disconnect")
async def fic_disconnect(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    await db.fic_tokens.delete_many({})
    return {"ok": True}


@api.get("/admin/fic/documents")
async def fic_list_documents(doc_type: Optional[str] = None,
                              limit: int = 50,
                              current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    return await fic.list_documents(db, doc_type=doc_type, limit=limit)


@api.get("/admin/fic/emitted")
async def fic_list_emitted_local(current_user: dict = Depends(get_current_user)):
    """List documents emitted FROM our backend (joined with payments)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    cursor = db.fic_emitted.find({}).sort("created_at", -1).limit(100)
    return [{
        "stripe_payment_id": d.get("stripe_payment_id"),
        "document_type": d.get("document_type"),
        "document_id": d.get("document_id"),
        "document_number": d.get("document_number"),
        "amount_gross": d.get("amount_gross"),
        "customer_email": d.get("customer_email"),
        "created_at": d.get("created_at").isoformat() if d.get("created_at") else None,
        "ok": d.get("ok", True),
        "error": d.get("error"),
    } async for d in cursor]


app.include_router(api)


# ============= Affiliate Public Deep-Link Route ==========================
@app.get("/r/{code}")
async def affiliate_redirect(code: str, request: Request):
    """
    Public referral URL: https://[domain]/r/CODE
    - If opened on mobile and app is installed → opens app via universal link / deep link
    - Otherwise serves a landing page that invites to download the app
    """
    from fastapi.responses import HTMLResponse
    clean = code.strip().upper()
    user = await db.users.find_one(
        {"referral_code": clean}, {"_id": 0, "name": 1}
    )
    if not user:
        return HTMLResponse(
            "<html><body style='font-family:system-ui;text-align:center;padding:40px'>"
            "<h1>❌ Codice non valido</h1>"
            "<p>Il codice referral non esiste o è scaduto.</p>"
            "<a href='https://apps.apple.com/it/app/latinfun/id6764812867'>Scarica LatinFun</a>"
            "</body></html>",
            status_code=404,
        )
    name = user.get("name") or "un amico"
    launch_active = _is_launch_boost_active()
    boost_html = (
        f"<p style='color:#e11d48;font-weight:700;font-size:18px'>🚀 LAUNCH BOOST {int(AFFILIATE_LAUNCH_BOOST_PERCENT*100)}% ATTIVO!</p>"
        if launch_active else ""
    )
    deep_link = f"latinfun://register?ref={clean}"
    app_store = "https://apps.apple.com/it/app/latinfun/id6764812867"
    play_store = "https://play.google.com/store/apps/details?id=it.latinfun.app"
    html = f"""<!DOCTYPE html>
<html lang="it"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Ti ha invitato {name} su LatinFun</title>
<style>
body {{ margin:0; font-family:-apple-system,system-ui,sans-serif; background:#0a0a0a; color:#fff;
       display:flex; align-items:center; justify-content:center; min-height:100vh; }}
.card {{ max-width:420px; width:90%; background:#161616; padding:32px 24px; border-radius:20px;
       text-align:center; border:1px solid #2a2a2a; }}
.h1 {{ color:#e11d48; font-size:34px; margin:0 0 8px; font-weight:900; }}
.invite {{ color:#999; font-size:14px; margin-bottom:18px; }}
.name {{ color:#fff; font-weight:900; font-size:22px; margin-bottom:24px; }}
.btn {{ display:block; background:#e11d48; color:#fff; padding:16px; border-radius:12px;
       text-decoration:none; font-weight:800; font-size:15px; margin-bottom:10px; }}
.btn.ghost {{ background:#1f1f1f; border:1px solid #333; }}
.code {{ background:#0a0a0a; padding:14px; border-radius:10px; font-family:monospace;
       font-size:20px; letter-spacing:3px; color:#facc15; margin-bottom:18px; border:1px dashed #333; }}
</style>
<script>
// Try opening the app via deep link
setTimeout(function() {{
  window.location.href = "{deep_link}";
}}, 100);
</script>
</head>
<body>
<div class="card">
  <div class="h1">LatinFun 🔥</div>
  <p class="invite">Sei stato invitato da</p>
  <p class="name">{name}</p>
  {boost_html}
  <p class="invite">Il tuo codice referral:</p>
  <div class="code">{clean}</div>
  <a class="btn" href="{app_store}">📱 Apri/Scarica per iOS</a>
  <a class="btn ghost" href="{play_store}">🤖 Apri/Scarica per Android</a>
</div>
</body></html>"""
    return HTMLResponse(content=html, status_code=200)



# Static files mount for store assets (icon, feature graphic, legal pages)
from fastapi.staticfiles import StaticFiles
import os as _os
_STATIC_DIR = _os.path.join(_os.path.dirname(__file__), "static")
if _os.path.isdir(_STATIC_DIR):
    app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")
    app.mount("/api/static", StaticFiles(directory=_STATIC_DIR), name="api_static")

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
        "bio": "Founder di LatinFun. Voce e selector della scena latina italiana. Bachata & Urban Latin.",
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
            "title": "LatinFun Opening Night",
            "description": "La serata ufficiale di lancio. Bachata, reggaeton e salsa fino all'alba con Mauro Catalini & guests.",
            "city": "Milano",
            "venue": "Cafe Cubano",
            "address": "Via Tortona 27, Milano",
            "genre": "latin",
            "date": d(3),
            "image_url": "https://images.pexels.com/photos/14074744/pexels-photo-14074744.jpeg",
            "lineup": ["Mauro Catalini", "La Reina"],
            "ticket_url": "https://dice.fm/event/opening-latinfun",
            "organizer": "LatinFun",
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
        "title": "LATINFUN",
        "description": "La playlist ufficiale di LatinFun: bachata, urban latin e reggaeton selezionati per la community.",
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
    pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    # Seed BOTH admin emails so old/new deployments work seamlessly after rebrand
    primary_email = os.environ.get("ADMIN_EMAIL", "admin@latinfun.it")
    legacy_emails = ["admin@latinfun.it", "admin@latinhub.it"]
    if primary_email not in legacy_emails:
        legacy_emails.insert(0, primary_email)

    for email in legacy_emails:
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
        else:
            # SECURITY: do NOT reset the password on every startup.
            # The admin can change their password via /api/auth/change-password
            # and that change must persist across restarts.
            # Only ensure the role is 'admin' (in case it was demoted by mistake).
            if existing.get("role") != "admin":
                await db.users.update_one(
                    {"email": email}, {"$set": {"role": "admin"}}
                )
                logger.info("Promoted %s to admin", email)


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
    # Idempotent refresh: LatinFun Opening Night hero image = crowd with hands up
    await db.events.update_one(
        {"title": "LatinFun Opening Night"},
        {"$set": {"image_url": "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg"}},
    )
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

    # ----- Spain demo content (idempotent: only seeds if no ES records exist) -----
    if await db.events.count_documents({"country": "ES"}) == 0:
        try:
            now = datetime.now(timezone.utc)
            es_events = [
                Event(
                    title="LatinFun Madrid - Bachata Sensual Night",
                    description="La mejor noche de Bachata Sensual en Madrid. DJ residentes top de la escena latina española.",
                    city="Madrid", venue="Sala Latina", address="Calle de la Salsa 12, Madrid",
                    genre="bachata", date=now + timedelta(days=14),
                    image_url="https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
                    organizer="LatinFun ES", featured=True, country="ES",
                    latitude=40.4168, longitude=-3.7038,
                ).model_dump(),
                Event(
                    title="Salsa Cubana Barcelona",
                    description="Noche cubana auténtica en el corazón de Barcelona. Clase + social.",
                    city="Barcelona", venue="Antilla BCN", address="Carrer d'Aragó 141, Barcelona",
                    genre="salsa", date=now + timedelta(days=21),
                    image_url="https://images.pexels.com/photos/1701202/pexels-photo-1701202.jpeg",
                    organizer="LatinFun ES", country="ES",
                    latitude=41.3851, longitude=2.1734,
                ).model_dump(),
                Event(
                    title="Reggaeton Valencia Festival",
                    description="El festival de reggaeton más grande de la Comunidad Valenciana.",
                    city="Valencia", venue="Pabellón Latino", address="Av. Reggaeton 33, Valencia",
                    genre="reggaeton", date=now + timedelta(days=35),
                    image_url="https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
                    organizer="LatinFun ES", country="ES",
                    latitude=39.4699, longitude=-0.3763,
                ).model_dump(),
            ]
            await db.events.insert_many(es_events)
            logger.info("Seeded %d Spain events", len(es_events))
        except Exception as e:
            logger.warning("Spain events seed failed: %s", e)

    if await db.schools.count_documents({"country": "ES"}) == 0:
        try:
            es_schools = [
                School(
                    name="Academia Latin Madrid", city="Madrid", address="Gran Vía 28, Madrid",
                    bio="La academia de baile latino de referencia en Madrid. Bachata, Salsa, Reggaeton.",
                    image_url="https://images.pexels.com/photos/3253735/pexels-photo-3253735.jpeg",
                    styles=["bachata", "salsa", "reggaeton"], levels=["principiante", "intermedio", "avanzado"],
                    email="info@latinmadrid.es", verified_by_mauro=True, country="ES",
                    slug=_slugify("Academia Latin Madrid-Madrid"),
                ).model_dump(),
                School(
                    name="Bachata Sensual Barcelona", city="Barcelona", address="Passeig de Gràcia 88",
                    bio="Especialistas en Bachata Sensual y Bachatango. Clases todos los días.",
                    image_url="https://images.pexels.com/photos/3253735/pexels-photo-3253735.jpeg",
                    styles=["bachata", "bachata_sensual"], levels=["principiante", "intermedio"],
                    email="hola@bachatasensualbcn.es", country="ES",
                    slug=_slugify("Bachata Sensual Barcelona-Barcelona"),
                ).model_dump(),
            ]
            await db.schools.insert_many(es_schools)
            logger.info("Seeded %d Spain schools", len(es_schools))
        except Exception as e:
            logger.warning("Spain schools seed failed: %s", e)


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
    await migrate_latinhub_to_latinfun()


async def migrate_latinhub_to_latinfun():
    """One-time idempotent rename: LatinHub -> LatinFun in seeded data fields.
    Runs on every startup so any deployment with stale data gets fixed automatically.
    """
    try:
        for coll, fields in [
            ("events", ["title", "description", "venue"]),
            ("djs", ["name", "bio", "stage_name"]),
            ("schools", ["name", "description"]),
            ("playlists", ["title", "description"]),
            ("sponsors", ["name", "label", "subtitle"]),
            ("mixes", ["title", "description"]),
        ]:
            c = db[coll]
            for field in fields:
                try:
                    r = await c.update_many(
                        {field: {"$regex": "LatinHub", "$options": "i"}},
                        [{"$set": {field: {"$replaceAll": {"input": f"${field}", "find": "LatinHub", "replacement": "LatinFun"}}}}],
                    )
                    if r.modified_count:
                        logger.info("[migrate] %s.%s: renamed %d docs LatinHub->LatinFun", coll, field, r.modified_count)
                except Exception:
                    pass
    except Exception as e:
        logger.warning("migrate_latinhub_to_latinfun failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
