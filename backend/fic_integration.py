"""
Fatture in Cloud (FIC) integration module.

Handles:
- OAuth 2.0 authorization code flow
- Access/refresh token persistence in MongoDB
- Automatic refresh on expiration
- Document creation (fattura B2B / corrispettivo-ricevuta B2C)

Token document lives in db.fic_tokens with a single document (id="fic_main").

Environment variables required (Emergent Custom Keys):
- FIC_CLIENT_ID
- FIC_CLIENT_SECRET
- FIC_COMPANY_ID (numeric, optional - autodetected on first connect)
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

log = logging.getLogger("fic")

# --- Endpoints ---
OAUTH_AUTHORIZE_URL = "https://api-v2.fattureincloud.it/oauth/authorize"
OAUTH_TOKEN_URL = "https://api-v2.fattureincloud.it/oauth/token"
API_BASE = "https://api-v2.fattureincloud.it"

# --- Required scopes (read + write for clients and issued docs) ---
SCOPES = " ".join([
    "entity.clients:r", "entity.clients:a",
    "issued_documents.invoices:r", "issued_documents.invoices:a",
    "issued_documents.receipts:r", "issued_documents.receipts:a",
    "settings:r",
])

# --- Token state ---
def _client_id() -> str:
    return os.getenv("FIC_CLIENT_ID", "")

def _client_secret() -> str:
    return os.getenv("FIC_CLIENT_SECRET", "")

def _redirect_uri(base_url: str) -> str:
    """The OAuth callback URL exposed by this backend."""
    base = base_url.rstrip("/")
    return f"{base}/api/integrations/fic/callback"


def is_configured() -> bool:
    return bool(_client_id() and _client_secret())


# --- DB helpers (depends on outer db object) ---
async def _save_token(db, payload: dict, company_id: Optional[str] = None):
    now = datetime.utcnow()
    expires_in = int(payload.get("expires_in", 3600))
    doc = {
        "_id": "fic_main",
        "access_token": payload["access_token"],
        "refresh_token": payload.get("refresh_token"),
        "token_type": payload.get("token_type", "Bearer"),
        "expires_at": now + timedelta(seconds=expires_in - 60),  # refresh 60s early
        "updated_at": now,
        "scope": payload.get("scope", SCOPES),
    }
    if company_id:
        doc["company_id"] = company_id
    await db.fic_tokens.replace_one({"_id": "fic_main"}, doc, upsert=True)


async def _get_token_doc(db) -> Optional[dict]:
    return await db.fic_tokens.find_one({"_id": "fic_main"})


async def get_company_id(db) -> Optional[str]:
    """Prefer DB-saved company_id, fallback to env."""
    doc = await _get_token_doc(db)
    if doc and doc.get("company_id"):
        return str(doc["company_id"])
    env_id = os.getenv("FIC_COMPANY_ID", "").strip()
    return env_id or None


# --- OAuth flow ---
def build_authorize_url(base_url: str, state: str) -> str:
    """Returns the URL to redirect the user to start OAuth."""
    from urllib.parse import urlencode
    q = urlencode({
        "response_type": "code",
        "client_id": _client_id(),
        "redirect_uri": _redirect_uri(base_url),
        "scope": SCOPES,
        "state": state,
    })
    return f"{OAUTH_AUTHORIZE_URL}?{q}"


async def exchange_code(db, code: str, base_url: str) -> dict:
    """Exchange authorization code for tokens and persist them."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(OAUTH_TOKEN_URL, data={
            "grant_type": "authorization_code",
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "code": code,
            "redirect_uri": _redirect_uri(base_url),
        })
        r.raise_for_status()
        payload = r.json()

    # Discover company id from API
    company_id = await _discover_company_id(payload["access_token"])
    await _save_token(db, payload, company_id=company_id)
    return {"ok": True, "company_id": company_id}


async def _discover_company_id(access_token: str) -> Optional[str]:
    """Call /user/companies to find the first company id available."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{API_BASE}/user/companies",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if r.status_code != 200:
            log.warning("FIC discover_company_id failed: %s %s", r.status_code, r.text[:200])
            return None
        data = r.json()
        companies = (data.get("data") or {}).get("companies") or []
        if not companies:
            return None
        # Prefer the one matching env var if specified, else first
        env_id = os.getenv("FIC_COMPANY_ID", "").strip()
        if env_id:
            for c in companies:
                if str(c.get("id")) == str(env_id):
                    return str(c["id"])
        return str(companies[0]["id"])


async def _refresh_if_needed(db) -> Optional[str]:
    """Returns a valid access_token, refreshing if close to expiration."""
    doc = await _get_token_doc(db)
    if not doc:
        return None
    if datetime.utcnow() < doc["expires_at"]:
        return doc["access_token"]

    # Refresh
    if not doc.get("refresh_token"):
        log.error("FIC token expired and no refresh_token available")
        return None
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(OAUTH_TOKEN_URL, data={
            "grant_type": "refresh_token",
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "refresh_token": doc["refresh_token"],
        })
        if r.status_code != 200:
            log.error("FIC refresh failed: %s %s", r.status_code, r.text[:200])
            return None
        payload = r.json()
    await _save_token(db, payload, company_id=doc.get("company_id"))
    return payload["access_token"]


async def is_connected(db) -> bool:
    doc = await _get_token_doc(db)
    return doc is not None and bool(doc.get("access_token"))


async def get_status(db) -> dict:
    doc = await _get_token_doc(db)
    if not doc:
        return {"connected": False, "configured": is_configured()}
    return {
        "connected": True,
        "configured": is_configured(),
        "company_id": doc.get("company_id"),
        "expires_at": doc["expires_at"].isoformat() if doc.get("expires_at") else None,
        "scope": doc.get("scope"),
    }


# --- Document creation ---
async def create_document_from_payment(
    db,
    *,
    amount_eur: float,
    description: str,
    customer_name: str,
    customer_email: str,
    customer_vat: Optional[str] = None,
    customer_tax_code: Optional[str] = None,
    customer_address: Optional[str] = None,
    payment_method: str = "Stripe (carta di credito)",
    stripe_payment_id: Optional[str] = None,
) -> dict:
    """
    Issues an electronic document on Fatture in Cloud for a successful Stripe payment.

    Mix automatico:
    - If customer_vat provided (B2B) → "invoice" (fattura elettronica via SdI)
    - Otherwise (B2C) → "receipt" (ricevuta/corrispettivo)

    Returns dict with {ok: bool, type: str, document_id, pdf_url, error}
    """
    access_token = await _refresh_if_needed(db)
    if not access_token:
        return {"ok": False, "error": "FIC not connected. Run OAuth first."}
    company_id = await get_company_id(db)
    if not company_id:
        return {"ok": False, "error": "Company ID not set."}

    is_b2b = bool(customer_vat and customer_vat.strip())
    doc_type = "invoice" if is_b2b else "receipt"

    # Net + VAT calculation (regime ordinario: VAT 22%)
    vat_rate = 22.0
    gross = float(amount_eur)
    net = round(gross / (1 + vat_rate / 100), 2)

    today = datetime.utcnow().date().isoformat()

    # Build entity (client) payload
    entity = {
        "name": customer_name or "Cliente App LatinFun",
        "email": customer_email,
    }
    if is_b2b:
        entity["vat_number"] = customer_vat
        entity["type"] = "company"
    else:
        entity["type"] = "person"
    if customer_tax_code:
        entity["tax_code"] = customer_tax_code
    if customer_address:
        entity["address_street"] = customer_address

    # Build line item
    item = {
        "name": description or "Servizio digitale BOOST",
        "qty": 1,
        "net_price": net,
        "vat": {"id": 0, "value": vat_rate, "description": "IVA 22%"},
    }

    doc_payload = {
        "data": {
            "type": doc_type,
            "entity": entity,
            "date": today,
            "currency": {"id": "EUR"},
            "language": {"code": "it"},
            "subject": description,
            "visible_subject": description,
            "items_list": [item],
            "payments_list": [{
                "amount": gross,
                "due_date": today,
                "paid_date": today,
                "status": "paid",
                "payment_terms": {"days": 0, "type": "standard"},
            }],
            "payment_method": {"name": payment_method},
            "show_payment_method": True,
            "show_payments": True,
        }
    }
    if is_b2b:
        # Electronic invoice transmission via SdI
        doc_payload["data"]["e_invoice"] = True
        doc_payload["data"]["ei_data"] = {
            "payment_method": "MP08",  # Carta di credito
        }

    # Save Stripe ID in notes for traceability
    if stripe_payment_id:
        doc_payload["data"]["notes"] = f"Stripe payment ID: {stripe_payment_id}"

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{API_BASE}/c/{company_id}/issued_documents",
            headers={"Authorization": f"Bearer {access_token}"},
            json=doc_payload,
        )
        if r.status_code not in (200, 201):
            log.error("FIC create doc failed: %s %s", r.status_code, r.text[:500])
            return {"ok": False, "error": f"FIC API error {r.status_code}", "detail": r.text[:300]}
        data = r.json()

    body = data.get("data") or {}
    return {
        "ok": True,
        "type": doc_type,
        "document_id": body.get("id"),
        "number": body.get("number"),
        "amount_gross": body.get("amount_gross") or gross,
        "pdf_url": body.get("url"),
        "created_at": datetime.utcnow().isoformat(),
    }


async def list_documents(db, *, doc_type: Optional[str] = None, limit: int = 50) -> dict:
    """List recent issued documents from FIC for admin viewing."""
    access_token = await _refresh_if_needed(db)
    if not access_token:
        return {"ok": False, "error": "FIC not connected", "items": []}
    company_id = await get_company_id(db)
    if not company_id:
        return {"ok": False, "error": "Company ID not set", "items": []}

    params = {"per_page": limit, "sort": "-date"}
    if doc_type:
        params["type"] = doc_type

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{API_BASE}/c/{company_id}/issued_documents",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
        if r.status_code != 200:
            return {"ok": False, "error": f"HTTP {r.status_code}", "items": []}
        data = r.json()
    return {"ok": True, "items": data.get("data") or []}
